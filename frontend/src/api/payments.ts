import { apiRequest } from './client'
import type { LeadClient, UserRef } from './leads'
import type { LeadStatus } from '../data/phases'

/** Matches the PaymentMode enum in backend/src/prisma/contract.prisma */
export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'CHEQUE'

export const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Card' },
  { value: 'CHEQUE', label: 'Cheque' },
]

/** Money comes as decimal strings such as "100000.00" */
export interface PaymentLead {
  leadId: number
  projectName: string
  status: LeadStatus
  client: LeadClient
  totalAmount: string
  paidAmount: string
  balanceAmount: string
  lastPaidOn: string | null
}

export interface Payment {
  id: number
  amount: string
  mode: PaymentMode
  paidOn: string
  note: string | null
  createdBy: UserRef
  createdAt: string
}

export interface LeadPayments extends PaymentLead {
  /** Newest first */
  payments: Payment[]
}

export interface PaymentInput {
  amount: number
  mode: PaymentMode
  /** YYYY-MM-DD */
  paidOn: string
  note?: string | null
}

export const paymentsApi = {
  list: () => apiRequest<{ leads: PaymentLead[] }>('/payments'),

  forLead: (leadId: number) => apiRequest<{ lead: LeadPayments }>(`/payments/leads/${leadId}`),

  create: (leadId: number, input: PaymentInput) =>
    apiRequest<{ lead: LeadPayments }>(`/payments/leads/${leadId}`, { method: 'POST', body: input }),
}
