import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { leadsApi, type LeadDetail, type UserRef } from '../../api/leads'
import { PHASES, type LeadStatus } from '../../data/phases'
import { UserPicker } from './UserPicker'

interface Props {
  lead: LeadDetail
  onCancel: () => void
  onSaved: (lead: LeadDetail) => void
}

/**
 * Move the lead to a phase and choose who works on it now.
 * The selection starts as the current team; unticking someone takes them off the lead
 * (they stay in the history and can still use the chat).
 */
export function LeadAssignPanel({ lead, onCancel, onSaved }: Props) {
  const [users, setUsers] = useState<UserRef[] | null>(null)
  const [status, setStatus] = useState<LeadStatus>(lead.status)
  const [selected, setSelected] = useState<number[]>(lead.assignees.map((a) => a.id))
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    leadsApi
      .assignableUsers()
      .then((res) => !cancelled && setUsers(res.users))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Unable to load users.'))
    return () => {
      cancelled = true
    }
  }, [])

  const current = new Set(lead.assignees.map((a) => a.id))
  const adding = selected.filter((id) => !current.has(id)).length
  const removing = [...current].filter((id) => !selected.includes(id)).length
  const unchanged = adding === 0 && removing === 0 && status === lead.status

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (unchanged) return
    setSaving(true)
    setError('')
    try {
      const res = await leadsApi.assign(lead.id, {
        status: status !== lead.status ? status : undefined,
        userIds: selected,
        note: note.trim() || null,
      })
      onSaved(res.lead)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.')
      setSaving(false)
    }
  }

  return (
    <form className="panel" onSubmit={handleSubmit} noValidate>
      <h2 className="panel-title">Assign &amp; move phase</h2>
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="assign-status">Phase</label>
          <select id="assign-status" value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)} disabled={saving}>
            {PHASES.map((p) => (
              <option key={p.status} value={p.status}>
                {p.label}{p.status === lead.status ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field" style={{ gridColumn: 'span 2' }}>
          <label htmlFor="assign-note">Note</label>
          <input
            id="assign-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="Optional, e.g. “Quotation approved, please start the design”"
            disabled={saving}
          />
        </div>

        <div className="form-field span-2">
          <label htmlFor="assign-users">Who works on this lead now</label>
          {users === null ? (
            <p className="text-muted">Loading users…</p>
          ) : (
            <UserPicker id="assign-users" users={users} selected={selected} onChange={setSelected} disabled={saving} />
          )}
          <p className="field-hint">
            Tick several people to share the work (e.g. more than one designer). Anyone you untick is taken off the
            lead but keeps access to its chat.
          </p>
        </div>
      </div>

      <div className="form-actions">
        <span className="text-muted assign-summary">
          {unchanged
            ? 'No changes yet'
            : [
                status !== lead.status && 'phase change',
                adding > 0 && `${adding} to add`,
                removing > 0 && `${removing} to remove`,
              ]
                .filter(Boolean)
                .join(' · ')}
        </span>
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-accent" disabled={saving || unchanged}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
