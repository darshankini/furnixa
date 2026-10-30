import type { Scalars } from '@prisma/orm-postgres/family-contract/types';
import type { PublicUser, UserRole, UserType } from '../auth/auth.types.js';
import type { Models } from '../prisma/contract.js';
import { GLOBAL_ROLES, isGlobalRole } from '../users/users.types.js';
import type { ChatAttachmentKind } from './chat-attachments.js';

export type Lead = Scalars<Models.public_Lead>;
export type LeadStatus = Lead['status'];
export type Department = Scalars<Models.public_Document>['department'];

/** A numeric(12, 2) column: Prisma reads and writes it as a decimal string such as "100000.00" */
export type Money = NonNullable<Lead['quotationAmount']>;

/** 100000 → "100000.00", typed for numeric(12, 2) columns (the DTO already limits it to 2 decimals) */
export function toMoney(value: number): Money {
  return value.toFixed(2) as Money;
}

/** Same order as the LeadStatus enum in contract.prisma */
export const LEAD_STATUSES = [
  'ENQUIRY',
  'QUOTATION',
  'CUTSHEET',
  'OPTIMISATION',
  'PURCHASE',
  'PRODUCTION',
  'DISPATCH',
  'ACCOUNTS',
  'COMPLETED',
] as const satisfies readonly LeadStatus[];

export type ProductionStage = NonNullable<Lead['productionStage']>;

/** Workshop stages inside the Production phase, same order as the ProductionStage enum in contract.prisma */
export const PRODUCTION_STAGE_LABELS: Record<ProductionStage, string> = {
  PRESSING_01_8FT: 'Pressing 01 (8 Ft)',
  PRESSING_02_10FT: 'Pressing 02 (10 Ft)',
  CUTTING_01: 'Cutting 01',
  CUTTING_02: 'Cutting 02',
  EDGE_BENDING_01: 'Edge Bending 01',
  EDGE_BENDING_02: 'Edge Bending 02',
  FINISHING: 'Finishing',
  CUT_OUT_MANUAL: 'Cut Out Manual',
  CARPENTER: 'Carpenter',
  ROUTER_AND_HANDLE: 'Router and Handle',
  DRILLING: 'Drilling',
  CNC: 'CNC',
  ASSEMBLY_QC: 'Assembly QC',
  PACKING: 'Packing',
  DISPATCH_DEPARTMENT: 'Dispatch Department',
  BILLING: 'Billing',
};
export const PRODUCTION_STAGES = Object.keys(PRODUCTION_STAGE_LABELS) as ProductionStage[];

/** Same order as the Department enum in contract.prisma */
export const DEPARTMENTS = [
  'SALES',
  'CUTSHEET',
  'OPTIMISATION',
  'PURCHASE',
  'PRODUCTION',
  'ACCOUNTS',
  'DISPATCH',
] as const satisfies readonly Department[];

/** Who may do what with leads (the frontend mirrors these in src/data/roles.ts) */
export const LEAD_CREATE_ROLES = ['ADMIN', 'SALES'] as const satisfies readonly UserRole[];
/**
 * Edit details, move the lead to another phase, and assign it to users.
 * Each phase is managed by its own department; GLOBAL_ROLES (admin, manager) manage every phase.
 */
export const LEAD_MANAGE_ROLES_BY_PHASE: Record<LeadStatus, readonly UserRole[]> = {
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
};
/** Move a lead into Completed, and only once the quotation amount is fully paid */
export const LEAD_COMPLETE_ROLES = GLOBAL_ROLES;
/** Every role that can manage at least one phase: the route-level gate, the phase itself is checked per lead */
export const LEAD_MANAGE_ROLES: readonly UserRole[] = [
  ...new Set([...GLOBAL_ROLES, ...Object.values(LEAD_MANAGE_ROLES_BY_PHASE).flat()]),
];

export function canManagePhase(role: UserRole, phase: LeadStatus): boolean {
  return isGlobalRole(role) || LEAD_MANAGE_ROLES_BY_PHASE[phase].includes(role);
}
export const LEAD_DELETE_ROLES = ['ADMIN'] as const satisfies readonly UserRole[];
/** These roles see every lead; everyone else only sees leads they created or were ever assigned to */
export const LEAD_VIEW_ALL_ROLES = GLOBAL_ROLES;
/** Close / reopen a lead's chat */
export const LEAD_CHAT_CLOSE_ROLES = ['ADMIN'] as const satisfies readonly UserRole[];

/**
 * The folder a user's uploads go into. Roles without their own department (admin, manager)
 * must pick one when uploading; their default is ADMIN.
 */
export const DEPARTMENT_BY_ROLE: Partial<Record<UserRole, Department>> = {
  SALES: 'SALES',
  CUTSHEET: 'CUTSHEET',
  OPTIMISATION: 'OPTIMISATION',
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
  requirement: string | null;
  /** Decimal as a string, e.g. "100000.00"; null until the lead reaches Quotation (always null for clients) */
  quotationAmount: string | null;
  /** Payments add up to the quotation amount, so admins and managers may complete the lead */
  isFullyPaid: boolean;
  /** null until someone in Production picks a stage */
  productionStage: ProductionStage | null;
  productionStageUpdatedAt: string | null;
  productionStageUpdatedBy: UserRefDto | null;
  assignedBy: UserRefDto | null;
  lastUpdatedBy: UserRefDto | null;
  chatClosedAt: string | null;
  chatClosedBy: UserRefDto | null;
  /** Current and previous assignments, newest first */
  assignments: LeadAssignmentDto[];
  /** Phase changes and assignments, newest first */
  history: LeadHistoryDto[];
}

/** ChatMessage.userType values: which table the sender is in (staff user → userId, client → clientId) */
export const CHAT_SENDER_TYPE = { user: 1, client: 2 } as const satisfies Record<UserType, number>;

export interface ChatMessageDto {
  id: number;
  message: string;
  /** Who sent it: a staff user, or the lead's client (role is then always CLIENT_ROLE) */
  senderType: UserType;
  user: UserRefDto;
  /** Fetched from GET /leads/:id/messages/:messageId/attachment */
  attachment: ChatAttachmentDto | null;
  createdAt: string;
}

/** Someone who can be @mentioned in a lead chat. Ids repeat across users and clients, so the key is type + id. */
export interface MentionableDto {
  type: UserType;
  id: number;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface ChatAttachmentDto {
  name: string;
  /** image and video are shown inline, file is a download link */
  kind: ChatAttachmentKind;
  mimeType: string;
  size: number | null;
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
