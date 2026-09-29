import { Pencil, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { clientsApi, type ClientRecord } from '../../api/clients'
import { useAuth } from '../../context/auth-context'
import { CLIENT_MANAGE_ROLES } from '../../data/roles'
import { formatDate, initialsOf } from '../../utils/format'

export function ClientsListPage() {
  const { user: me } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const flash = (location.state as { message?: string } | null)?.message

  const [clients, setClients] = useState<ClientRecord[] | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const canManage = !!me && CLIENT_MANAGE_ROLES.includes(me.role)

  useEffect(() => {
    let cancelled = false
    clientsApi
      .list()
      .then((res) => !cancelled && setClients(res.clients))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Unable to load clients.'))
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!clients) return []
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((c) =>
      [`${c.firstName} ${c.lastName}`, c.mobile, c.alternateMobile ?? '', c.email ?? '', c.address ?? ''].some((v) =>
        v.toLowerCase().includes(q),
      ),
    )
  }, [clients, search])

  return (
    <div className="entity-page">
      <div className="page-header-row">
        <div className="page-header">
          <h1>Clients</h1>
          <p>{clients ? `${clients.length} client${clients.length === 1 ? '' : 's'}` : 'People and companies you work with'}</p>
        </div>
        {canManage && (
          <Link to="/clients/new" className="btn btn-accent">
            <Plus size={18} aria-hidden="true" />
            Add client
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
              placeholder="Search by name, mobile, email or address"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search clients"
            />
          </label>
        </div>

        {error ? (
          <div className="state-box" role="alert">{error}</div>
        ) : clients === null ? (
          <div className="state-box">Loading clients…</div>
        ) : filtered.length === 0 ? (
          <div className="state-box">
            {clients.length === 0 ? (
              <>
                No clients yet.
                {canManage && <> <Link to="/clients/new" className="link">Add the first client</Link>.</>}
              </>
            ) : (
              'No clients match your search.'
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Address</th>
                  <th>Leads</th>
                  <th>Added</th>
                  {canManage && <th className="col-actions"><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="clickable" onClick={() => navigate(`/clients/${c.id}`)}>
                    <td>
                      <Link to={`/clients/${c.id}`} className="person-cell" onClick={(e) => e.stopPropagation()}>
                        <span className="person-avatar" aria-hidden="true">{initialsOf(c.firstName, c.lastName)}</span>
                        <span className="person-text">
                          <span className="person-name">{c.firstName} {c.lastName}</span>
                          {c.email && <span className="person-sub">{c.email}</span>}
                        </span>
                      </Link>
                    </td>
                    <td>{c.mobile}</td>
                    <td className="text-muted cell-truncate" title={c.address ?? undefined}>{c.address ?? '—'}</td>
                    <td>
                      <span className={`count-pill${c.leadCount === 0 ? ' zero' : ''}`}>{c.leadCount}</span>
                    </td>
                    <td className="text-muted">{formatDate(c.createdAt)}</td>
                    {canManage && (
                      <td className="col-actions">
                        <Link
                          to={`/clients/${c.id}/edit`}
                          className="icon-button"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Edit ${c.firstName} ${c.lastName}`}
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
