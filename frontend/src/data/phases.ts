import {
  BadgeCheck,
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
  | 'CUTSHEET'
  | 'OPTIMISATION'
  | 'PURCHASE'
  | 'PRODUCTION'
  | 'DISPATCH'
  | 'ACCOUNTS'
  | 'COMPLETED'

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
  { status: 'ENQUIRY', label: 'Enquiry', slug: 'enquiry', icon: Inbox, chipBg: '#008000 ', chipText: '#ede9fe' },
  { status: 'QUOTATION', label: 'Quotation', slug: 'quotation', icon: FileText, chipBg: '#008000', chipText: '#ede9fe' },
  { status: 'CUTSHEET', label: 'Cutsheet', slug: 'cutsheet', icon: FileText, chipBg: '#008000', chipText: '#ede9fe' },
  { status: 'OPTIMISATION', label: 'Optimisation', slug: 'optimisation', icon: SlidersHorizontal, chipBg: '#008000', chipText: '#ede9fe' },
  { status: 'PURCHASE', label: 'Purchase', slug: 'purchase', icon: ShoppingCart, chipBg: '#008000', chipText: '#ede9fe' },
  { status: 'PRODUCTION', label: 'Production', slug: 'production', icon: Factory, chipBg: '#008000', chipText: '#ede9fe' },
  { status: 'DISPATCH', label: 'Dispatch', slug: 'dispatch', icon: Truck, chipBg: '#008000', chipText: '#ede9fe' },
  { status: 'ACCOUNTS', label: 'Accounts', slug: 'account', icon: Receipt, chipBg: '#008000', chipText: '#ede9fe' },
  { status: 'COMPLETED', label: 'Completed', slug: 'completed', icon: BadgeCheck, chipBg: '#008000', chipText: '#ede9fe' },
]

/** true when `status` is the same phase as `phase` or a later one */
export const isAtOrAfter = (status: LeadStatus, phase: LeadStatus): boolean =>
  PHASES.findIndex((p) => p.status === status) >= PHASES.findIndex((p) => p.status === phase)

/** Matches the ProductionStage enum in backend/src/prisma/contract.prisma (workshop order) */
export type ProductionStage =
  | 'PRESSING_01_8FT'
  | 'PRESSING_02_10FT'
  | 'CUTTING_01'
  | 'CUTTING_02'
  | 'EDGE_BENDING_01'
  | 'EDGE_BENDING_02'
  | 'FINISHING'
  | 'CUT_OUT_MANUAL'
  | 'CARPENTER'
  | 'ROUTER_AND_HANDLE'
  | 'DRILLING'
  | 'CNC'
  | 'ASSEMBLY_QC'
  | 'PACKING'
  | 'DISPATCH_DEPARTMENT'
  | 'BILLING'

export const PRODUCTION_STAGES: { value: ProductionStage; label: string }[] = [
  { value: 'PRESSING_01_8FT', label: 'Pressing 01 (8 Ft)' },
  { value: 'PRESSING_02_10FT', label: 'Pressing 02 (10 Ft)' },
  { value: 'CUTTING_01', label: 'Cutting 01' },
  { value: 'CUTTING_02', label: 'Cutting 02' },
  { value: 'EDGE_BENDING_01', label: 'Edge Bending 01' },
  { value: 'EDGE_BENDING_02', label: 'Edge Bending 02' },
  { value: 'FINISHING', label: 'Finishing' },
  { value: 'CUT_OUT_MANUAL', label: 'Cut Out Manual' },
  { value: 'CARPENTER', label: 'Carpenter' },
  { value: 'ROUTER_AND_HANDLE', label: 'Router and Handle' },
  { value: 'DRILLING', label: 'Drilling' },
  { value: 'CNC', label: 'CNC' },
  { value: 'ASSEMBLY_QC', label: 'Assembly QC' },
  { value: 'PACKING', label: 'Packing' },
  { value: 'DISPATCH_DEPARTMENT', label: 'Dispatch Department' },
  { value: 'BILLING', label: 'Billing' },
]

export const PHASE_BY_STATUS = Object.fromEntries(PHASES.map((p) => [p.status, p])) as Record<LeadStatus, Phase>

/** Upload folders, matching the Department enum in contract.prisma */
export const DEPARTMENTS: { value: Department; label: string }[] = [
  { value: 'SALES', label: 'Sales' },
  { value: 'CUTSHEET', label: 'Cutsheet' },
  { value: 'OPTIMISATION', label: 'Optimisation' },
  { value: 'PURCHASE', label: 'Purchase' },
  { value: 'PRODUCTION', label: 'Production' },
  { value: 'ACCOUNTS', label: 'Accounts' },
  { value: 'DISPATCH', label: 'Dispatch' },
  { value: 'ADMIN', label: 'Admin' },
]

/** The folder each role uploads into (admins and managers choose) */
export const DEPARTMENT_BY_ROLE: Partial<Record<UserRole, Department>> = {
  SALES: 'SALES',
  CUTSHEET : 'CUTSHEET',
  OPTIMISATION : 'OPTIMISATION',
  PURCHASE: 'PURCHASE',
  PRODUCTION: 'PRODUCTION',
  ACCOUNTS: 'ACCOUNTS',
  DISPATCH: 'DISPATCH',
}
