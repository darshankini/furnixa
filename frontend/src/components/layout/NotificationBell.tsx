import { AtSign, Bell, CheckCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AppNotification } from '../../api/notifications'
import { useNotifications } from '../../context/notifications-context'
import { formatDateTime } from '../../utils/format'

interface Props {
  /** "sidebar" sits on the dark sidebar (desktop), "topbar" in the mobile header */
  variant: 'sidebar' | 'topbar'
}

/** Bell with an unread badge; the panel lists recent notifications and opens the chat message on click */
export function NotificationBell({ variant }: Props) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Close on Escape or a click outside
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  function openNotification(n: AppNotification) {
    setOpen(false)
    if (!n.read) void markRead(n.id).catch(() => undefined)
    navigate(`/leads/${n.leadId}${n.chatMessageId ? `?message=${n.chatMessageId}` : ''}`)
  }

  const badge = unreadCount > 99 ? '99+' : String(unreadCount)

  return (
    <div className={`notif notif-${variant}`} ref={rootRef}>
      <button
        type="button"
        className="notif-button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell size={19} aria-hidden="true" />
        {unreadCount > 0 && <span className="notif-badge">{badge}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <div className="notif-head">
            <strong>Notifications</strong>
            {unreadCount > 0 && (
              <button type="button" className="notif-mark-all" onClick={() => void markAllRead().catch(() => undefined)}>
                <CheckCheck size={15} aria-hidden="true" />
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="notif-empty">No notifications yet. You'll see it here when someone @mentions you in a chat.</p>
          ) : (
            <ul className="notif-list">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button type="button" className={`notif-item${n.read ? '' : ' unread'}`} onClick={() => openNotification(n)}>
                    <span className="notif-icon" aria-hidden="true">
                      <AtSign size={15} />
                    </span>
                    <span className="notif-text">
                      <span>
                        <strong>{n.actorName}</strong> mentioned you
                      </span>
                      <span className="notif-preview">{n.preview}</span>
                      <time dateTime={n.createdAt}>{formatDateTime(n.createdAt)}</time>
                    </span>
                    {!n.read && <span className="notif-dot" aria-label="Unread" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
