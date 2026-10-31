import type { User, UserRole } from '../api/auth'
import type { LeadStatus } from './phases'

export interface RoleOption {
  value: UserRole
  label: string
  badgeBg: string
  badgeText: string
}

/** Matches the UserRole enum in backend/src/prisma/contract.prisma */
export const ROLES: RoleOption[] = [
  { value: 'ADMIN', label: 'Admin', badgeBg: '#fee2e2', badgeText: '#991b1b' },
  { value: 'MANAGER', label: 'Manager', badgeBg: '#ffedd5', badgeText: '#9a3412' },
  { value: 'SALES', label: 'Sales', badgeBg: '#dbeafe', badgeText: '#1e40af' },
  { value: 'CUTSHEET', label: 'Cutsheet', badgeBg: '#ede9fe', badgeText: '#bed31d' },
  { value: 'OPTIMISATION', label: 'Optimisation', badgeBg: '#ede9fe', badgeText: '#de36b1' },
  { value: 'PURCHASE', label: 'Purchase', badgeBg: '#fef3c7', badgeText: '#92400e' },
  { value: 'PRODUCTION', label: 'Production', badgeBg: '#ccfbf1', badgeText: '#115e59' },
  { value: 'ACCOUNTS', label: 'Accounts', badgeBg: '#fce7f3', badgeText: '#9d174d' },
  { value: 'DISPATCH', label: 'Dispatch', badgeBg: '#dcfce7', badgeText: '#166534' },
  { value: 'USER', label: 'User', badgeBg: '#f3f4f6', badgeText: '#374151' },
]

export const ROLE_BY_VALUE = Object.fromEntries(ROLES.map((r) => [r.value, r])) as Record<UserRole, RoleOption>

/** Same rules as the backend: admins and managers can see users, only admins can create or edit them */
export const USER_VIEW_ROLES: UserRole[] = ['ADMIN', 'MANAGER']
export const USER_CREATE_ROLES: UserRole[] = ['ADMIN']
export const USER_EDIT_ROLES: UserRole[] = ['ADMIN']

/** Everyone signed in can view clients; these roles can add/edit, and a smaller set can delete */
export const CLIENT_MANAGE_ROLES: UserRole[] = ['ADMIN', 'MANAGER', 'SALES']
export const CLIENT_DELETE_ROLES: UserRole[] = ['ADMIN', 'MANAGER']

/** Clients sign in to follow their own leads: they can view them and chat, nothing else (backend: @AllowClients) */
export const isClient = (user: User | null): boolean => user?.userType === 'client'

/** Same as GLOBAL_ROLES in backend/src/users/users.types.ts: not tied to one phase, they can access every phase */
export const GLOBAL_ROLES: UserRole[] = ['ADMIN', 'MANAGER']
export const isGlobalRole = (role: UserRole): boolean => GLOBAL_ROLES.includes(role)

/** Same rules as backend/src/leads/leads.types.ts */
export const LEAD_CREATE_ROLES: UserRole[] = ['ADMIN', 'SALES']
/** Edit, move to another phase, and assign to users: each phase's own role, plus GLOBAL_ROLES for every phase */
export const LEAD_MANAGE_ROLES_BY_PHASE: Record<LeadStatus, UserRole[]> = {
  ENQUIRY: ['SALES'],
  QUOTATION: ['SALES'],
  CUTSHEET: ['CUTSHEET'],
  OPTIMISATION: ['OPTIMISATION'],
  PURCHASE: ['PURCHASE'],
  PRODUCTION: ['PRODUCTION'],
  DISPATCH: ['DISPATCH'],
  ACCOUNTS: ['ACCOUNTS'],
  // A completed lead is closed: only GLOBAL_ROLES (admin, manager) can change it
  COMPLETED: [],
}
/** Move a lead into Completed (backend also requires the quotation amount to be fully paid) */
export const LEAD_COMPLETE_ROLES: UserRole[] = GLOBAL_ROLES
/** Every role that can manage at least one phase (route gate; the lead's phase is checked with canEditLead) */
export const LEAD_MANAGE_ROLES: UserRole[] = [
  ...new Set([...GLOBAL_ROLES, ...Object.values(LEAD_MANAGE_ROLES_BY_PHASE).flat()]),
]
export const LEAD_DELETE_ROLES: UserRole[] = ['ADMIN']
export const LEAD_CHAT_CLOSE_ROLES: UserRole[] = ['ADMIN']
/** Payment follow-up: see and add payments (same as PAYMENT_ROLES in backend/src/payments/payments.types.ts) */
export const PAYMENT_ROLES: UserRole[] = ['ADMIN', 'MANAGER', 'ACCOUNTS']
/** These roles pick a folder when uploading; everyone else uploads into their own department */
export const PICK_DEPARTMENT_ROLES: UserRole[] = ['ADMIN', 'MANAGER']

export const canEditLead = (role: UserRole, phase: LeadStatus | undefined): boolean => {
  if (isGlobalRole(role)) return true
  if (!phase) return false
  return LEAD_MANAGE_ROLES_BY_PHASE[phase]?.includes(role) ?? false
}
