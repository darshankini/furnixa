import type { UserRole } from './auth'
import { API_BASE, apiRequest, apiUpload } from './client'
import type { LeadStatus, ProductionStage } from '../data/phases'

/** Matches the Department enum in backend/src/prisma/contract.prisma */
export type Department = 'ADMIN' | 'SALES' | 'CUTSHEET' | 'OPTIMISATION' | 'PURCHASE' | 'PRODUCTION' | 'ACCOUNTS' | 'DISPATCH'

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
  /** What the client wants (sizes, quantities); null when not filled in */
  requirement: string | null
  /** Decimal string such as "100000.00"; null until the lead reaches Quotation (always null for clients) */
  quotationAmount: string | null
  /** Payments add up to the quotation amount, so admins and managers may complete the lead */
  isFullyPaid: boolean
  /** Days as YYYY-MM-DD, set when the lead moves into Quotation; null before that */
  projectConfirmedOn: string | null
  projectCompletionOn: string | null
  /** Workshop stage inside the Production phase; null until someone picks one */
  productionStage: ProductionStage | null
  productionStageUpdatedAt: string | null
  productionStageUpdatedBy: UserRef | null
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
  /** A client and a staff user can share the same id, so compare both */
  senderType: 'user' | 'client'
  user: UserRef
  attachment: ChatAttachment | null
  createdAt: string
}

/** A staff user or the lead's client. Ids repeat across the two, so `${type}:${id}` is the key. */
export interface MentionablePerson {
  type: 'user' | 'client'
  id: number
  firstName: string
  lastName: string
  role: UserRole
}

export interface ChatAttachment {
  name: string
  /** image and video are shown in the chat, file is a download link */
  kind: 'image' | 'video' | 'file'
  mimeType: string
  size: number | null
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
  /** "" or null clears it */
  requirement?: string | null
}

export interface AssignInput {
  /** Omit to keep the current phase */
  status?: LeadStatus
  /** Everyone who should work on the lead now; others are taken off it */
  userIds: number[]
  note?: string | null
  /** Required when moving the lead into Quotation, together with both project dates (YYYY-MM-DD) */
  quotationAmount?: number
  projectConfirmedOn?: string
  projectCompletionOn?: string
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

  /** Only while the lead is in Production */
  /** Anyone on staff who can see the lead; the reason is kept in the lead history */
  setCompletionDate: (id: number, projectCompletionOn: string, reason: string) =>
    apiRequest<{ lead: LeadDetail }>(`/leads/${id}/completion-date`, { method: 'PATCH', body: { projectCompletionOn, reason } }),

  setProductionStage: (id: number, stage: ProductionStage) =>
    apiRequest<{ lead: LeadDetail }>(`/leads/${id}/production-stage`, { method: 'PATCH', body: { stage } }),

  /** `after`: only messages newer than this id (for polling) */
  messages: (id: number, after?: number) =>
    apiRequest<{ messages: ChatMessage[] }>(`/leads/${id}/messages${after ? `?after=${after}` : ''}`),

  /** With a file the message text is an optional caption */
  sendMessage: (id: number, message: string, { file, mentions = [] }: { file?: File; mentions?: string[] } = {}) => {
    // "user:12,client:3"; the server only notifies people whose "@First Last" is in the text
    const mentionList = mentions.length ? mentions.join(',') : undefined
    if (!file) {
      return apiRequest<{ message: ChatMessage }>(`/leads/${id}/messages`, { method: 'POST', body: { message, mentions: mentionList } })
    }
    const form = new FormData()
    form.append('file', file)
    if (message) form.append('message', message)
    if (mentionList) form.append('mentions', mentionList)
    return apiUpload<{ message: ChatMessage }>(`/leads/${id}/messages`, form)
  },

  /** People who can be @mentioned in this lead's chat (everyone else who can read it) */
  mentionable: (id: number) => apiRequest<{ people: MentionablePerson[] }>(`/leads/${id}/mentionable`),

  /** Used directly as <img>/<video> src or a link; the session cookie goes along */
  attachmentUrl: (id: number, messageId: number, download = false) =>
    `${API_BASE}/leads/${id}/messages/${messageId}/attachment${download ? '?download=true' : ''}`,

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
  documentUrl: (id: number, documentId: number) => `${API_BASE}/leads/${id}/documents/${documentId}/download`,

  removeDocument: (id: number, documentId: number) =>
    apiRequest<{ message: string }>(`/leads/${id}/documents/${documentId}`, { method: 'DELETE' }),
}
