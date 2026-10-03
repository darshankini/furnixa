import type { UserRole } from './auth'
import { apiRequest, apiUpload } from './client'
import type { LeadStatus } from '../data/phases'

/** Matches the Department enum in backend/src/prisma/contract.prisma */
export type Department = 'ADMIN' | 'SALES' | 'DESIGN' | 'PURCHASE' | 'PRODUCTION' | 'ACCOUNTS' | 'DISPATCH'

export interface UserRef {
  id: number
  firstName: string
  lastName: string
  role: UserRole
}

export interface LeadClient {
  id: number
  firstName: string
  lastName: string
  mobile: string
  email: string | null
}

export interface LeadSummary {
  id: number
  projectName: string
  status: LeadStatus
  client: LeadClient
  createdBy: UserRef | null
  /** People currently working on the lead */
  assignees: UserRef[]
  chatClosed: boolean
  createdAt: string
  updatedAt: string
}

export interface LeadAssignment {
  user: UserRef
  role: 'PRIMARY' | 'COLLABORATOR'
  assignedBy: UserRef | null
  assignedAt: string
  unassignedAt: string | null
  isActive: boolean
}

export interface LeadHistoryEntry {
  id: number
  fromStatus: LeadStatus | null
  toStatus: LeadStatus
  changedBy: UserRef
  assignedBy: UserRef | null
  assignedTo: UserRef | null
  note: string | null
  changedAt: string
}

export interface LeadDetail extends LeadSummary {
  assignedBy: UserRef | null
  lastUpdatedBy: UserRef | null
  chatClosedAt: string | null
  chatClosedBy: UserRef | null
  /** Current and previous assignments, newest first */
  assignments: LeadAssignment[]
  /** Newest first */
  history: LeadHistoryEntry[]
}

export interface ChatMessage {
  id: number
  message: string
  user: UserRef
  createdAt: string
}

export interface LeadDocument {
  id: number
  department: Department
  status: LeadStatus
  originalName: string
  extension: string | null
  mimeType: string | null
  fileSize: number | null
  uploadedBy: UserRef
  createdAt: string
}

export interface LeadInput {
  clientId: number
  projectName: string
}

export interface AssignInput {
  /** Omit to keep the current phase */
  status?: LeadStatus
  /** Everyone who should work on the lead now; others are taken off it */
  userIds: number[]
  note?: string | null
}

export const leadsApi = {
  list: (filter: { status?: LeadStatus; clientId?: number } = {}) => {
    const params = new URLSearchParams()
    if (filter.status) params.set('status', filter.status)
    if (filter.clientId) params.set('clientId', String(filter.clientId))
    const query = params.toString()
    return apiRequest<{ leads: LeadSummary[] }>(`/leads${query ? `?${query}` : ''}`)
  },

  get: (id: number) => apiRequest<{ lead: LeadDetail }>(`/leads/${id}`),

  create: (input: LeadInput & { assigneeIds?: number[] }) =>
    apiRequest<{ lead: LeadDetail }>('/leads', { method: 'POST', body: input }),

  update: (id: number, input: Partial<LeadInput>) =>
    apiRequest<{ lead: LeadDetail }>(`/leads/${id}`, { method: 'PATCH', body: input }),

  remove: (id: number) => apiRequest<{ message: string }>(`/leads/${id}`, { method: 'DELETE' }),

  assignableUsers: () => apiRequest<{ users: UserRef[] }>('/leads/assignable-users'),

  assign: (id: number, input: AssignInput) =>
    apiRequest<{ lead: LeadDetail }>(`/leads/${id}/assign`, { method: 'POST', body: input }),

  /** `after`: only messages newer than this id (for polling) */
  messages: (id: number, after?: number) =>
    apiRequest<{ messages: ChatMessage[] }>(`/leads/${id}/messages${after ? `?after=${after}` : ''}`),

  sendMessage: (id: number, message: string) =>
    apiRequest<{ message: ChatMessage }>(`/leads/${id}/messages`, { method: 'POST', body: { message } }),

  setChatClosed: (id: number, closed: boolean) =>
    apiRequest<{ chat: { chatClosed: boolean; chatClosedAt: string | null; chatClosedBy: UserRef | null } }>(
      `/leads/${id}/chat`,
      { method: 'PATCH', body: { closed } },
    ),

  documents: (id: number) => apiRequest<{ documents: LeadDocument[] }>(`/leads/${id}/documents`),

  uploadDocument: (id: number, file: File, department?: Department) => {
    const form = new FormData()
    form.append('file', file)
    if (department) form.append('department', department)
    return apiUpload<{ document: LeadDocument }>(`/leads/${id}/documents`, form)
  },

  /** A plain link: the browser downloads it with the session cookie */
  documentUrl: (id: number, documentId: number) => `/api/leads/${id}/documents/${documentId}/download`,

  removeDocument: (id: number, documentId: number) =>
    apiRequest<{ message: string }>(`/leads/${id}/documents/${documentId}`, { method: 'DELETE' }),
}
