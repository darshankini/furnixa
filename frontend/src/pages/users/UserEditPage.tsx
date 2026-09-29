import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { usersApi, type UpdateUserInput, type UserRecord } from '../../api/users'
import { useAuth } from '../../context/auth-context'
import type { UserFormValues } from './user-form-values'
import { UserForm } from './UserForm'

export function UserEditPage() {
  const { id } = useParams()
  // key: remount when the id in the URL changes, so the form never shows the previous user's data
  return <UserEdit key={id} id={Number(id)} />
}

function toFormValues(user: UserRecord): UserFormValues {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    mobile: user.mobile ?? '',
    role: user.role,
    isActive: user.isActive,
    password: '',
    confirmPassword: '',
  }
}

function UserEdit({ id }: { id: number }) {
  const navigate = useNavigate()
  const { user: me, refreshUser } = useAuth()
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

  const isSelf = me?.id === id

  async function handleSubmit(values: UserFormValues) {
    const changes: UpdateUserInput = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      mobile: values.mobile.trim() || null,
      ...(!isSelf && { role: values.role, isActive: values.isActive }),
      ...(values.password && { password: values.password }),
    }
    const res = await usersApi.update(id, changes)

    // Keep the sidebar name/role in sync when you edit your own account
    if (isSelf) await refreshUser()

    navigate(`/users/${id}`, {
      state: {
        message: values.password
          ? `Changes saved. ${res.user.firstName}'s password was updated.`
          : 'Changes saved.',
      },
    })
  }

  return (
    <div className="entity-page">
      <Link to={`/users/${id}`} className="back-link">
        <ArrowLeft size={16} aria-hidden="true" /> Back to user
      </Link>

      <div className="page-header">
        <h1>Edit user</h1>
        <p>{user ? `${user.firstName} ${user.lastName} · ${user.email}` : 'Update this team member’s details.'}</p>
      </div>

      {error ? (
        <div className="panel state-box" role="alert">{error}</div>
      ) : !user ? (
        <div className="panel state-box">Loading…</div>
      ) : (
        <UserForm
          mode="edit"
          initialValues={toFormValues(user)}
          isSelf={isSelf}
          cancelTo={`/users/${id}`}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
