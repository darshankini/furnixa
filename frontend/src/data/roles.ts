import type { UserRole } from '../api/auth'

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
  { value: 'DESIGNER', label: 'Designer', badgeBg: '#ede9fe', badgeText: '#5b21b6' },
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
