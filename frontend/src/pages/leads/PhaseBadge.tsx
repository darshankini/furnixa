import { PHASE_BY_STATUS, type LeadStatus } from '../../data/phases'

export function PhaseBadge({ status }: { status: LeadStatus }) {
  const phase = PHASE_BY_STATUS[status]
  const Icon = phase.icon
  return (
    <span className="badge phase-pill" style={{ background: phase.chipBg, color: phase.chipText }}>
      <Icon size={13} strokeWidth={2.2} aria-hidden="true" />
      {phase.label}
    </span>
  )
}
