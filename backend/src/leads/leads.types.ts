import type { Scalars } from '@prisma/orm-postgres/family-contract/types';
import type { PublicUser, UserRole } from '../auth/auth.types.js';
import type { Models } from '../prisma/contract.js';

export type Lead = Scalars<Models.public_Lead>;
export type LeadStatus = Lead['status'];
export type Department = Scalars<Models.public_Document>['department'];

/** Same order as the LeadStatus enum in contract.prisma */
export const LEAD_STATUSES = [
  'ENQUIRY',
  'QUOTATION',
  'OPTIMISATION',
  'PURCHASE',
  'PRODUCTION',
  'DISPATCH',
  'INVOICE',
] as const satisfies readonly LeadStatus[];

/** Same order as the Department enum in contract.prisma */
export const DEPARTMENTS = [
  'ADMIN',
  'SALES',
  'DESIGN',
  'PURCHASE',
  'PRODUCTION',
  'ACCOUNTS',
  'DISPATCH',
] as const satisfies readonly Department[];

/** Who may do what with leads (the frontend mirrors these in src/data/roles.ts) */
export const LEAD_CREATE_ROLES = ['ADMIN', 'SALES'] as const satisfies readonly UserRole[];
/** Edit details, move the lead to another phase, and assign it to users */
export const LEAD_MANAGE_ROLES = ['ADMIN', 'SALES'] as const satisfies readonly UserRole[];
export const LEAD_DELETE_ROLES = ['ADMIN'] as const satisfies readonly UserRole[];
/** These roles see every lead; everyone else only sees leads they created or were ever assigned to */
export const LEAD_VIEW_ALL_ROLES = ['ADMIN', 'MANAGER'] as const satisfies readonly UserRole[];
/** Close / reopen a lead's chat */
export const LEAD_CHAT_CLOSE_ROLES = ['ADMIN'] as const satisfies readonly UserRole[];

/**
 * The folder a user's uploads go into. Roles without their own department (admin, manager)
 * must pick one when uploading; their default is ADMIN.
 */
export const DEPARTMENT_BY_ROLE: Partial<Record<UserRole, Department>> = {
  SALES: 'SALES',
  DESIGNER: 'DESIGN',
  PURCHASE: 'PURCHASE',
  PRODUCTION: 'PRODUCTION',
  ACCOUNTS: 'ACCOUNTS',
  DISPATCH: 'DISPATCH',
};
export const PICK_DEPARTMENT_ROLES = ['ADMIN', 'MANAGER'] as const satisfies readonly UserRole[];

export function hasRole(user: PublicUser, roles: readonly UserRole[]): boolean {
  return roles.includes(user.role);
}

/** A user as embedded in lead responses */
export interface UserRefDto {
  id: number;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export const USER_REF_FIELDS = ['id', 'firstName', 'lastName', 'role'] as const;

export function toUserRef(user: UserRefDto): UserRefDto;
export function toUserRef(user: UserRefDto | null): UserRefDto | null;
export function toUserRef(user: UserRefDto | null): UserRefDto | null {
  return user ? { id: user.id, firstName: user.firstName, lastName: user.lastName, role: user.role } : null;
}

/**
 * A required to-one relation loaded with `.include(name, (u) => u.select(...))` is typed as nullable;
 * the foreign key guarantees it is there, so this just narrows the type.
 */
export function must<T>(value: T | null): T {
  if (value === null) throw new Error('Expected related row is missing');
  return value;
}

/** Turns a Temporal instant (or null) from the database into an ISO string */
export function iso(value: { toString(): string }): string;
export function iso(value: { toString(): string } | null): string | null;
export function iso(value: { toString(): string } | null): string | null {
  return value === null ? null : value.toString();
}

export interface LeadClientDto {
  id: number;
  firstName: string;
  lastName: string;
  mobile: string;
  email: string | null;
}

export interface LeadAssignmentDto {
  user: UserRefDto;
  role: 'PRIMARY' | 'COLLABORATOR';
  assignedBy: UserRefDto | null;
  assignedAt: string;
  /** null while the user is still assigned */
  unassignedAt: string | null;
  isActive: boolean;
}

export interface LeadHistoryDto {
  id: number;
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus;
  changedBy: UserRefDto;
  assignedBy: UserRefDto | null;
  assignedTo: UserRefDto | null;
  note: string | null;
  changedAt: string;
}

/** A row in the leads list */
export interface LeadSummaryDto {
  id: number;
  projectName: string;
  status: LeadStatus;
  client: LeadClientDto;
  createdBy: UserRefDto | null;
  /** Only the people currently working on the lead */
  assignees: UserRefDto[];
  chatClosed: boolean;
  createdAt: string;
  updatedAt: string;
}

/** One lead with everything the detail page shows (chat and files are loaded separately) */
export interface LeadDetailDto extends LeadSummaryDto {
  assignedBy: UserRefDto | null;
  lastUpdatedBy: UserRefDto | null;
  chatClosedAt: string | null;
  chatClosedBy: UserRefDto | null;
  /** Current and previous assignments, newest first */
  assignments: LeadAssignmentDto[];
  /** Phase changes and assignments, newest first */
  history: LeadHistoryDto[];
}

export interface ChatMessageDto {
  id: number;
  message: string;
  user: UserRefDto;
  createdAt: string;
}

export interface LeadDocumentDto {
  id: number;
  department: Department;
  /** The lead's phase when the file was uploaded */
  status: LeadStatus;
  originalName: string;
  extension: string | null;
  mimeType: string | null;
  fileSize: number | null;
  uploadedBy: UserRefDto;
  createdAt: string;
}
