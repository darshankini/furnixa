import { ArrowRight } from 'lucide-react'
import type { LeadAssignment, LeadHistoryEntry, UserRef } from '../../api/leads'
import { ROLE_BY_VALUE } from '../../data/roles'
import { formatDateTime, initialsOf } from '../../utils/format'
import { PhaseBadge } from './PhaseBadge'

const name = (u: UserRef) => `${u.firstName} ${u.lastName}`

/** Everyone who is or was on the lead */
export function LeadTeam({ assignments }: { assignments: LeadAssignment[] }) {
  const active = assignments.filter((a) => a.isActive)
  const previous = assignments.filter((a) => !a.isActive)

  return (
    <section className="panel">
      <h2 className="panel-title">Team</h2>
      {assignments.length === 0 ? (
        <p className="text-muted">Nobody has been assigned yet.</p>
      ) : (
        <>
          <ul className="team-list">
            {active.map((a) => (
              <TeamMember key={a.user.id} assignment={a} />
            ))}
          </ul>
          {previous.length > 0 && (
            <>
              <h3 className="team-subtitle">Previously assigned</h3>
              <ul className="team-list previous">
                {previous.map((a) => (
                  <TeamMember key={a.user.id} assignment={a} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  )
}

function TeamMember({ assignment: a }: { assignment: LeadAssignment }) {
  return (
    <li className="team-member">
      <span className="person-avatar" aria-hidden="true">{initialsOf(a.user.firstName, a.user.lastName)}</span>
      <span className="person-text">
        <span className="person-name">
          {name(a.user)}
          {a.role === 'PRIMARY' && <span className="badge primary-badge">Owner</span>}
        </span>
        <span className="person-sub">
          {ROLE_BY_VALUE[a.user.role].label}
          {a.isActive
            ? ` · since ${formatDateTime(a.assignedAt)}`
            : ` · until ${formatDateTime(a.unassignedAt!)}`}
          {a.assignedBy && ` · by ${name(a.assignedBy)}`}
        </span>
      </span>
    </li>
  )
}

/** Phase changes and assignments, newest first */
export function LeadHistory({ history }: { history: LeadHistoryEntry[] }) {
  return (
    <section className="panel">
      <h2 className="panel-title">History</h2>
      {history.length === 0 ? (
        <p className="text-muted">No history yet.</p>
      ) : (
        <ol className="timeline">
          {history.map((h) => (
            <li key={h.id} className="timeline-item">
              <div className="timeline-head">
                {h.fromStatus && h.fromStatus !== h.toStatus ? (
                  <span className="timeline-phases">
                    <PhaseBadge status={h.fromStatus} />
                    <ArrowRight size={14} aria-label="to" />
                    <PhaseBadge status={h.toStatus} />
                  </span>
                ) : (
                  <PhaseBadge status={h.toStatus} />
                )}
                <time className="text-muted" dateTime={h.changedAt}>{formatDateTime(h.changedAt)}</time>
              </div>
              <p className="timeline-text">
                {h.assignedTo ? (
                  <>
                    <strong>{h.assignedBy ? name(h.assignedBy) : name(h.changedBy)}</strong> assigned{' '}
                    <strong>{name(h.assignedTo)}</strong>{' '}
                    <span className="text-muted">({ROLE_BY_VALUE[h.assignedTo.role].label})</span>
                  </>
                ) : h.fromStatus === null ? (
                  <>
                    <strong>{name(h.changedBy)}</strong> created the lead
                  </>
                ) : h.fromStatus !== h.toStatus ? (
                  <>
                    <strong>{name(h.changedBy)}</strong> moved the lead
                  </>
                ) : (
                  <>
                    <strong>{name(h.changedBy)}</strong> updated the team
                  </>
                )}
              </p>
              {h.note && h.note !== 'Lead created' && <p className="timeline-note">“{h.note}”</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
