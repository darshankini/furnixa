import { MessageSquareOff, Pencil, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { leadsApi, type LeadSummary } from '../../api/leads'
import { useAuth } from '../../context/auth-context'
import { PHASES, type LeadStatus } from '../../data/phases'
import { LEAD_CREATE_ROLES, LEAD_MANAGE_ROLES } from '../../data/roles'
import { formatDate, initialsOf } from '../../utils/format'
import { PhaseBadge } from './PhaseBadge'

/** /leads shows every phase; /phases/:phase shows one */
export function LeadsListPage() {
  const { phase: slug } = useParams()
  const phase = slug ? PHASES.find((p) => p.slug === slug) : undefined
  // key: reload when switching between phase pages
  return <LeadsList key={slug ?? 'all'} fixedStatus={phase?.status} title={phase ? `${phase.label} leads` : 'All Leads'} unknownPhase={!!slug && !phase} />
}

function LeadsList({ fixedStatus, title, unknownPhase }: { fixedStatus?: LeadStatus; title: string; unknownPhase: boolean }) {
  const { user: me } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const flash = (location.state as { message?: string } | null)?.message

  const [leads, setLeads] = useState<LeadSummary[] | null>(null)
  const [error, setError] = useState(unknownPhase ? 'Unknown phase.' : '')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('')

  const canCreate = !!me && LEAD_CREATE_ROLES.includes(me.role)
  const canManage = !!me && LEAD_MANAGE_ROLES.includes(me.role)

  useEffect(() => {
    if (unknownPhase) return
    let cancelled = false
    leadsApi
      .list({ status: fixedStatus })
      .then((res) => !cancelled && setLeads(res.leads))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Unable to load leads.'))
    return () => {
      cancelled = true
    }
  }, [fixedStatus, unknownPhase])

  const filtered = useMemo(() => {
    if (!leads) return []
    const q = search.trim().toLowerCase()
    return leads.filter((l) => {
      if (statusFilter && l.status !== statusFilter) return false
      if (!q) return true
      return [
        l.projectName,
        `#${l.id}`,
        `${l.client.firstName} ${l.client.lastName}`,
        l.client.mobile,
        ...l.assignees.map((a) => `${a.firstName} ${a.lastName}`),
      ].some((v) => v.toLowerCase().includes(q))
    })
  }, [leads, search, statusFilter])

  return (
    <div className="entity-page">
      <div className="page-header-row">
        <div className="page-header">
          <h1>{title}</h1>
          <p>{leads ? `${leads.length} lead${leads.length === 1 ? '' : 's'}` : 'Projects moving through your workflow'}</p>
        </div>
        {canCreate && (
          <Link to="/leads/new" className="btn btn-accent">
            <Plus size={18} aria-hidden="true" />
            New lead
          </Link>
        )}
      </div>

      {flash && <div className="alert alert-success">{flash}</div>}

      <section className="panel">
        <div className="list-toolbar">
          <label className="search-box">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              placeholder="Search by project, client, mobile or assignee"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search leads"
            />
          </label>
          {!fixedStatus && (
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LeadStatus | '')}
              aria-label="Filter by phase"
            >
              <option value="">All phases</option>
              {PHASES.map((p) => (
                <option key={p.status} value={p.status}>{p.label}</option>
              ))}
            </select>
          )}
        </div>

        {error ? (
          <div className="state-box" role="alert">{error}</div>
        ) : leads === null ? (
          <div className="state-box">Loading leads…</div>
        ) : filtered.length === 0 ? (
          <div className="state-box">
            {leads.length === 0 ? (
              <>
                No leads yet.
                {canCreate && <> <Link to="/leads/new" className="link">Create the first lead</Link>.</>}
              </>
            ) : (
              'No leads match your search.'
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Client</th>
                  <th>Phase</th>
                  <th>Assigned to</th>
                  <th>Updated</th>
                  {canManage && <th className="col-actions"><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="clickable" onClick={() => navigate(`/leads/${l.id}`)}>
                    <td>
                      <Link to={`/leads/${l.id}`} className="person-cell" onClick={(e) => e.stopPropagation()}>
                        <span className="person-text">
                          <span className="person-name">{l.projectName}</span>
                          <span className="person-sub">
                            Lead #{l.id}
                            {l.chatClosed && (
                              <span className="chat-closed-hint" title="Chat closed">
                                <MessageSquareOff size={13} aria-label="Chat closed" />
                              </span>
                            )}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <span className="person-text">
                        <span>{l.client.firstName} {l.client.lastName}</span>
                        <span className="person-sub">{l.client.mobile}</span>
                      </span>
                    </td>
                    <td><PhaseBadge status={l.status} /></td>
                    <td>
                      {l.assignees.length === 0 ? (
                        <span className="text-muted">Unassigned</span>
                      ) : (
                        <span className="avatar-stack" title={l.assignees.map((a) => `${a.firstName} ${a.lastName}`).join(', ')}>
                          {l.assignees.slice(0, 3).map((a) => (
                            <span key={a.id} className="person-avatar small">{initialsOf(a.firstName, a.lastName)}</span>
                          ))}
                          <span className="avatar-stack-text">
                            {l.assignees[0].firstName} {l.assignees[0].lastName}
                            {l.assignees.length > 1 && ` +${l.assignees.length - 1}`}
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="text-muted">{formatDate(l.updatedAt)}</td>
                    {canManage && (
                      <td className="col-actions">
                        <Link
                          to={`/leads/${l.id}/edit`}
                          className="icon-button"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Edit ${l.projectName}`}
                          title="Edit"
                        >
                          <Pencil size={16} aria-hidden="true" />
                        </Link>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
