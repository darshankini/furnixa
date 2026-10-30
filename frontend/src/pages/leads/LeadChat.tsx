import { Download, FileSpreadsheet, FileText, Lock, LockOpen, Paperclip, Send, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { leadsApi, type ChatAttachment, type ChatMessage, type LeadDetail, type MentionablePerson } from '../../api/leads'
import { useAuth } from '../../context/auth-context'
import { useNotifications } from '../../context/notifications-context'
import { LEAD_CHAT_CLOSE_ROLES, ROLE_BY_VALUE } from '../../data/roles'
import { formatDateTime, formatSize, initialsOf } from '../../utils/format'
import { takeChatPrefetch } from './chat-prefetch'

/** How often to check for new messages while the tab is visible */
const POLL_MS = 5000

/** Same list and limit as CHAT_ALLOWED_TYPES / MAX_CHAT_UPLOAD_BYTES in the backend */
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'm4v', 'mov', 'webm', 'pdf', 'txt', 'csv', 'xls', 'xlsx']
const MAX_BYTES = 20 * 1024 * 1024

/** At most this many names in the @ picker */
const MAX_SUGGESTIONS = 6

/** Returns why the file can't be sent, or null if it can */
function checkFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.includes(ext)) return `"${file.name}" can't be sent. Allowed: photos, videos, PDF, text and Excel files.`
  if (file.size > MAX_BYTES) return `"${file.name}" is larger than 20 MB.`
  return null
}

const fullName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`.trim()
const personKey = (p: MentionablePerson) => `${p.type}:${p.id}`
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The "@query" being typed just before the caret (a name may contain one space), or null */
function mentionAt(value: string, caret: number): { query: string; start: number } | null {
  const match = value.slice(0, caret).match(/(?:^|\s)@([^\s@]*(?: [^\s@]*)?)$/)
  return match ? { query: match[1], start: caret - match[1].length - 1 } : null
}

interface Props {
  lead: LeadDetail
  /** Called after an admin closes or reopens the chat */
  onChatStatusChange: (closed: boolean) => void
}

/**
 * Chat for everyone who is or was on the lead. Polls for new messages; admins can close it.
 * Typing @ suggests people on the lead; whoever is mentioned gets a notification (and an email).
 */
export function LeadChat({ lead, onChatStatusChange }: Props) {
  const { user: me } = useAuth()
  const { notifications, markLeadRead } = useNotifications()
  const [searchParams] = useSearchParams()
  const [messages, setMessages] = useState<ChatMessage[] | null>(null)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [toggling, setToggling] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [people, setPeople] = useState<MentionablePerson[]>([])
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [flashId, setFlashId] = useState<number | null>(null)

  const listRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const lastId = useRef(0)
  const fileInput = useRef<HTMLInputElement>(null)
  const jumped = useRef(false)

  const canClose = !!me && LEAD_CHAT_CLOSE_ROLES.includes(me.role)
  const myName = me ? fullName(me).toLowerCase() : ''

  /** Matches "@First Last" for everyone on the lead (and me), longest names first so "Sam Sales" beats "Sam" */
  const mentionPattern = useMemo(() => {
    const names = [...people.map(fullName), ...(me ? [fullName(me)] : [])].filter(Boolean)
    if (names.length === 0) return null
    const alternatives = [...new Set(names)].sort((a, b) => b.length - a.length).map(escapeRegExp)
    return new RegExp(`@(${alternatives.join('|')})`, 'gi')
  }, [people, me])

  const mentionsMe = useCallback(
    (m: ChatMessage) => !!myName && m.message.toLowerCase().includes(`@${myName}`),
    [myName],
  )

  const suggestions = useMemo(() => {
    if (!mention) return []
    const q = mention.query.toLowerCase()
    return people
      .filter((p) => {
        const name = fullName(p).toLowerCase()
        return name.startsWith(q) || p.lastName.toLowerCase().startsWith(q) || name.includes(q)
      })
      .slice(0, MAX_SUGGESTIONS)
  }, [mention, people])
  const pickerOpen = suggestions.length > 0

  const addMessages = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return
    lastId.current = Math.max(lastId.current, ...incoming.map((m) => m.id))
    setMessages((prev) => {
      const seen = new Set((prev ?? []).map((m) => m.id))
      return [...(prev ?? []), ...incoming.filter((m) => !seen.has(m.id))]
    })
  }, [])

  // Started by the lead page in parallel with the lead itself (see chat-prefetch.ts)
  const firstLoad = useMemo(() => takeChatPrefetch(lead.id), [lead.id])

  // Opening the chat counts as seeing its mentions; only call the server when there are some
  const hasUnreadHere = notifications.some((n) => !n.read && n.leadId === lead.id)
  useEffect(() => {
    if (hasUnreadHere) void markLeadRead(lead.id).catch(() => undefined)
  }, [hasUnreadHere, lead.id, markLeadRead])

  // Who can be @mentioned; the chat still works if this fails
  useEffect(() => {
    let cancelled = false
    firstLoad.mentionable
      .then((res) => !cancelled && setPeople(res.people))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [firstLoad])

  // First load, then poll for anything newer than the last message we have
  useEffect(() => {
    let cancelled = false
    firstLoad.messages
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
        .then((res) => {
          if (cancelled) return
          addMessages(res.messages)
          // Mentioned while looking at this chat: no need to leave it unread in the bell
          if (res.messages.some(mentionsMe)) void markLeadRead(lead.id).catch(() => undefined)
        })
        .catch(() => undefined) // try again on the next tick
    }, POLL_MS)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [lead.id, firstLoad, addMessages, mentionsMe, markLeadRead])

  // Keep the newest message in view
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages?.length])

  // Coming from a notification (?message=<id>): show that message once and briefly highlight it
  useEffect(() => {
    const target = Number(searchParams.get('message'))
    if (jumped.current || !target || !messages?.length) return
    jumped.current = true
    document.getElementById(`chat-msg-${target}`)?.scrollIntoView({ block: 'center' })
    setFlashId(target)
    const timer = window.setTimeout(() => setFlashId(null), 2500)
    return () => window.clearTimeout(timer)
  }, [messages, searchParams])

  async function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const message = text.trim()
    if (!message && !file) return
    // Anyone whose "@First Last" is in the text, whether picked from the list or typed out
    const lower = message.toLowerCase()
    const mentions = people.filter((p) => lower.includes(`@${fullName(p).toLowerCase()}`)).map(personKey)
    setSending(true)
    setSendError('')
    try {
      const res = await leadsApi.sendMessage(lead.id, message, { file: file ?? undefined, mentions })
      addMessages([res.message])
      setText('')
      setFile(null)
      setMention(null)
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : 'Message not sent. Please try again.')
    } finally {
      setSending(false)
    }
  }

  /** Re-check for an "@query" whenever the text or the caret changes */
  function updateMention(el: HTMLTextAreaElement) {
    const next = mentionAt(el.value, el.selectionStart)
    setMention((prev) => (prev?.query === next?.query && prev?.start === next?.start ? prev : next))
    if (next?.query !== mention?.query) setActiveIndex(0)
  }

  /** Replace the "@query" with the full name and put the caret after it */
  function pickPerson(p: MentionablePerson) {
    const el = textRef.current
    if (!el || !mention) return
    const insert = `@${fullName(p)} `
    const next = text.slice(0, mention.start) + insert + text.slice(el.selectionStart)
    const caret = mention.start + insert.length
    setText(next)
    setMention(null)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(caret, caret)
    })
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (pickerOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const step = e.key === 'ArrowDown' ? 1 : -1
        setActiveIndex((i) => (i + step + suggestions.length) % suggestions.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        pickPerson(suggestions[Math.min(activeIndex, suggestions.length - 1)])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setMention(null)
        return
      }
    }
    // Enter sends, Shift+Enter adds a new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.currentTarget.form?.requestSubmit()
    }
  }

  /** Message text with every "@Name" of someone on the lead highlighted */
  function renderText(message: string): ReactNode {
    if (!mentionPattern) return message
    const parts: ReactNode[] = []
    let last = 0
    for (const match of message.matchAll(mentionPattern)) {
      const index = match.index ?? 0
      if (index > last) parts.push(message.slice(last, index))
      const isMe = match[1].toLowerCase() === myName
      parts.push(
        <span key={index} className={`chat-mention${isMe ? ' me' : ''}`}>
          {match[0]}
        </span>,
      )
      last = index + match[0].length
    }
    if (last < message.length) parts.push(message.slice(last))
    return parts
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
          <div className="state-box">No messages yet. Everyone on this lead, now or before, can chat here. Type @ to mention someone.</div>
        ) : (
          messages.map((m) => {
            const mine = m.senderType === me?.userType && m.user.id === me?.id
            const classes = ['chat-message', mine && 'mine', !mine && mentionsMe(m) && 'mentions-me', flashId === m.id && 'flash']
            return (
              <div key={m.id} id={`chat-msg-${m.id}`} className={classes.filter(Boolean).join(' ')}>
                {!mine && <span className="person-avatar small" aria-hidden="true">{initialsOf(m.user.firstName, m.user.lastName)}</span>}
                <div className="chat-bubble">
                  {!mine && (
                    <span className="chat-author">
                      {m.user.firstName} {m.user.lastName}
                      <span className="text-muted"> · {m.senderType === 'client' ? 'Client' : ROLE_BY_VALUE[m.user.role].label}</span>
                    </span>
                  )}
                  {m.attachment && <Attachment leadId={lead.id} messageId={m.id} attachment={m.attachment} />}
                  {m.message && <p>{renderText(m.message)}</p>}
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
          {pickerOpen && (
            <ul className="mention-picker" role="listbox" id="mention-picker" aria-label="People to mention">
              {suggestions.map((p, i) => (
                <li
                  key={personKey(p)}
                  id={`mention-${personKey(p)}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  className={i === activeIndex ? 'active' : undefined}
                  // mousedown + preventDefault keeps focus (and the caret) in the textarea
                  onMouseDown={(e) => {
                    e.preventDefault()
                    pickPerson(p)
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  <span className="person-avatar small" aria-hidden="true">{initialsOf(p.firstName, p.lastName)}</span>
                  <span className="mention-name">{fullName(p)}</span>
                  <span className="text-muted">{p.type === 'client' ? 'Client' : ROLE_BY_VALUE[p.role].label}</span>
                </li>
              ))}
            </ul>
          )}
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
            ref={textRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              updateMention(e.target)
            }}
            onSelect={(e) => updateMention(e.currentTarget)}
            onBlur={() => setMention(null)}
            onKeyDown={handleKeyDown}
            placeholder={file ? 'Add a caption (optional)…' : 'Write a message… Type @ to mention someone'}
            rows={2}
            maxLength={2000}
            aria-label="Message"
            role="combobox"
            aria-expanded={pickerOpen}
            aria-controls="mention-picker"
            aria-autocomplete="list"
            aria-activedescendant={pickerOpen ? `mention-${personKey(suggestions[Math.min(activeIndex, suggestions.length - 1)])}` : undefined}
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
  const Icon = /\.(xlsx?|csv)$/i.test(attachment.name) ? FileSpreadsheet : FileText
  return (
    <a href={leadsApi.attachmentUrl(leadId, messageId, true)} className="chat-file" download>
      <Icon size={20} aria-hidden="true" />
      <span className="chat-file-name">{attachment.name}</span>
      <span className="text-muted">{formatSize(attachment.size)}</span>
      <Download size={15} aria-hidden="true" />
    </a>
  )
}
