import { ArrowLeft, Mail, Pencil, Phone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { usersApi, type UserRecord } from '../../api/users'
import { useAuth } from '../../context/auth-context'
import { USER_EDIT_ROLES } from '../../data/roles'
import { formatDateTime, initialsOf } from '../../utils/format'
import { RoleBadge, StatusLabel } from './RoleBadge'

export function UserDetailPage() {
  const { id } = useParams()
  // key: remount when the id in the URL changes, so old data never shows for a new user
  return <UserDetail key={id} id={Number(id)} />
}

function UserDetail({ id }: { id: number }) {
  const { user: me } = useAuth()
  const location = useLocation()
  const flash = (location.state as { message?: string } | null)?.message
  const canEdit = !!me && USER_EDIT_ROLES.includes(me.role)

  const [user, setUser] = useState<UserRecord | null>(null)
  const [error, setError] = useState(Number.isInteger(id) && id > 0 ? '' : 'User not found.')

  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0) return
    let cancelled = false
    usersApi
      .get(id)
      .then((res) => !cancelled && setUser(res.user))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Unable to load this user.'))
    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <div className="entity-page">
      <Link to="/users" className="back-link">
        <ArrowLeft size={16} aria-hidden="true" /> Back to users
      </Link>

      {error ? (
        <div className="panel state-box" role="alert">{error}</div>
      ) : !user ? (
        <div className="panel state-box">Loading…</div>
      ) : (
        <>
          {flash && <div className="alert alert-success">{flash}</div>}

          <section className="panel profile-header">
            <div className="profile-avatar" aria-hidden="true">{initialsOf(user.firstName, user.lastName)}</div>
            <div className="profile-main">
              <h1>{user.firstName} {user.lastName}</h1>
              <div className="profile-meta">
                <RoleBadge role={user.role} />
                <StatusLabel active={user.isActive} />
              </div>
            </div>
            {canEdit && (
              <Link to={`/users/${user.id}/edit`} className="btn btn-outline profile-action">
                <Pencil size={16} aria-hidden="true" />
                Edit
              </Link>
            )}
          </section>

          <section className="panel">
            <h2 className="panel-title">Details</h2>
            <dl className="detail-list">
              <div>
                <dt>First name</dt>
                <dd>{user.firstName}</dd>
              </div>
              <div>
                <dt>Last name</dt>
                <dd>{user.lastName}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${user.email}`} className="detail-link"><Mail size={15} aria-hidden="true" />{user.email}</a>
                </dd>
              </div>
              <div>
                <dt>Mobile</dt>
                <dd>
                  {user.mobile ? (
                    <a href={`tel:${user.mobile}`} className="detail-link"><Phone size={15} aria-hidden="true" />{user.mobile}</a>
                  ) : (
                    <span className="text-muted">Not provided</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd><RoleBadge role={user.role} /></dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd><StatusLabel active={user.isActive} /></dd>
              </div>
              <div>
                <dt>User ID</dt>
                <dd>#{user.id}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDateTime(user.createdAt)}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{formatDateTime(user.updatedAt)}</dd>
              </div>
            </dl>
          </section>
        </>
      )}
    </div>
  )
}
