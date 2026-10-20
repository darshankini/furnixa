import { CheckCircle2, Circle, PlayCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { leadsApi, type LeadDetail } from '../../api/leads'
import { isAtOrAfter, PRODUCTION_STAGES, type ProductionStage } from '../../data/phases'
import { formatDateTime } from '../../utils/format'

interface Props {
  lead: LeadDetail
  /** The user may manage the lead in its current phase (Production role, admins, managers) */
  canManage: boolean
  onSaved: (lead: LeadDetail) => void
}

/**
 * Workshop stages of the Production phase:
 * - hidden before the lead reaches Production
 * - the stage can be changed only while the lead is in Production
 * - read-only once the lead has moved past Production
 */
export function LeadProduction({ lead, canManage, onSaved }: Props) {
  const [stage, setStage] = useState<ProductionStage | ''>(lead.productionStage ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (!isAtOrAfter(lead.status, 'PRODUCTION')) return null

  const editable = canManage && lead.status === 'PRODUCTION'
  const currentIndex = PRODUCTION_STAGES.findIndex((s) => s.value === lead.productionStage)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!stage || stage === lead.productionStage) return
    setSaving(true)
    setError('')
    try {
      const res = await leadsApi.setProductionStage(lead.id, stage)
      onSaved(res.lead)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel">
      <h2 className="panel-title">Production stage</h2>
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {editable && (
        <form className="stage-picker" onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="production-stage">Current stage</label>
            <select
              id="production-stage"
              value={stage}
              onChange={(e) => setStage(e.target.value as ProductionStage)}
              disabled={saving}
            >
              <option value="" disabled>Select a stage</option>
              {PRODUCTION_STAGES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-accent" disabled={saving || !stage || stage === lead.productionStage}>
            {saving ? 'Saving…' : 'Update stage'}
          </button>
        </form>
      )}

      <ol className="stage-list">
        {PRODUCTION_STAGES.map((s, i) => {
          const state = currentIndex === -1 || i > currentIndex ? 'pending' : i === currentIndex ? 'current' : 'done'
          const Icon = state === 'done' ? CheckCircle2 : state === 'current' ? PlayCircle : Circle
          return (
            <li key={s.value} className={`stage-item ${state}`} aria-current={state === 'current' ? 'step' : undefined}>
              <Icon size={16} aria-hidden="true" />
              {s.label}
            </li>
          )
        })}
      </ol>

      <p className="stage-updated text-muted">
        {lead.productionStageUpdatedAt
          ? `Updated ${formatDateTime(lead.productionStageUpdatedAt)}${
              lead.productionStageUpdatedBy
                ? ` by ${lead.productionStageUpdatedBy.firstName} ${lead.productionStageUpdatedBy.lastName}`
                : ''
            }`
          : 'No stage selected yet.'}
      </p>
    </section>
  )
}
