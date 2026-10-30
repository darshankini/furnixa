import { apiRequest } from './client'

export interface AppNotification {
  id: number
  type: 'MENTION'
  leadId: number
  chatMessageId: number | null
  /** Who mentioned you */
  actorName: string
  /** Start of the message */
  preview: string
  read: boolean
  createdAt: string
}

export const notificationsApi = {
  /** Newest first, plus how many are unread */
  list: () => apiRequest<{ notifications: AppNotification[]; unreadCount: number }>('/notifications'),

  markRead: (id: number) => apiRequest<{ message: string }>(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllRead: () => apiRequest<{ message: string }>('/notifications/read-all', { method: 'PATCH' }),

  /** Everything about one lead, used when its chat is opened */
  markLeadRead: (leadId: number) => apiRequest<{ message: string }>(`/notifications/leads/${leadId}/read`, { method: 'PATCH' }),
}
