import { Eye, EyeOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { UserRole } from '../../api/auth'
import { ApiError } from '../../api/client'
import { ROLES } from '../../data/roles'
import type { UserFormValues } from './user-form-values'

type FieldErrors = Partial<Record<keyof UserFormValues, string>>

interface Props {
  mode: 'create' | 'edit'
  initialValues: UserFormValues
  /** Editing your own account: role and active status are locked */
  isSelf?: boolean
  cancelTo: string
  onSubmit: (values: UserFormValues) => Promise<void>
}

/** Same rules as the backend CreateUserDto / UpdateUserDto */
function validate(v: UserFormValues, mode: Props['mode']): FieldErrors {
  const e: FieldErrors = {}
  if (!v.firstName.trim()) e.firstName = 'First name is required.'
  else if (v.firstName.trim().length > 50) e.firstName = 'First name must be 50 characters or fewer.'
  if (!v.lastName.trim()) e.lastName = 'Last name is required.'
  else if (v.lastName.trim().length > 50) e.lastName = 'Last name must be 50 characters or fewer.'
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = 'Please enter a valid email address.'
  if (v.mobile.trim() && !/^\+?[0-9]{10,15}$/.test(v.mobile.trim())) {
    e.mobile = 'Mobile must be 10–15 digits, optionally starting with +.'
  }

  // When editing, the password is optional: leave it empty to keep the current one
  const passwordRequired = mode === 'create'
  if (passwordRequired || v.password) {
    if (v.password.length < 8) e.password = 'Password must be at least 8 characters.'
    else if (!/[A-Za-z]/.test(v.password) || !/\d/.test(v.password)) {
      e.password = 'Password must contain at least one letter and one number.'
    }
  }
  if ((passwordRequired || v.password || v.confirmPassword) && v.confirmPassword !== v.password) {
    e.confirmPassword = 'Passwords do not match.'
  }
  return e
}

export function UserForm({ mode, initialValues, isSelf = false, cancelTo, onSubmit }: Props) {
  const [values, setValues] = useState<UserFormValues>(initialValues)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isEdit = mode === 'edit'

  function set<K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError('')

    const found = validate(values, mode)
    setErrors(found)
    const firstInvalid = Object.keys(found)[0]
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus()
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(values)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrors((prev) => ({ ...prev, email: err.message }))
        // Wait until the inputs are enabled again, then put the cursor in the email field
        setTimeout(() => document.getElementById('email')?.focus(), 0)
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const fieldProps = (key: keyof UserFormValues) => ({
    id: key,
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `${key}-error` : undefined,
    disabled: submitting,
  })

  const fieldError = (key: keyof UserFormValues) =>
    errors[key] ? <p id={`${key}-error`} className="field-error">{errors[key]}</p> : null

  return (
    <form className="panel form-panel" onSubmit={handleSubmit} noValidate>
      {formError && <div className="alert alert-error" role="alert">{formError}</div>}

      <div className="form-grid">
        <h2 className="form-section-title">Personal details</h2>

        <div className="form-field">
          <label htmlFor="firstName">First name<span className="required">*</span></label>
          <input {...fieldProps('firstName')} autoComplete="off" autoFocus value={values.firstName} onChange={(e) => set('firstName', e.target.value)} />
          {fieldError('firstName')}
        </div>

        <div className="form-field">
          <label htmlFor="lastName">Last name<span className="required">*</span></label>
          <input {...fieldProps('lastName')} autoComplete="off" value={values.lastName} onChange={(e) => set('lastName', e.target.value)} />
          {fieldError('lastName')}
        </div>

        <div className="form-field">
          <label htmlFor="email">Email<span className="required">*</span></label>
          <input {...fieldProps('email')} type="email" autoComplete="off" value={values.email} onChange={(e) => set('email', e.target.value)} />
          {fieldError('email') ?? <p className="field-hint">Used to sign in.</p>}
        </div>

        <div className="form-field">
          <label htmlFor="mobile">Mobile</label>
          <input {...fieldProps('mobile')} type="tel" inputMode="tel" placeholder="e.g. +919876543210" value={values.mobile} onChange={(e) => set('mobile', e.target.value)} />
          {fieldError('mobile')}
        </div>

        <h2 className="form-section-title">Access</h2>

        <div className="form-field">
          <label htmlFor="role">Role<span className="required">*</span></label>
          <select {...fieldProps('role')} disabled={submitting || isSelf} value={values.role} onChange={(e) => set('role', e.target.value as UserRole)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {fieldError('role') ?? (isSelf && <p className="field-hint">You cannot change your own role.</p>)}
        </div>

        <div className="form-field toggle-field">
          <label className="toggle" htmlFor="isActive">
            <input
              id="isActive"
              type="checkbox"
              checked={values.isActive}
              disabled={submitting || isSelf}
              onChange={(e) => set('isActive', e.target.checked)}
            />
            <span className="toggle-text">
              <strong>Active</strong>
              <span>{isSelf ? 'You cannot deactivate your own account.' : 'Inactive users cannot sign in.'}</span>
            </span>
          </label>
        </div>

        {isEdit && (
          <h2 className="form-section-title">
            Change password <span className="section-note">— optional, leave empty to keep the current password</span>
          </h2>
        )}

        <div className="form-field">
          <label htmlFor="password">
            {isEdit ? 'New password' : 'Password'}
            {!isEdit && <span className="required">*</span>}
          </label>
          <div className="input-with-button">
            <input {...fieldProps('password')} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={values.password} onChange={(e) => set('password', e.target.value)} />
            <button type="button" className="input-button" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {fieldError('password') ?? <p className="field-hint">At least 8 characters with a letter and a number.</p>}
        </div>

        <div className="form-field">
          <label htmlFor="confirmPassword">
            {isEdit ? 'Confirm new password' : 'Confirm password'}
            {!isEdit && <span className="required">*</span>}
          </label>
          <input {...fieldProps('confirmPassword')} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={values.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} />
          {fieldError('confirmPassword')}
        </div>
      </div>

      <div className="form-actions">
        <Link to={cancelTo} className="btn btn-outline">Cancel</Link>
        <button type="submit" className="btn btn-accent" disabled={submitting}>
          {isEdit ? (submitting ? 'Saving…' : 'Save changes') : submitting ? 'Creating…' : 'Create user'}
        </button>
      </div>
    </form>
  )
}
