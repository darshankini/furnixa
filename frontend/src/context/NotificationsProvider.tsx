import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { notificationsApi, type AppNotification } from '../api/notifications'
import { NotificationsContext, type NotificationsContextValue } from './notifications-context'

/** How often to check for new notifications while the tab is visible */
const POLL_MS = 30_000

/** One poller for the whole signed-in app; every bell reads from here */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const refresh = useCallback(
    () =>
      notificationsApi
        .list()
        .then((res) => {
          setNotifications(res.notifications)
          setUnreadCount(res.unreadCount)
        })
        .catch(() => undefined), // try again on the next tick
    [],
  )

  useEffect(() => {
    // State is only set once the request answers, never synchronously here
    notificationsApi
      .list()
      .then((res) => {
        setNotifications(res.notifications)
        setUnreadCount(res.unreadCount)
      })
      .catch(() => undefined)
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh()
    }, POLL_MS)
    // Coming back to the tab shows anything that arrived meanwhile
    const onVisible = () => {
      if (!document.hidden) void refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount,
      refresh,
      markRead: async (id) => {
        await notificationsApi.markRead(id)
        await refresh()
      },
      markAllRead: async () => {
        await notificationsApi.markAllRead()
        await refresh()
      },
      markLeadRead: async (leadId) => {
        await notificationsApi.markLeadRead(leadId)
        await refresh()
      },
    }),
    [notifications, unreadCount, refresh],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}
