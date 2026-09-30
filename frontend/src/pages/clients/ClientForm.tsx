import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../api/client'
import type { ClientFormValues } from './client-form-values'

type FieldErrors = Partial<Record<keyof ClientFormValues, string>>

interface Props {
  mode: 'create' | 'edit'
  initialValues: ClientFormValues
  cancelTo: string
  onSubmit: (values: ClientFormValues) => Promise<void>
}

const PHONE = /^\+?[0-9]{10,15}$/
const PHONE_MESSAGE = 'must be 10–15 digits, optionally starting with +.'

/** Same rules as the backend CreateClientDto / UpdateClientDto */
function validate(v: ClientFormValues): FieldErrors {
  const e: FieldErrors = {}
  if (!v.firstName.trim()) e.firstName = 'First name is required.'
  else if (v.firstName.trim().length > 50) e.firstName = 'First name must be 50 characters or fewer.'
  if (!v.lastName.trim()) e.lastName = 'Last name is required.'
  else if (v.lastName.trim().length > 50) e.lastName = 'Last name must be 50 characters or fewer.'
  if (!v.mobile.trim()) e.mobile = 'Mobile is required.'
  else if (!PHONE.test(v.mobile.trim())) e.mobile = `Mobile ${PHONE_MESSAGE}`
  if (v.alternateMobile.trim() && !PHONE.test(v.alternateMobile.trim())) {
    e.alternateMobile = `Alternate mobile ${PHONE_MESSAGE}`
    if(v.mobile.trim() == v.alternateMobile.trim()) e.alternateMobile = `Alternate mobile number cannot be the same`
  }
  if (v.email.trim() && !/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = 'Please enter a valid email address.'
  if (v.address.trim().length > 500) e.address = 'Address must be 500 characters or fewer.'
  return e
}

export function ClientForm({ mode, initialValues, cancelTo, onSubmit }: Props) {
  const [values, setValues] = useState<ClientFormValues>(initialValues)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function set(key: keyof ClientFormValues, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError('')

    const found = validate(values)
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
      setFormError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const fieldProps = (key: keyof ClientFormValues) => ({
    id: key,
    value: values[key],
    onChange: (e: { target: { value: string } }) => set(key, e.target.value),
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `${key}-error` : undefined,
    disabled: submitting,
  })

  const fieldError = (key: keyof ClientFormValues) =>
    errors[key] ? <p id={`${key}-error`} className="field-error">{errors[key]}</p> : null

  return (
    <form className="panel w-full" onSubmit={handleSubmit} noValidate>
      {formError && <div className="alert alert-error" role="alert">{formError}</div>}

      <div className="form-grid">
        <h2 className="form-section-title">Client details</h2>

        <div className="form-field">
          <label htmlFor="firstName">First name<span className="required">*</span></label>
          <input {...fieldProps('firstName')} autoComplete="off" autoFocus />
          {fieldError('firstName')}
        </div>

        <div className="form-field">
          <label htmlFor="lastName">Last name<span className="required">*</span></label>
          <input {...fieldProps('lastName')} autoComplete="off" />
          {fieldError('lastName')}
        </div>

        <div className="form-field">
          <label htmlFor="mobile">Mobile<span className="required">*</span></label>
          <input {...fieldProps('mobile')} type="tel" inputMode="tel" placeholder="e.g. +919876543210" />
          {fieldError('mobile')}
        </div>

        <div className="form-field">
          <label htmlFor="alternateMobile">Alternate mobile</label>
          <input {...fieldProps('alternateMobile')} type="tel" inputMode="tel" placeholder="Optional" />
          {fieldError('alternateMobile')}
        </div>

        <div className="form-field">
          <label htmlFor="email">Email</label>
          <input {...fieldProps('email')} type="email" autoComplete="off" placeholder="Optional" />
          {fieldError('email')}
        </div>

        <div className="form-field span-2">
          <label htmlFor="address">Address</label>
          <textarea {...fieldProps('address')} rows={3} placeholder="Site or billing address (optional)" />
          {fieldError('address') ?? <p className="field-hint">{values.address.trim().length}/500 characters</p>}
        </div>
      </div>

      <div className="form-actions">
        <Link to={cancelTo} className="btn btn-outline">Cancel</Link>
        <button type="submit" className="btn btn-accent" disabled={submitting}>
          {mode === 'edit' ? (submitting ? 'Saving…' : 'Save changes') : submitting ? 'Creating…' : 'Create client'}
        </button>
      </div>
    </form>
  )
}
