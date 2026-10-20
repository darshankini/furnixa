import { ArrowLeft, ExternalLink } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { PAYMENT_MODES, paymentsApi, type LeadPayments, type PaymentMode } from '../../api/payments'
import { formatDate, formatDateTime, formatMoney } from '../../utils/format'
import { PhaseBadge } from '../leads/PhaseBadge'
import { MoneyTiles } from './MoneyTiles'

const MODE_LABEL = Object.fromEntries(PAYMENT_MODES.map((m) => [m.value, m.label])) as Record<PaymentMode, string>

/** Today in the browser's calendar, as YYYY-MM-DD (en-CA formats dates that way) */
const todayIso = () => new Date().toLocaleDateString('en-CA')

export function LeadPaymentsPage() {
  const { leadId } = useParams()
  // key: remount when the id in the URL changes, so old data never shows for another lead
  return <LeadPaymentsView key={leadId} leadId={Number(leadId)} />
}

function LeadPaymentsView({ leadId }: { leadId: number }) {
  const [lead, setLead] = useState<LeadPayments | null>(null)
  const [error, setError] = useState(Number.isInteger(leadId) && leadId > 0 ? '' : 'Lead not found.')
  const [flash, setFlash] = useState('')

  useEffect(() => {
    if (!Number.isInteger(leadId) || leadId <= 0) return
    let cancelled = false
    paymentsApi
      .forLead(leadId)
      .then((res) => !cancelled && setLead(res.lead))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Unable to load payments.'))
    return () => {
      cancelled = true
    }
  }, [leadId])

  const due = lead ? Number(lead.balanceAmount) > 0 : false

  return (
    <div className="entity-page">
      <Link to="/payments" className="back-link">
        <ArrowLeft size={16} aria-hidden="true" /> Back to payment follow-up
      </Link>

      {error ? (
        <div className="panel state-box" role="alert">{error}</div>
      ) : !lead ? (
        <div className="panel state-box">Loading…</div>
      ) : (
        <>
          <div className="page-header-row">
            <div className="page-header">
              <h1>{lead.projectName}</h1>
              <p className="profile-meta">
                <span>Lead #{lead.leadId}</span>
                <PhaseBadge status={lead.status} />
                <span>
                  {lead.client.firstName} {lead.client.lastName} · {lead.client.mobile}
                </span>
              </p>
            </div>
            <Link to={`/leads/${lead.leadId}`} className="btn btn-outline">
              <ExternalLink size={16} aria-hidden="true" />
              Open lead
            </Link>
          </div>

          {flash && <div className="alert alert-success">{flash}</div>}

          <MoneyTiles total={lead.totalAmount} paid={lead.paidAmount} balance={lead.balanceAmount} />

          <div className="payment-layout">
            {due ? (
              <AddPaymentForm
                lead={lead}
                onSaved={(updated, message) => {
                  setLead(updated)
                  setFlash(message)
                }}
              />
            ) : (
              <section className="panel">
                <h2 className="panel-title">Add payment</h2>
                <p className="text-muted">This lead is fully paid. Nothing is left to collect.</p>
              </section>
            )}

            <section className="panel">
              <h2 className="panel-title">Payments</h2>
              {lead.payments.length === 0 ? (
                <div className="state-box">No payments recorded yet.</div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th className="money">Amount</th>
                        <th>Mode</th>
                        <th>Note</th>
                        <th>Recorded by</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lead.payments.map((p) => (
                        <tr key={p.id}>
                          <td>{formatDate(p.paidOn)}</td>
                          <td className="money">{formatMoney(p.amount)}</td>
                          <td>{MODE_LABEL[p.mode]}</td>
                          <td className="text-muted cell-truncate" title={p.note ?? undefined}>{p.note ?? '—'}</td>
                          <td className="text-muted" title={formatDateTime(p.createdAt)}>
                            {p.createdBy.firstName} {p.createdBy.lastName}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}

type FieldErrors = Partial<Record<'amount' | 'mode' | 'paidOn', string>>

function AddPaymentForm({ lead, onSaved }: { lead: LeadPayments; onSaved: (lead: LeadPayments, message: string) => void }) {
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState<PaymentMode | ''>('')
  const [paidOn, setPaidOn] = useState(todayIso)
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  /** Same rules as the backend CreatePaymentDto and PaymentsService.create */
  function validate(): FieldErrors {
    const e: FieldErrors = {}
    const text = amount.trim()
    if (!text) e.amount = 'Please enter the amount.'
    else if (!/^\d+(\.\d{1,2})?$/.test(text)) e.amount = 'Use digits only, with at most 2 decimals.'
    else if (Number(text) <= 0) e.amount = 'Amount must be more than 0.'
    else if (Math.round(Number(text) * 100) > Math.round(Number(lead.balanceAmount) * 100))
      e.amount = `Amount is more than the balance due (${formatMoney(lead.balanceAmount)}).`
    if (!mode) e.mode = 'Please choose the payment mode.'
    if (!paidOn) e.paidOn = 'Please enter the payment date.'
    else if (paidOn > todayIso()) e.paidOn = 'Payment date cannot be in the future.'
    return e
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError('')
    const found = validate()
    setErrors(found)
    const firstInvalid = Object.keys(found)[0]
    if (firstInvalid) {
      document.getElementById(`payment-${firstInvalid}`)?.focus()
      return
    }

    setSaving(true)
    try {
      const value = Number(amount.trim())
      const res = await paymentsApi.create(lead.leadId, {
        amount: value,
        mode: mode as PaymentMode,
        paidOn,
        note: note.trim() || null,
      })
      onSaved(res.lead, `Payment of ${formatMoney(value)} recorded.`)
      setAmount('')
      setMode('')
      setPaidOn(todayIso())
      setNote('')
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const fieldError = (name: keyof FieldErrors) =>
    errors[name] && <p id={`payment-${name}-error`} className="field-error">{errors[name]}</p>
  const errorProps = (name: keyof FieldErrors) => ({
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `payment-${name}-error` : undefined,
  })

  return (
    <form className="panel payment-form" onSubmit={handleSubmit} noValidate>
      <h2 className="panel-title">Add payment</h2>
      {formError && <div className="alert alert-error" role="alert">{formError}</div>}

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="payment-amount">Amount (₹)<span className="required">*</span></label>
          <input
            id="payment-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              setErrors((prev) => ({ ...prev, amount: undefined }))
            }}
            placeholder={`Up to ${formatMoney(lead.balanceAmount)}`}
            disabled={saving}
            {...errorProps('amount')}
          />
          {fieldError('amount')}
        </div>

        <div className="form-field">
          <label htmlFor="payment-mode">Payment mode<span className="required">*</span></label>
          <select
            id="payment-mode"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as PaymentMode)
              setErrors((prev) => ({ ...prev, mode: undefined }))
            }}
            disabled={saving}
            {...errorProps('mode')}
          >
            <option value="">Select mode</option>
            {PAYMENT_MODES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          {fieldError('mode')}
        </div>

        <div className="form-field">
          <label htmlFor="payment-paidOn">Payment date<span className="required">*</span></label>
          <input
            id="payment-paidOn"
            type="date"
            value={paidOn}
            max={todayIso()}
            onChange={(e) => {
              setPaidOn(e.target.value)
              setErrors((prev) => ({ ...prev, paidOn: undefined }))
            }}
            disabled={saving}
            {...errorProps('paidOn')}
          />
          {fieldError('paidOn')}
        </div>

        <div className="form-field">
          <label htmlFor="payment-note">Note <span className="section-note">(optional)</span></label>
          <input
            id="payment-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="e.g. Cheque no. 123456"
            disabled={saving}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-accent" disabled={saving}>
          {saving ? 'Saving…' : 'Add payment'}
        </button>
      </div>
    </form>
  )
}
