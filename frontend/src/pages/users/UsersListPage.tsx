import { Pencil, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { UserRole } from '../../api/auth'
import { ApiError } from '../../api/client'
import { usersApi, type UserRecord } from '../../api/users'
import { useAuth } from '../../context/auth-context'
import { ROLES, USER_CREATE_ROLES, USER_EDIT_ROLES } from '../../data/roles'
import { formatDate, initialsOf } from '../../utils/format'
import { RoleBadge, StatusLabel } from './RoleBadge'

export function UsersListPage() {
  const { user: me } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const flash = (location.state as { message?: string } | null)?.message

  const [users, setUsers] = useState<UserRecord[] | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('')

  const canCreate = !!me && USER_CREATE_ROLES.includes(me.role)
  const canEdit = !!me && USER_EDIT_ROLES.includes(me.role)

  useEffect(() => {
    let cancelled = false
    usersApi
      .list()
      .then((res) => !cancelled && setUsers(res.users))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Unable to load users.'))
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!users) return []
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false
      if (!q) return true
      return [`${u.firstName} ${u.lastName}`, u.email, u.mobile ?? ''].some((v) => v.toLowerCase().includes(q))
    })
  }, [users, search, roleFilter])

  return (
    <div className="entity-page">
      <div className="page-header-row">
        <div className="page-header">
          <h1>Users</h1>
          <p>{users ? `${users.length} team member${users.length === 1 ? '' : 's'}` : 'Team members who can sign in'}</p>
        </div>
        {canCreate && (
          <Link to="/users/new" className="btn btn-accent">
            <Plus size={18} aria-hidden="true" />
            Add user
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
              placeholder="Search by name, email or mobile"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search users"
            />
          </label>
          <select
            className="filter-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
            aria-label="Filter by role"
          >
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {error ? (
          <div className="state-box" role="alert">{error}</div>
        ) : users === null ? (
          <div className="state-box">Loading users…</div>
        ) : filtered.length === 0 ? (
          <div className="state-box">{users.length === 0 ? 'No users yet.' : 'No users match your search.'}</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  {canEdit && <th className="col-actions"><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="clickable" onClick={() => navigate(`/users/${u.id}`)}>
                    <td>
                      <Link to={`/users/${u.id}`} className="person-cell" onClick={(e) => e.stopPropagation()}>
                        <span className="person-avatar" aria-hidden="true">{initialsOf(u.firstName, u.lastName)}</span>
                        <span className="person-text">
                          <span className="person-name">{u.firstName} {u.lastName}</span>
                          <span className="person-sub">{u.email}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="text-muted">{u.mobile ?? '—'}</td>
                    <td><RoleBadge role={u.role} /></td>
                    <td><StatusLabel active={u.isActive} /></td>
                    <td className="text-muted">{formatDate(u.createdAt)}</td>
                    {canEdit && (
                      <td className="col-actions">
                        <Link
                          to={`/users/${u.id}/edit`}
                          className="icon-button"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Edit ${u.firstName} ${u.lastName}`}
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
