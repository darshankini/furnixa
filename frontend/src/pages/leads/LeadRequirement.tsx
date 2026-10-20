import { Pencil } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { leadsApi, type LeadDetail } from '../../api/leads'
import { REQUIREMENT_MAX } from './LeadForm'

interface Props {
  lead: LeadDetail
  /** Shows the pencil icon; the backend checks the same rule (getManageable) */
  canEdit: boolean
  onSaved: (lead: LeadDetail) => void
}

/** Read-only text with a pencil icon; clicking it turns the text into a textarea with Save / Cancel */
export function LeadRequirement({ lead, canEdit, onSaved }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function startEditing() {
    setValue(lead.requirement ?? '')
    setError('')
    setEditing(true)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (value.trim().length > REQUIREMENT_MAX) {
      setError(`Requirement must be ${REQUIREMENT_MAX} characters or fewer.`)
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await leadsApi.update(lead.id, { requirement: value.trim() || null })
      onSaved(res.lead)
      setEditing(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel">
      <div className="panel-title-row">
        <h2 className="panel-title">Lead requirement</h2>
        {canEdit && !editing && (
          <button type="button" className="btn btn-outline" onClick={startEditing} aria-label="Edit lead requirement">
            <Pencil size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSubmit} noValidate>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <div className="form-field">
            <textarea
              aria-label="Lead requirement"
              rows={5}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={saving}
              placeholder={'e.g.\n32 x 34 – 20 tables\n21 x 20 – 10 chairs'}
              autoFocus
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-accent" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      ) : lead.requirement ? (
        <p className="requirement-text">{lead.requirement}</p>
      ) : (
        <p className="text-muted">No requirement added yet.</p>
      )}
    </section>
  )
}
