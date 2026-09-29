import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { usersApi } from '../../api/users'
import { EMPTY_USER_FORM, type UserFormValues } from './user-form-values'
import { UserForm } from './UserForm'

export function UserCreatePage() {
  const navigate = useNavigate()

  async function handleSubmit(values: UserFormValues) {
    const { user } = await usersApi.create({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      mobile: values.mobile.trim() || undefined,
      role: values.role,
      password: values.password,
      isActive: values.isActive,
    })
    navigate('/users', {
      state: { message: `${user.firstName} ${user.lastName} was added. They can now sign in with ${user.email}.` },
    })
  }

  return (
    <div className="entity-page">
      <Link to="/users" className="back-link">
        <ArrowLeft size={16} aria-hidden="true" /> Back to users
      </Link>

      <div className="page-header">
        <h1>Add user</h1>
        <p>Create a login for a team member.</p>
      </div>

      <UserForm mode="create" initialValues={EMPTY_USER_FORM} cancelTo="/users" onSubmit={handleSubmit} />
    </div>
  )
}
