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

  // Stable across refreshes, so effects that depend on them don't re-run every time the list changes
  const markRead = useCallback(
    async (id: number) => {
      await notificationsApi.markRead(id)
      await refresh()
    },
    [refresh],
  )
  const markAllRead = useCallback(async () => {
    await notificationsApi.markAllRead()
    await refresh()
  }, [refresh])
  const markLeadRead = useCallback(
    async (leadId: number) => {
      await notificationsApi.markLeadRead(leadId)
      await refresh()
    },
    [refresh],
  )

  const value = useMemo<NotificationsContextValue>(
    () => ({ notifications, unreadCount, refresh, markRead, markAllRead, markLeadRead }),
    [notifications, unreadCount, refresh, markRead, markAllRead, markLeadRead],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}
