import { createContext, useContext } from 'react'
import type { AppNotification } from '../api/notifications'

export interface NotificationsContextValue {
  notifications: AppNotification[]
  unreadCount: number
  /** Fetch now instead of waiting for the next poll */
  refresh: () => Promise<void>
  markRead: (id: number) => Promise<void>
  markAllRead: () => Promise<void>
  /** Called when a lead's chat is opened: its mentions count as seen */
  markLeadRead: (leadId: number) => Promise<void>
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationsProvider>')
  return ctx
}
