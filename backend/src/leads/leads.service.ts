import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { or } from '@prisma/orm-postgres/orm-client';
import type { PublicUser } from '../auth/auth.types.js';
import { toPaise } from '../payments/payments.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AssignLeadDto } from './dto/assign-lead.dto.js';
import type { CreateLeadDto } from './dto/create-lead.dto.js';
import type { ListLeadsQueryDto } from './dto/list-leads-query.dto.js';
import type { SetCompletionDateDto } from './dto/set-completion-date.dto.js';
import type { UpdateLeadDto } from './dto/update-lead.dto.js';
import { FileStorageService } from './file-storage.service.js';
import { LeadAccessService } from './lead-access.service.js';
import {
  hasRole,
  iso,
  LEAD_COMPLETE_ROLES,
  LEAD_MANAGE_ROLES_BY_PHASE,
  LEAD_VIEW_ALL_ROLES,
  must,
  dayOf,
  formatDay,
  toDayInstant,
  PRODUCTION_STAGE_LABELS,
  toMoney,
  toUserRef,
  USER_REF_FIELDS,
  type LeadDetailDto,
  type LeadStatus,
  type LeadSummaryDto,
  type ProductionStage,
  type UserRefDto,
} from './leads.types.js';

const CLIENT_FIELDS = ['id', 'firstName', 'lastName', 'mobile', 'email'] as const;

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LeadAccessService,
    private readonly storage: FileStorageService,
  ) {}

  /** Leads with their client, creator and current assignees */
  private withSummary() {
    return this.prisma.orm.public.Lead.include('client', (c) => c.select(...CLIENT_FIELDS))
      .include('createdBy', (u) => u.select(...USER_REF_FIELDS))
      .include('assignments', (a) =>
        a
          .where((x) => x.unassignedAt.isNull())
          .orderBy((x) => x.assignedAt.asc())
          .include('user', (u) => u.select(...USER_REF_FIELDS)),
      );
  }

  async findAll(user: PublicUser, query: ListLeadsQueryDto): Promise<LeadSummaryDto[]> {
    let leads = this.withSummary();
    if (query.status) leads = leads.where({ status: query.status });

    if (user.userType === 'client') {
      // A client only ever sees their own leads, whatever clientId they ask for
      leads = leads.where({ clientId: user.id });
    } else if (query.clientId) {
      leads = leads.where({ clientId: query.clientId });
    }

    // Everyone except admins/managers only sees leads they created or were ever assigned to
    if (user.userType !== 'client' && !hasRole(user, LEAD_VIEW_ALL_ROLES)) {
      leads = leads.where((l) => or(l.createdById.eq(user.id), l.assignments.some((a) => a.userId.eq(user.id))));
    }

    const rows = await leads.orderBy([(l) => l.updatedAt.desc(), (l) => l.id.desc()]).all();
    return rows.map((lead) => ({
      id: lead.id,
      projectName: lead.projectName,
      status: lead.status,
      client: must(lead.client),
      createdBy: toUserRef(lead.createdBy),
      assignees: lead.assignments.map((a) => toUserRef(must(a.user))),
      chatClosed: lead.chatClosed,
      createdAt: iso(lead.createdAt),
      updatedAt: iso(lead.updatedAt),
    }));
  }

  async findOne(id: number, user: PublicUser): Promise<LeadDetailDto> {
    // The access check and the three reads are independent, so they all run at once. Nothing is
    // returned unless the access check passes (Promise.all rejects with its error).
    const [, lead, assignments, history] = await Promise.all([
      this.access.getViewable(id, user),

      this.withSummary()
        .include('assignedBy', (u) => u.select(...USER_REF_FIELDS))
        .include('lastUpdatedBy', (u) => u.select(...USER_REF_FIELDS))
        .include('chatClosedBy', (u) => u.select(...USER_REF_FIELDS))
        .include('productionStageUpdatedBy', (u) => u.select(...USER_REF_FIELDS))
        .include('payments', (p) => p.sum('amount'))
        .where({ id })
        .first(),

      // Every assignment, current and previous, newest first
      this.prisma.orm.public.LeadUser.where({ leadId: id })
        .include('user', (u) => u.select(...USER_REF_FIELDS))
        .include('assignedBy', (u) => u.select(...USER_REF_FIELDS))
        .orderBy([(a) => a.assignedAt.desc(), (a) => a.id.desc()])
        .all(),

      this.prisma.orm.public.LeadStatusHistory.where({ leadId: id })
        .include('changedBy', (u) => u.select(...USER_REF_FIELDS))
        .include('assignedBy', (u) => u.select(...USER_REF_FIELDS))
        .include('assignedTo', (u) => u.select(...USER_REF_FIELDS))
        .orderBy([(h) => h.changedAt.desc(), (h) => h.id.desc()])
        .all(),
    ]);
    if (!lead) throw new NotFoundException('Lead not found.');

    return {
      id: lead.id,
      projectName: lead.projectName,
      status: lead.status,
      client: must(lead.client),
      createdBy: toUserRef(lead.createdBy),
      assignees: lead.assignments.map((a) => toUserRef(must(a.user))),
      chatClosed: lead.chatClosed,
      createdAt: iso(lead.createdAt),
      updatedAt: iso(lead.updatedAt),
      requirement: lead.requirement,
      // Prices are internal: clients never get the amount
      quotationAmount: user.userType === 'client' ? null : lead.quotationAmount,
      isFullyPaid: isFullyPaid(lead.quotationAmount, lead.payments),
      projectConfirmedOn: dayOf(lead.projectConfirmedOn),
      projectCompletionOn: dayOf(lead.projectCompletionOn),
      productionStage: lead.productionStage,
      productionStageUpdatedAt: iso(lead.productionStageUpdatedAt),
      productionStageUpdatedBy: toUserRef(lead.productionStageUpdatedBy),
      assignedBy: toUserRef(lead.assignedBy),
      lastUpdatedBy: toUserRef(lead.lastUpdatedBy),
      chatClosedAt: iso(lead.chatClosedAt),
      chatClosedBy: toUserRef(lead.chatClosedBy),
      assignments: assignments.map((a) => ({
        user: toUserRef(must(a.user)),
        role: a.role,
        assignedBy: toUserRef(a.assignedBy),
        assignedAt: iso(a.assignedAt),
        unassignedAt: iso(a.unassignedAt),
        isActive: a.unassignedAt === null,
      })),
      history: history.map((h) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        changedBy: toUserRef(must(h.changedBy)),
        assignedBy: toUserRef(h.assignedBy),
        assignedTo: toUserRef(h.assignedTo),
        note: h.note,
        changedAt: iso(h.changedAt),
      })),
    };
  }

  /** Active users that a lead can be assigned to (for the assign picker) */
  async assignableUsers(): Promise<UserRefDto[]> {
    const users = await this.prisma.orm.public.User.select(...USER_REF_FIELDS)
      .where({ isActive: true })
      .orderBy([(u) => u.firstName.asc(), (u) => u.lastName.asc()])
      .all();
    return users.map((u) => toUserRef(u));
  }

  async create(dto: CreateLeadDto, actor: PublicUser): Promise<LeadDetailDto> {
    await this.assertClientExists(dto.clientId);

    // A sales person who creates a lead owns it, so they are always assigned
    const assigneeIds = [...new Set([...(actor.role === 'SALES' ? [actor.id] : []), ...(dto.assigneeIds ?? [])])];
    await this.assertAssignable(assigneeIds);

    const id = await this.prisma.db.transaction(async (tx) => {
      const lead = await tx.orm.public.Lead.select('id', 'status').create({
        clientId: dto.clientId,
        projectName: dto.projectName,
        requirement: dto.requirement ?? null,
        createdById: actor.id,
        lastUpdatedById: actor.id,
        assignedById: assigneeIds.length > 0 ? actor.id : null,
      });

      await tx.orm.public.LeadStatusHistory.create({
        leadId: lead.id,
        fromStatus: null,
        toStatus: lead.status,
        changedById: actor.id,
        assignedById: null,
        assignedToId: null,
        note: 'Lead created',
      });

      for (const userId of assigneeIds) {
        await tx.orm.public.LeadUser.create({
          leadId: lead.id,
          userId,
          role: userId === actor.id ? 'PRIMARY' : 'COLLABORATOR',
          assignedById: actor.id,
        });
        await tx.orm.public.LeadStatusHistory.create({
          leadId: lead.id,
          fromStatus: lead.status,
          toStatus: lead.status,
          changedById: actor.id,
          assignedById: actor.id,
          assignedToId: userId,
          note: null,
        });
      }
      return lead.id;
    });

    return this.findOne(id, actor);
  }

  async update(id: number, dto: UpdateLeadDto, actor: PublicUser): Promise<LeadDetailDto> {
    await this.access.getManageable(id, actor);
    if (dto.clientId !== undefined) await this.assertClientExists(dto.clientId);

    await this.prisma.orm.public.Lead.where({ id }).update({
      ...(dto.clientId !== undefined && { clientId: dto.clientId }),
      ...(dto.projectName !== undefined && { projectName: dto.projectName }),
      ...(dto.requirement !== undefined && { requirement: dto.requirement }),
      lastUpdatedById: actor.id,
      updatedAt: Temporal.Now.instant(),
    });
    return this.findOne(id, actor);
  }

  /**
   * Sets the workshop stage. Only while the lead is in Production: before that there is nothing to track,
   * and after it the stages are a read-only record. Each change is added to the lead history.
   */
  async setProductionStage(id: number, stage: ProductionStage, actor: PublicUser): Promise<LeadDetailDto> {
    const lead = await this.access.getManageable(id, actor);
    if (lead.status !== 'PRODUCTION') {
      throw new BadRequestException('The production stage can only be changed while the lead is in Production.');
    }

    await this.prisma.db.transaction(async (tx) => {
      const now = Temporal.Now.instant();
      await tx.orm.public.Lead.where({ id }).update({
        productionStage: stage,
        productionStageUpdatedAt: now,
        productionStageUpdatedById: actor.id,
        lastUpdatedById: actor.id,
        updatedAt: now,
      });
      await tx.orm.public.LeadStatusHistory.create({
        leadId: id,
        fromStatus: lead.status,
        toStatus: lead.status,
        changedById: actor.id,
        assignedById: null,
        assignedToId: null,
        note: `Production stage: ${PRODUCTION_STAGE_LABELS[stage]}`,
      });
    });

    return this.findOne(id, actor);
  }

  /**
   * Hands the lead over to `dto.userIds` (optionally moving it to a new phase), keeping full history:
   * - newly assigned users get an assignment row and one history entry each (assignedBy → assignedTo)
   * - users missing from the list are taken off the lead (`unassignedAt` set) but keep chat access
   * - a phase change without new assignees still gets one history entry
   */
  async assign(id: number, dto: AssignLeadDto, actor: PublicUser): Promise<LeadDetailDto> {
    const lead = await this.access.getManageable(id, actor);
    const assignees = await this.assertAssignable(dto.userIds);

    const fromStatus: LeadStatus = lead.status;
    const toStatus: LeadStatus = dto.status ?? lead.status;
    const note = dto.note ?? null;

    // Moving to another phase hands the lead to that phase's department, so someone from it must be
    // on the lead (Completed has no department). Admins and managers don't count: they can't do the work.
    const phaseRoles = LEAD_MANAGE_ROLES_BY_PHASE[toStatus];
    if (toStatus !== fromStatus && phaseRoles.length > 0 && !assignees.some((u) => phaseRoles.includes(u.role))) {
      throw new BadRequestException(
        `Assign at least one ${phaseRoles.map(labelOf).join(' or ')} user to move the lead to ${labelOf(toStatus)}.`,
      );
    }

    // Moving into Quotation needs the amount (the page asks for it in a popup); payments are tracked against it
    const movingToQuotation = toStatus === 'QUOTATION' && fromStatus !== 'QUOTATION';
    if (movingToQuotation && dto.quotationAmount === undefined) {
      throw new BadRequestException('Please enter the quotation amount.');
    }
    // ...and when the client confirmed and when the project is due
    if (movingToQuotation) {
      if (!dto.projectConfirmedOn) throw new BadRequestException('Please choose the project confirmation date.');
      if (!dto.projectCompletionOn) throw new BadRequestException('Please choose the project completion date.');
      assertCompletionNotBefore(dto.projectConfirmedOn, dto.projectCompletionOn);
    }

    // Completing closes the lead: admins and managers only, and only once every rupee is received
    if (toStatus === 'COMPLETED' && fromStatus !== 'COMPLETED') {
      if (!hasRole(actor, LEAD_COMPLETE_ROLES)) {
        throw new ForbiddenException('Only an admin or manager can mark a lead as completed.');
      }
      const totals = await this.prisma.orm.public.Lead.select('quotationAmount')
        .where({ id })
        .include('payments', (p) => p.sum('amount'))
        .first();
      if (!totals || !isFullyPaid(totals.quotationAmount, totals.payments)) {
        throw new BadRequestException('The lead can be completed only after the full quotation amount is received.');
      }
    }

    await this.prisma.db.transaction(async (tx) => {
      const existing = await tx.orm.public.LeadUser.select('id', 'userId', 'unassignedAt').where({ leadId: id }).all();
      const activeIds = new Set(existing.filter((a) => a.unassignedAt === null).map((a) => a.userId));
      const wanted = new Set(dto.userIds);

      const toRemove = existing.filter((a) => a.unassignedAt === null && !wanted.has(a.userId));
      const toAdd = dto.userIds.filter((userId) => !activeIds.has(userId));

      if (toAdd.length === 0 && toRemove.length === 0 && toStatus === fromStatus) {
        throw new BadRequestException('Nothing to change: same phase and same assignees.');
      }

      const now = Temporal.Now.instant();

      for (const row of toRemove) {
        await tx.orm.public.LeadUser.where({ id: row.id }).update({ unassignedAt: now });
      }

      for (const userId of toAdd) {
        const previous = existing.find((a) => a.userId === userId);
        if (previous) {
          // Was on this lead before: put them back on it
          await tx.orm.public.LeadUser.where({ id: previous.id }).update({
            unassignedAt: null,
            assignedAt: now,
            assignedById: actor.id,
          });
        } else {
          await tx.orm.public.LeadUser.create({ leadId: id, userId, assignedById: actor.id });
        }

        await tx.orm.public.LeadStatusHistory.create({
          leadId: id,
          fromStatus,
          toStatus,
          changedById: actor.id,
          assignedById: actor.id,
          assignedToId: userId,
          note,
        });
      }

      // Phase change or removals only: still record who did it
      if (toAdd.length === 0) {
        await tx.orm.public.LeadStatusHistory.create({
          leadId: id,
          fromStatus,
          toStatus,
          changedById: actor.id,
          assignedById: null,
          assignedToId: null,
          note,
        });
      }

      await tx.orm.public.Lead.where({ id }).update({
        status: toStatus,
        ...(movingToQuotation && {
          quotationAmount: toMoney(dto.quotationAmount!),
          projectConfirmedOn: toDayInstant(dto.projectConfirmedOn!),
          projectCompletionOn: toDayInstant(dto.projectCompletionOn!),
        }),
        ...(toAdd.length > 0 && { assignedById: actor.id }),
        lastUpdatedById: actor.id,
        updatedAt: now,
      });
    });

    return this.findOne(id, actor);
  }

  /**
   * Moves the project completion date. Anyone on staff who can see the lead may do it, but only with a
   * reason, which is kept in the lead history together with the old and new date.
   */
  async setCompletionDate(id: number, dto: SetCompletionDateDto, actor: PublicUser): Promise<LeadDetailDto> {
    const lead = await this.access.getViewable(id, actor);
    const dates = must(await this.prisma.orm.public.Lead.select('projectConfirmedOn', 'projectCompletionOn').where({ id }).first());
    const confirmedOn = dayOf(dates.projectConfirmedOn);
    const previous = dayOf(dates.projectCompletionOn);
    if (!confirmedOn || !previous) {
      throw new BadRequestException('The project dates are set when the lead moves into Quotation.');
    }
    if (dto.projectCompletionOn === previous) {
      throw new BadRequestException('Choose a different date: this is already the completion date.');
    }
    assertCompletionNotBefore(confirmedOn, dto.projectCompletionOn);

    await this.prisma.db.transaction(async (tx) => {
      const now = Temporal.Now.instant();
      await tx.orm.public.Lead.where({ id }).update({
        projectCompletionOn: toDayInstant(dto.projectCompletionOn),
        lastUpdatedById: actor.id,
        updatedAt: now,
      });
      await tx.orm.public.LeadStatusHistory.create({
        leadId: id,
        fromStatus: lead.status,
        toStatus: lead.status,
        changedById: actor.id,
        assignedById: null,
        assignedToId: null,
        note: `Completion date changed from ${formatDay(previous)} to ${formatDay(dto.projectCompletionOn)}. Reason: ${dto.reason}`,
      });
    });

    return this.findOne(id, actor);
  }

  async remove(id: number): Promise<void> {
    const lead = await this.prisma.orm.public.Lead.select('id').where({ id }).first();
    if (!lead) throw new NotFoundException('Lead not found.');

    // Assignments, history, messages and document rows are deleted with the lead (onDelete: Cascade)
    await this.prisma.orm.public.Lead.where({ id }).delete();
    await this.storage.removeFolder(`leads/${id}`);
  }

  private async assertClientExists(clientId: number): Promise<void> {
    const client = await this.prisma.orm.public.Client.select('id').where({ id: clientId }).first();
    if (!client) throw new BadRequestException('The selected client does not exist.');
  }

  /** Every id must be an active user */
  /** Returns the users (with their role) so callers can check who is being assigned */
  private async assertAssignable(userIds: number[]): Promise<{ id: number; role: UserRefDto['role'] }[]> {
    if (userIds.length === 0) return [];
    const found = await this.prisma.orm.public.User.select('id', 'role')
      .where((u) => u.id.in(userIds))
      .where({ isActive: true })
      .all();
    if (found.length !== userIds.length) {
      throw new BadRequestException('One or more selected users do not exist or are inactive.');
    }
    return found;
  }
}

/** A project can't be due before the client confirmed it (YYYY-MM-DD strings compare correctly) */
function assertCompletionNotBefore(confirmedOn: string, completionOn: string): void {
  if (completionOn < confirmedOn) {
    throw new BadRequestException('The completion date cannot be before the confirmation date.');
  }
}

/** "CUTSHEET" → "Cutsheet", for phase and role names in messages */
function labelOf(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

/** Payments (their sum, null when there are none) cover the whole quotation amount */
function isFullyPaid(quotationAmount: string | null, paid: string | null): boolean {
  if (quotationAmount === null) return false;
  return toPaise(paid ?? 0) >= toPaise(quotationAmount);
}
