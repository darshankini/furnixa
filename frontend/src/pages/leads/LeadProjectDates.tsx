import { CalendarCheck, CalendarClock, Pencil } from 'lucide-react'
import { useState } from 'react'
import { ApiError } from '../../api/client'
import { leadsApi, type LeadDetail } from '../../api/leads'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { formatDay } from '../../utils/format'

interface Props {
  lead: LeadDetail
  /** Staff who can see the lead; clients only read the dates */
  canChange: boolean
  onSaved: (lead: LeadDetail) => void
}

/**
 * Project confirmation and completion dates (set when the lead moved into Quotation).
 * The completion date can be moved with a reason, which goes into the lead history.
 */
export function LeadProjectDates({ lead, canChange, onSaved }: Props) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const { projectConfirmedOn: confirmedOn, projectCompletionOn: completionOn } = lead
  if (!confirmedOn || !completionOn) return null

  function start() {
    setDate(completionOn ?? '')
    setReason('')
    setError('')
    setOpen(true)
  }

  /** Same rules as SetCompletionDateDto and LeadsService.setCompletionDate */
  async function save() {
    const why = reason.trim()
    if (!date) return setError('Please choose the new completion date.')
    if (confirmedOn && date < confirmedOn) return setError('The completion date cannot be before the confirmation date.')
    if (date === completionOn) return setError('Choose a different date: this is already the completion date.')
    if (why.length < 3) return setError('Please give a reason for changing the date.')

    setSaving(true)
    setError('')
    try {
      const res = await leadsApi.setCompletionDate(lead.id, date, why)
      onSaved(res.lead)
      setOpen(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="project-dates">
      <span>
        <CalendarCheck size={15} aria-hidden="true" />
        Confirmed <strong>{formatDay(confirmedOn)}</strong>
      </span>
      <span>
        <CalendarClock size={15} aria-hidden="true" />
        Completion <strong>{formatDay(completionOn)}</strong>
      </span>
      {canChange && (
        <button type="button" className="link-button" onClick={start}>
          <Pencil size={13} aria-hidden="true" />
          Change completion date
        </button>
      )}

      <ConfirmDialog
        open={open}
        title="Change completion date"
        confirmLabel="Save date"
        busyLabel="Saving…"
        busy={saving}
        error={error}
        onCancel={() => setOpen(false)}
        onConfirm={() => void save()}
      >
        <p>
          Currently {formatDay(completionOn)}. The old date, the new date and your reason are saved in the lead
          history.
        </p>
        <div className="form-field">
          <label htmlFor="completion-date">New completion date<span className="required">*</span></label>
          <input
            id="completion-date"
            type="date"
            value={date}
            min={confirmedOn}
            onChange={(e) => {
              setDate(e.target.value)
              setError('')
            }}
            disabled={saving}
          />
        </div>
        <div className="form-field">
          <label htmlFor="completion-reason">Reason<span className="required">*</span></label>
          <textarea
            id="completion-reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              setError('')
            }}
            maxLength={500}
            rows={3}
            placeholder="e.g. Client asked for extra cabinets, needs one more week"
            disabled={saving}
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}
