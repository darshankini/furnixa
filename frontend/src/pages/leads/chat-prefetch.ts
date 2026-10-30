import { leadsApi, type ChatMessage, type MentionablePerson } from '../../api/leads'

interface ChatPrefetch {
  messages: Promise<{ messages: ChatMessage[] }>
  mentionable: Promise<{ people: MentionablePerson[] }>
  startedAt: number
}

/** Long enough for the lead to load and the chat to mount; anything newer comes in through the chat's polling */
const FRESH_MS = 5000

const pending = new Map<number, ChatPrefetch>()

function start(leadId: number): ChatPrefetch {
  const entry: ChatPrefetch = {
    messages: leadsApi.messages(leadId),
    mentionable: leadsApi.mentionable(leadId),
    startedAt: Date.now(),
  }
  // The chat handles errors when it uses the promises; this only stops "unhandled rejection" noise
  entry.messages.catch(() => undefined)
  entry.mentionable.catch(() => undefined)
  return entry
}

/**
 * Starts the chat's first requests right away, in parallel with the lead itself.
 * The chat panel only mounts once the lead has loaded, so without this its requests would wait for it.
 */
export function prefetchChat(leadId: number): void {
  const existing = pending.get(leadId)
  if (existing && Date.now() - existing.startedAt < FRESH_MS) return
  pending.set(leadId, start(leadId))
}

/**
 * The prefetched requests if they are recent, otherwise fresh ones. Not single-use: React may run
 * the caller twice in development (StrictMode), and both runs should share the same requests.
 */
export function takeChatPrefetch(leadId: number): ChatPrefetch {
  const existing = pending.get(leadId)
  if (existing && Date.now() - existing.startedAt < FRESH_MS) return existing
  const entry = start(leadId)
  pending.set(leadId, entry)
  return entry
}
