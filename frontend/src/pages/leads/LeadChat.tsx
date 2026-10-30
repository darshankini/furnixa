import { Download, FileSpreadsheet, FileText, Lock, LockOpen, Paperclip, Send, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { leadsApi, type ChatAttachment, type ChatMessage, type LeadDetail } from '../../api/leads'
import { useAuth } from '../../context/auth-context'
import { LEAD_CHAT_CLOSE_ROLES, ROLE_BY_VALUE } from '../../data/roles'
import { formatDateTime, formatSize, initialsOf } from '../../utils/format'

/** How often to check for new messages while the tab is visible */
const POLL_MS = 5000

/** Same list and limit as CHAT_ALLOWED_TYPES / MAX_CHAT_UPLOAD_BYTES in the backend */
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'm4v', 'mov', 'webm', 'pdf', 'txt', 'csv', 'xls', 'xlsx']
const MAX_BYTES = 20 * 1024 * 1024

/** Returns why the file can't be sent, or null if it can */
function checkFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.includes(ext)) return `"${file.name}" can't be sent. Allowed: photos, videos, PDF, text and Excel files.`
  if (file.size > MAX_BYTES) return `"${file.name}" is larger than 20 MB.`
  return null
}

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
  const [file, setFile] = useState<File | null>(null)

  const listRef = useRef<HTMLDivElement>(null)
  const lastId = useRef(0)
  const fileInput = useRef<HTMLInputElement>(null)

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
    if (!message && !file) return
    setSending(true)
    setSendError('')
    try {
      const res = await leadsApi.sendMessage(lead.id, message, file ?? undefined)
      addMessages([res.message])
      setText('')
      setFile(null)
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : 'Message not sent. Please try again.')
    } finally {
      setSending(false)
    }
  }

  function pickFile(picked: File | undefined) {
    if (fileInput.current) fileInput.current.value = '' // lets the same file be picked again
    if (!picked) return
    const problem = checkFile(picked)
    setSendError(problem ?? '')
    setFile(problem ? null : picked)
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
            const mine = m.senderType === me?.userType && m.user.id === me?.id
            return (
              <div key={m.id} className={`chat-message${mine ? ' mine' : ''}`}>
                {!mine && <span className="person-avatar small" aria-hidden="true">{initialsOf(m.user.firstName, m.user.lastName)}</span>}
                <div className="chat-bubble">
                  {!mine && (
                    <span className="chat-author">
                      {m.user.firstName} {m.user.lastName}
                      <span className="text-muted"> · {m.senderType === 'client' ? 'Client' : ROLE_BY_VALUE[m.user.role].label}</span>
                    </span>
                  )}
                  {m.attachment && <Attachment leadId={lead.id} messageId={m.id} attachment={m.attachment} />}
                  {m.message && <p>{m.message}</p>}
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
          {file && (
            <div className="chat-file-chip">
              <Paperclip size={14} aria-hidden="true" />
              <span className="chat-file-name">{file.name}</span>
              <span className="text-muted">{formatSize(file.size)}</span>
              <button type="button" className="icon-button" onClick={() => setFile(null)} disabled={sending} aria-label="Remove attachment" title="Remove">
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          )}
          <input
            ref={fileInput}
            type="file"
            hidden
            accept={ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(',')}
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          <button type="button" className="btn btn-outline" onClick={() => fileInput.current?.click()} disabled={sending} aria-label="Attach a file" title="Attach photo, video or file">
            <Paperclip size={16} aria-hidden="true" />
          </button>
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
            placeholder={file ? 'Add a caption (optional)…' : 'Write a message…'}
            rows={2}
            maxLength={2000}
            aria-label="Message"
            disabled={sending}
          />
          <button type="submit" className="btn btn-accent" disabled={sending || (!text.trim() && !file)} aria-label="Send">
            <Send size={16} aria-hidden="true" />
          </button>
        </form>
      )}
    </section>
  )
}

/** Photos and videos play in the bubble; other files are a download link */
function Attachment({ leadId, messageId, attachment }: { leadId: number; messageId: number; attachment: ChatAttachment }) {
  const url = leadsApi.attachmentUrl(leadId, messageId)
  if (attachment.kind === 'image') {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="chat-media">
        <img src={url} alt={attachment.name} loading="lazy" />
      </a>
    )
  }
  if (attachment.kind === 'video') {
    return <video className="chat-media" src={url} controls preload="metadata" aria-label={attachment.name} />
  }
  const Icon = /.(xlsx?|csv)$/i.test(attachment.name) ? FileSpreadsheet : FileText
  return (
    <a href={leadsApi.attachmentUrl(leadId, messageId, true)} className="chat-file" download>
      <Icon size={20} aria-hidden="true" />
      <span className="chat-file-name">{attachment.name}</span>
      <span className="text-muted">{formatSize(attachment.size)}</span>
      <Download size={15} aria-hidden="true" />
    </a>
  )
}
