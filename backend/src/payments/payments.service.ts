import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { PublicUser } from '../auth/auth.types.js';
import { iso, must, toMoney, toUserRef, USER_REF_FIELDS } from '../leads/leads.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreatePaymentDto } from './dto/create-payment.dto.js';
import { fromPaise, toPaise, type LeadPaymentsDto, type PaymentLeadDto } from './payments.types.js';

const CLIENT_FIELDS = ['id', 'firstName', 'lastName', 'mobile', 'email'] as const;

/** Dates are compared in the business's own time zone, so "today" matches the user's calendar */
const BUSINESS_TIME_ZONE = 'Asia/Kolkata';

/**
 * Payment follow-up: money received against each lead's quotation amount.
 * Only leads that have a quotation amount (they reached Quotation) take part.
 * Access is by role only (PAYMENT_ROLES, checked in the controller): accounts see every such lead.
 */
@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Leads with a quotation amount, with what has been paid and what is still due */
  async findAll(): Promise<PaymentLeadDto[]> {
    const leads = await this.prisma.orm.public.Lead.select('id', 'projectName', 'status', 'quotationAmount', 'updatedAt')
      .where((l) => l.quotationAmount.isNotNull())
      .include('client', (c) => c.select(...CLIENT_FIELDS))
      .include('payments', (p) => p.select('amount', 'paidOn'))
      .orderBy([(l) => l.updatedAt.desc(), (l) => l.id.desc()])
      .all();

    return leads.map((lead) =>
      this.toLeadDto(lead.id, lead.projectName, lead.status, must(lead.quotationAmount), must(lead.client), lead.payments),
    );
  }

  async findForLead(leadId: number): Promise<LeadPaymentsDto> {
    const lead = await this.prisma.orm.public.Lead.select('id', 'projectName', 'status', 'quotationAmount')
      .where({ id: leadId })
      .include('client', (c) => c.select(...CLIENT_FIELDS))
      .first();
    if (!lead) throw new NotFoundException('Lead not found.');
    if (lead.quotationAmount === null) {
      throw new BadRequestException('This lead has no quotation amount yet, so there is nothing to collect.');
    }

    const payments = await this.prisma.orm.public.Payment.where({ leadId })
      .include('createdBy', (u) => u.select(...USER_REF_FIELDS))
      .orderBy([(p) => p.paidOn.desc(), (p) => p.id.desc()])
      .all();

    return {
      ...this.toLeadDto(lead.id, lead.projectName, lead.status, lead.quotationAmount, must(lead.client), payments),
      payments: payments.map((p) => ({
        id: p.id,
        amount: fromPaise(toPaise(p.amount)),
        mode: p.mode,
        paidOn: iso(p.paidOn),
        note: p.note,
        createdBy: toUserRef(must(p.createdBy)),
        createdAt: iso(p.createdAt),
      })),
    };
  }

  async create(leadId: number, dto: CreatePaymentDto, actor: PublicUser): Promise<LeadPaymentsDto> {
    const before = await this.findForLead(leadId);

    const paidOn = Temporal.PlainDate.from(dto.paidOn);
    const today = Temporal.Now.plainDateISO(BUSINESS_TIME_ZONE);
    if (Temporal.PlainDate.compare(paidOn, today) > 0) {
      throw new BadRequestException('Payment date cannot be in the future.');
    }

    // The balance can never go below zero: a payment may be at most what is still due
    if (toPaise(dto.amount) > toPaise(before.balanceAmount)) {
      throw new BadRequestException(
        toPaise(before.balanceAmount) === 0
          ? 'This lead is already fully paid.'
          : `Amount is more than the balance due (${before.balanceAmount}).`,
      );
    }

    await this.prisma.orm.public.Payment.create({
      leadId,
      amount: toMoney(dto.amount),
      mode: dto.mode,
      paidOn: paidOn.toZonedDateTime('UTC').toInstant(),
      note: dto.note ?? null,
      createdById: actor.id,
    });

    return this.findForLead(leadId);
  }

  private toLeadDto(
    leadId: number,
    projectName: string,
    status: PaymentLeadDto['status'],
    quotationAmount: string,
    client: PaymentLeadDto['client'],
    payments: { amount: string; paidOn: { toString(): string; epochMilliseconds: number } }[],
  ): PaymentLeadDto {
    const total = toPaise(quotationAmount);
    const paid = payments.reduce((sum, p) => sum + toPaise(p.amount), 0);
    const latest = payments.reduce<(typeof payments)[number] | null>(
      (newest, p) => (newest === null || p.paidOn.epochMilliseconds > newest.paidOn.epochMilliseconds ? p : newest),
      null,
    );
    return {
      leadId,
      projectName,
      status,
      client,
      totalAmount: fromPaise(total),
      paidAmount: fromPaise(paid),
      balanceAmount: fromPaise(total - paid),
      lastPaidOn: latest ? iso(latest.paidOn) : null,
    };
  }
}
