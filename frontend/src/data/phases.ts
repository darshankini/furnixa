import {
  Factory,
  FileText,
  Inbox,
  Receipt,
  ShoppingCart,
  SlidersHorizontal,
  Truck,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '../api/auth'
import type { Department } from '../api/leads'

/** Matches the LeadStatus enum in backend/src/prisma/contract.prisma */
export type LeadStatus =
  | 'ENQUIRY'
  | 'QUOTATION'
  | 'OPTIMISATION'
  | 'PURCHASE'
  | 'PRODUCTION'
  | 'DISPATCH'
  | 'INVOICE'

export interface Phase {
  status: LeadStatus
  label: string
  slug: string
  icon: LucideIcon
  /** Colours for the small phase chip / badge */
  chipBg: string
  chipText: string
}

export const PHASES: Phase[] = [
  { status: 'ENQUIRY', label: 'Enquiry', slug: 'enquiry', icon: Inbox, chipBg: '#dbeafe', chipText: '#1e40af' },
  { status: 'QUOTATION', label: 'Quotation', slug: 'quotation', icon: FileText, chipBg: '#ede9fe', chipText: '#5b21b6' },
  { status: 'OPTIMISATION', label: 'Optimisation', slug: 'optimisation', icon: SlidersHorizontal, chipBg: '#ccfbf1', chipText: '#115e59' },
  { status: 'PURCHASE', label: 'Purchase', slug: 'purchase', icon: ShoppingCart, chipBg: '#ffedd5', chipText: '#9a3412' },
  { status: 'PRODUCTION', label: 'Production', slug: 'production', icon: Factory, chipBg: '#fef3c7', chipText: '#92400e' },
  { status: 'DISPATCH', label: 'Dispatch', slug: 'dispatch', icon: Truck, chipBg: '#dcfce7', chipText: '#166534' },
  { status: 'INVOICE', label: 'Invoice', slug: 'invoice', icon: Receipt, chipBg: '#fce7f3', chipText: '#9d174d' },
]

export const PHASE_BY_STATUS = Object.fromEntries(PHASES.map((p) => [p.status, p])) as Record<LeadStatus, Phase>

/** Upload folders, matching the Department enum in contract.prisma */
export const DEPARTMENTS: { value: Department; label: string }[] = [
  { value: 'SALES', label: 'Sales' },
  { value: 'DESIGN', label: 'Design' },
  { value: 'PURCHASE', label: 'Purchase' },
  { value: 'PRODUCTION', label: 'Production' },
  { value: 'ACCOUNTS', label: 'Accounts' },
  { value: 'DISPATCH', label: 'Dispatch' },
  { value: 'ADMIN', label: 'Admin' },
]

/** The folder each role uploads into (admins and managers choose) */
export const DEPARTMENT_BY_ROLE: Partial<Record<UserRole, Department>> = {
  SALES: 'SALES',
  DESIGNER: 'DESIGN',
  PURCHASE: 'PURCHASE',
  PRODUCTION: 'PRODUCTION',
  ACCOUNTS: 'ACCOUNTS',
  DISPATCH: 'DISPATCH',
}
