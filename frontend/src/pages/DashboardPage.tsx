import { CalendarDays, ChartColumn, Clock, type LucideIcon } from 'lucide-react'
import { useAuth } from '../context/auth-context'
import { DUMMY_LEADS } from '../data/dummy-leads'
import { PHASE_BY_STATUS, PHASES } from '../data/phases'
import './dashboard.css'

const DAY = 24 * 60 * 60 * 1000

function isToday(date: Date): boolean {
  return date.toDateString() === new Date().toDateString()
}

function withinDays(date: Date, days: number): boolean {
  return Date.now() - date.getTime() < days * DAY
}

const relativeFormat = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

function timeAgo(date: Date): string {
  const minutes = Math.round((date.getTime() - Date.now()) / 60000)
  if (Math.abs(minutes) < 60) return relativeFormat.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return relativeFormat.format(hours, 'hour')
  return relativeFormat.format(Math.round(hours / 24), 'day')
}

interface StatCardProps {
  label: string
  value: number
  caption: string
  icon: LucideIcon
  highlight?: boolean
}

function StatCard({ label, value, caption, icon: Icon, highlight }: StatCardProps) {
  return (
    <div className={`stat-card${highlight ? ' highlight' : ''}`}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-icon" aria-hidden="true">
          <Icon size={20} strokeWidth={1.8} />
        </span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-caption">{caption}</div>
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()

  // Dummy data for now: these will come from the leads API later
  const leads = DUMMY_LEADS
  const todayCount = leads.filter((l) => isToday(l.createdAt)).length
  const weekCount = leads.filter((l) => withinDays(l.createdAt, 7)).length
  const monthCount = leads.filter((l) => withinDays(l.createdAt, 30)).length

  const pipeline = PHASES.map((phase) => ({
    phase,
    count: leads.filter((l) => l.status === phase.status).length,
  }))
  const maxCount = Math.max(1, ...pipeline.map((p) => p.count))

  const recentLeads = [...leads].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 6)

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {user?.firstName} {user?.lastName}</p>
      </div>

      <section className="stats-grid" aria-label="Lead summary">
        <StatCard label="Today's leads" value={todayCount} caption="New leads received today" icon={Clock} highlight />
        <StatCard label="This week" value={weekCount} caption="Leads added in the last 7 days" icon={CalendarDays} />
        <StatCard label="This month" value={monthCount} caption="Leads added in the last 30 days" icon={ChartColumn} highlight />
      </section>

      <section className="dash-row">
        <div className="panel">
          <h2 className="panel-title">Pipeline by phase</h2>
          <ul className="pipeline">
            {pipeline.map(({ phase, count }) => (
              <li key={phase.status} className="pipeline-row">
                <span className="pipeline-label">{phase.label}</span>
                <span className="pipeline-track" aria-hidden="true">
                  <span className="pipeline-bar" style={{ width: `${(count / maxCount) * 100}%` }} />
                </span>
                <span className="pipeline-count">{count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel panel-dark">
          <h2 className="panel-title">Total active leads</h2>
          <div className="total-value">{leads.length}</div>
          <p className="total-caption">Across all phases</p>
          <div className="phase-chips">
            {pipeline.map(({ phase, count }) => (
              <span
                key={phase.status}
                className="phase-chip"
                style={{ background: phase.chipBg, color: phase.chipText }}
                title={`${phase.label}: ${count}`}
              >
                {phase.label.charAt(0)}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Recent leads</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Project</th>
                <th>Client</th>
                <th>Phase</th>
                <th>Assigned to</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {recentLeads.map((lead) => {
                const phase = PHASE_BY_STATUS[lead.status]
                return (
                  <tr key={lead.id}>
                    <td className="lead-id">#{lead.id}</td>
                    <td className="lead-project">{lead.projectName}</td>
                    <td>{lead.clientName}</td>
                    <td>
                      <span className="phase-badge" style={{ background: phase.chipBg, color: phase.chipText }}>
                        {phase.label}
                      </span>
                    </td>
                    <td>{lead.assignedTo}</td>
                    <td className="lead-updated">{timeAgo(lead.updatedAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
