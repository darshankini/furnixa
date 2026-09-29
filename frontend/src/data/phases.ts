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
