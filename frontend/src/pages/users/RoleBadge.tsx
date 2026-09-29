import type { UserRole } from '../../api/auth'
import { ROLE_BY_VALUE } from '../../data/roles'

export function RoleBadge({ role }: { role: UserRole }) {
  const r = ROLE_BY_VALUE[role]
  return (
    <span className="badge" style={{ background: r.badgeBg, color: r.badgeText }}>
      {r.label}
    </span>
  )
}

export function StatusLabel({ active }: { active: boolean }) {
  return (
    <span className={`status-dot ${active ? 'status-active' : 'status-inactive'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}
