import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { leadsApi, type LeadDetail, type UserRef } from '../../api/leads'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useAuth } from '../../context/auth-context'
import { PHASES, type LeadStatus } from '../../data/phases'
import { LEAD_COMPLETE_ROLES, LEAD_MANAGE_ROLES_BY_PHASE, ROLE_BY_VALUE } from '../../data/roles'
import { addDays, todayDay } from '../../utils/format'
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
  const { user: me } = useAuth()
  // Completed: admins and managers only, once the quotation amount is fully paid (the backend checks both)
  const canComplete = !!me && LEAD_COMPLETE_ROLES.includes(me.role)
  const phases = PHASES.filter((p) => p.status !== 'COMPLETED' || canComplete || lead.status === 'COMPLETED')
  const [users, setUsers] = useState<UserRef[] | null>(null)
  const [status, setStatus] = useState<LeadStatus>(lead.status)
  const [selected, setSelected] = useState<number[]>(lead.assignees.map((a) => a.id))
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Moving into Quotation first asks for the quotation amount and the project dates in a popup.
  // Dates default to today and a week later (or what the lead had, if it was in Quotation before).
  const [amountOpen, setAmountOpen] = useState(false)
  const [amount, setAmount] = useState(lead.quotationAmount ?? '')
  const [amountError, setAmountError] = useState('')
  const [confirmedOn, setConfirmedOn] = useState(() => lead.projectConfirmedOn ?? todayDay())
  const [completionOn, setCompletionOn] = useState(() => lead.projectCompletionOn ?? addDays(lead.projectConfirmedOn ?? todayDay(), 7))
  // Once the completion date is picked by hand, changing the confirmation date no longer moves it
  const [completionTouched, setCompletionTouched] = useState(lead.projectCompletionOn !== null)

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
  const movingToQuotation = status === 'QUOTATION' && lead.status !== 'QUOTATION'

  // Moving to another phase hands the lead to that phase's department: at least one of its people must be
  // ticked (same rule as LeadsService.assign). Admins and managers don't count. Completed has no department.
  const phaseRoles = status !== lead.status ? LEAD_MANAGE_ROLES_BY_PHASE[status] : []
  const phaseRoleNames = phaseRoles.map((r) => ROLE_BY_VALUE[r].label).join(' or ')
  const phaseLabel = PHASES.find((p) => p.status === status)?.label ?? status
  const hasPhaseUser = phaseRoles.length === 0 || (users ?? []).some((u) => selected.includes(u.id) && phaseRoles.includes(u.role))
  const phaseHasNobody = phaseRoles.length > 0 && users !== null && !users.some((u) => phaseRoles.includes(u.role))

  async function save(quotation?: { amount: number; confirmedOn: string; completionOn: string }) {
    const quotationAmount = quotation?.amount
    setSaving(true)
    setError('')
    setAmountError('')
    try {
      const res = await leadsApi.assign(lead.id, {
        status: status !== lead.status ? status : undefined,
        userIds: selected,
        note: note.trim() || null,
        quotationAmount,
        projectConfirmedOn: quotation?.confirmedOn,
        projectCompletionOn: quotation?.completionOn,
      })
      onSaved(res.lead)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.'
      // Keep the error next to the amount while the popup is open
      if (quotationAmount !== undefined) setAmountError(message)
      else setError(message)
      setSaving(false)
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (unchanged || !hasPhaseUser) return
    if (movingToQuotation) {
      setAmountError('')
      setAmountOpen(true)
      return
    }
    void save()
  }

  function changeConfirmedOn(day: string) {
    setConfirmedOn(day)
    setAmountError('')
    if (!completionTouched && day) setCompletionOn(addDays(day, 7))
  }

  /** Same rules as AssignLeadDto.quotationAmount and the project dates */
  function confirmAmount() {
    const text = amount.trim()
    const value = Number(text)
    if (!text || !Number.isFinite(value)) return setAmountError('Please enter the quotation amount.')
    if (value < 1) return setAmountError('Quotation amount must be more than 0.')
    if (!/^\d+(\.\d{1,2})?$/.test(text)) return setAmountError('Use digits only, with at most 2 decimals.')
    if (value > 9_999_999_999.99) return setAmountError('Quotation amount is too large.')
    if (!confirmedOn) return setAmountError('Please choose the project confirmation date.')
    if (!completionOn) return setAmountError('Please choose the project completion date.')
    if (completionOn < confirmedOn) return setAmountError('The completion date cannot be before the confirmation date.')
    void save({ amount: value, confirmedOn, completionOn })
  }

  return (
    <form className="panel" onSubmit={handleSubmit} noValidate>
      <h2 className="panel-title">Assign &amp; move phase</h2>
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="assign-status">Phase</label>
          <select id="assign-status" value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)} disabled={saving}>
            {phases.map((p) => {
              const blocked = p.status === 'COMPLETED' && lead.status !== 'COMPLETED' && !lead.isFullyPaid
              return (
                <option key={p.status} value={p.status} disabled={blocked}>
                  {p.label}
                  {p.status === lead.status ? ' (current)' : blocked ? ' (needs full payment)' : ''}
                </option>
              )
            })}
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
          {!hasPhaseUser && users !== null && (
            <p className="field-error" role="alert">
              {phaseHasNobody
                ? `There are no active ${phaseRoleNames} users yet. Add one on the Users page before moving the lead to ${phaseLabel}.`
                : `Tick at least one ${phaseRoleNames} user to move the lead to ${phaseLabel}.`}
            </p>
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
        <button type="submit" className="btn btn-accent" disabled={saving || unchanged || !hasPhaseUser || users === null}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <ConfirmDialog
        open={amountOpen}
        title="Quotation amount"
        confirmLabel="Move to Quotation"
        busyLabel="Saving…"
        busy={saving}
        error={amountError}
        onCancel={() => setAmountOpen(false)}
        onConfirm={confirmAmount}
      >
        <p>Enter the total quoted to the client and the project dates. Payments are tracked against this amount.</p>
        <div className="form-field">
          <label htmlFor="quotation-amount">Amount (₹)<span className="required">*</span></label>
          <input
            id="quotation-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              setAmountError('')
            }}
            onKeyDown={(e) => {
              // The dialog sits inside the assign form, so Enter must not submit that form
              if (e.key === 'Enter') {
                e.preventDefault()
                confirmAmount()
              }
            }}
            placeholder="e.g. 100000"
            disabled={saving}
            autoFocus
          />
        </div>
        <div
          className="quotation-dates"
          onKeyDown={(e) => {
            // Same as the amount: Enter confirms the popup instead of submitting the assign form
            if (e.key === 'Enter') {
              e.preventDefault()
              confirmAmount()
            }
          }}
        >
          <div className="form-field">
            <label htmlFor="project-confirmed-on">Project confirmation date<span className="required">*</span></label>
            <input
              id="project-confirmed-on"
              type="date"
              value={confirmedOn}
              onChange={(e) => changeConfirmedOn(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="form-field">
            <label htmlFor="project-completion-on">Project completion date<span className="required">*</span></label>
            <input
              id="project-completion-on"
              type="date"
              value={completionOn}
              min={confirmedOn || undefined}
              onChange={(e) => {
                setCompletionOn(e.target.value)
                setCompletionTouched(true)
                setAmountError('')
              }}
              disabled={saving}
            />
          </div>
        </div>
        <p className="field-hint">The completion date starts 7 days after confirmation; change either date if needed.</p>
      </ConfirmDialog>
    </form>
  )
}
