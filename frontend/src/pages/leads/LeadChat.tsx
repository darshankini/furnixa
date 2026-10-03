import { Lock, LockOpen, Send } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { leadsApi, type ChatMessage, type LeadDetail } from '../../api/leads'
import { useAuth } from '../../context/auth-context'
import { LEAD_CHAT_CLOSE_ROLES, ROLE_BY_VALUE } from '../../data/roles'
import { formatDateTime, initialsOf } from '../../utils/format'

/** How often to check for new messages while the tab is visible */
const POLL_MS = 5000

interface Props {
  lead: LeadDetail
  /** Called after an admin closes or reopens the chat */
  onChatStatusChange: (closed: boolean) => void
}

/** Chat for everyone who is or was on the lead. Polls for new messages; admins can close it. */
export function LeadChat({ lead, onChatStatusChange }: Props) {
  const { user: me } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[] | null>(null)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [toggling, setToggling] = useState(false)

  const listRef = useRef<HTMLDivElement>(null)
  const lastId = useRef(0)

  const canClose = !!me && LEAD_CHAT_CLOSE_ROLES.includes(me.role)

  const addMessages = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return
    lastId.current = Math.max(lastId.current, ...incoming.map((m) => m.id))
    setMessages((prev) => {
      const seen = new Set((prev ?? []).map((m) => m.id))
      return [...(prev ?? []), ...incoming.filter((m) => !seen.has(m.id))]
    })
  }, [])

  // First load, then poll for anything newer than the last message we have
  useEffect(() => {
    let cancelled = false
    leadsApi
      .messages(lead.id)
      .then((res) => {
        if (cancelled) return
        setMessages([])
        addMessages(res.messages)
      })
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Unable to load the chat.'))

    const timer = window.setInterval(() => {
      if (document.hidden) return
      leadsApi
        .messages(lead.id, lastId.current || undefined)
        .then((res) => !cancelled && addMessages(res.messages))
        .catch(() => undefined) // try again on the next tick
    }, POLL_MS)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [lead.id, addMessages])

  // Keep the newest message in view
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages?.length])

  async function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const message = text.trim()
    if (!message) return
    setSending(true)
    setSendError('')
    try {
      const res = await leadsApi.sendMessage(lead.id, message)
      addMessages([res.message])
      setText('')
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : 'Message not sent. Please try again.')
    } finally {
      setSending(false)
    }
  }

  async function toggleClosed() {
    setToggling(true)
    setSendError('')
    try {
      const res = await leadsApi.setChatClosed(lead.id, !lead.chatClosed)
      onChatStatusChange(res.chat.chatClosed)
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : 'Unable to change the chat status.')
    } finally {
      setToggling(false)
    }
  }

  return (
    <section className="panel chat-panel">
      <div className="panel-title-row">
        <h2 className="panel-title">Chat</h2>
        {canClose && (
          <button type="button" className={`btn ${lead.chatClosed ? 'btn-outline' : 'btn-outline-danger'}`} onClick={toggleClosed} disabled={toggling}>
            {lead.chatClosed ? <LockOpen size={16} aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />}
            {lead.chatClosed ? 'Reopen chat' : 'Close chat'}
          </button>
        )}
      </div>

      <div className="chat-messages" ref={listRef} aria-live="polite">
        {error ? (
          <div className="state-box" role="alert">{error}</div>
        ) : messages === null ? (
          <div className="state-box">Loading chat…</div>
        ) : messages.length === 0 ? (
          <div className="state-box">No messages yet. Everyone on this lead, now or before, can chat here.</div>
        ) : (
          messages.map((m) => {
            const mine = m.user.id === me?.id
            return (
              <div key={m.id} className={`chat-message${mine ? ' mine' : ''}`}>
                {!mine && <span className="person-avatar small" aria-hidden="true">{initialsOf(m.user.firstName, m.user.lastName)}</span>}
                <div className="chat-bubble">
                  {!mine && (
                    <span className="chat-author">
                      {m.user.firstName} {m.user.lastName}
                      <span className="text-muted"> · {ROLE_BY_VALUE[m.user.role].label}</span>
                    </span>
                  )}
                  <p>{m.message}</p>
                  <time dateTime={m.createdAt}>{formatDateTime(m.createdAt)}</time>
                </div>
              </div>
            )
          })
        )}
      </div>

      {sendError && <div className="alert alert-error" role="alert">{sendError}</div>}

      {lead.chatClosed ? (
        <p className="chat-closed-banner">
          <Lock size={15} aria-hidden="true" />
          This chat was closed{lead.chatClosedBy ? ` by ${lead.chatClosedBy.firstName} ${lead.chatClosedBy.lastName}` : ''}
          {lead.chatClosedAt ? ` on ${formatDateTime(lead.chatClosedAt)}` : ''}. Messages are read-only.
        </p>
      ) : (
        <form className="chat-form" onSubmit={handleSend}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter adds a new line
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                e.currentTarget.form?.requestSubmit()
              }
            }}
            placeholder="Write a message…"
            rows={2}
            maxLength={2000}
            aria-label="Message"
            disabled={sending}
          />
          <button type="submit" className="btn btn-accent" disabled={sending || !text.trim()} aria-label="Send">
            <Send size={16} aria-hidden="true" />
          </button>
        </form>
      )}
    </section>
  )
}
