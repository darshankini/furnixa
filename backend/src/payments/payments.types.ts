import type { Scalars } from '@prisma/orm-postgres/family-contract/types';
import type { UserRole } from '../auth/auth.types.js';
import type { LeadClientDto, LeadStatus, UserRefDto } from '../leads/leads.types.js';
import type { Models } from '../prisma/contract.js';

export type PaymentMode = Scalars<Models.public_Payment>['mode'];

/** Same order as the PaymentMode enum in contract.prisma */
export const PAYMENT_MODES = ['CASH', 'UPI', 'CARD', 'CHEQUE'] as const satisfies readonly PaymentMode[];

/** Who can see and add payments (the frontend mirrors this in src/data/roles.ts) */
export const PAYMENT_ROLES = ['ADMIN', 'MANAGER', 'ACCOUNTS'] as const satisfies readonly UserRole[];

/** Money is sent as decimal strings ("100000.00") so nothing is lost to floating point */
export interface PaymentTotalsDto {
  /** The lead's quotation amount */
  totalAmount: string;
  paidAmount: string;
  balanceAmount: string;
}

/** A row on the Payment follow-up page: one lead that has a quotation amount */
export interface PaymentLeadDto extends PaymentTotalsDto {
  leadId: number;
  projectName: string;
  status: LeadStatus;
  client: LeadClientDto;
  /** Date of the newest payment, null when nothing has been paid */
  lastPaidOn: string | null;
}

export interface PaymentDto {
  id: number;
  amount: string;
  mode: PaymentMode;
  paidOn: string;
  note: string | null;
  createdBy: UserRefDto;
  createdAt: string;
}

/** One lead's payments, newest first, with the totals */
export interface LeadPaymentsDto extends PaymentLeadDto {
  payments: PaymentDto[];
}

/**
 * Sums are done in paise (whole numbers) so 0.1 + 0.2 style rounding never shows up.
 * numeric(12, 2) tops out below 10^12 paise, well inside Number.MAX_SAFE_INTEGER.
 */
export function toPaise(amount: string | number): number {
  return Math.round(Number(amount) * 100);
}

export function fromPaise(paise: number): string {
  return (paise / 100).toFixed(2);
}
