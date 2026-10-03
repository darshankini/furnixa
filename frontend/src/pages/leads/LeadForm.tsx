import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { clientsApi, type ClientRecord } from '../../api/clients'
import { leadsApi, type UserRef } from '../../api/leads'
import { useAuth } from '../../context/auth-context'
import { CLIENT_MANAGE_ROLES } from '../../data/roles'
import { UserPicker } from './UserPicker'

export interface LeadFormValues {
  clientId: string
  projectName: string
  assigneeIds: number[]
}

type FieldErrors = Partial<Record<'clientId' | 'projectName', string>>

interface Props {
  mode: 'create' | 'edit'
  initialValues: LeadFormValues
  cancelTo: string
  onSubmit: (values: LeadFormValues) => Promise<void>
}

/** Same rules as the backend CreateLeadDto / UpdateLeadDto */
function validate(v: LeadFormValues): FieldErrors {
  const e: FieldErrors = {}
  if (!v.clientId) e.clientId = 'Please select a client.'
  if (!v.projectName.trim()) e.projectName = 'Project name is required.'
  else if (v.projectName.trim().length > 150) e.projectName = 'Project name must be 150 characters or fewer.'
  return e
}

export function LeadForm({ mode, initialValues, cancelTo, onSubmit }: Props) {
  const { user: me } = useAuth()
  const [values, setValues] = useState<LeadFormValues>(initialValues)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [clients, setClients] = useState<ClientRecord[] | null>(null)
  const [users, setUsers] = useState<UserRef[]>([])

  const canAddClient = !!me && CLIENT_MANAGE_ROLES.includes(me.role)

  useEffect(() => {
    let cancelled = false
    clientsApi
      .list()
      .then((res) => !cancelled && setClients(res.clients))
      .catch((err) => !cancelled && setFormError(err instanceof ApiError ? err.message : 'Unable to load clients.'))
    // Assignees are only picked when creating; later changes go through "Assign" on the lead page
    if (mode === 'create') {
      leadsApi
        .assignableUsers()
        .then((res) => !cancelled && setUsers(res.users))
        .catch(() => undefined)
    }
    return () => {
      cancelled = true
    }
  }, [mode])

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

  return (
    <form className="panel w-full" onSubmit={handleSubmit} noValidate>
      {formError && <div className="alert alert-error" role="alert">{formError}</div>}

      <div className="form-grid">
        <h2 className="form-section-title">Lead details</h2>

        <div className="form-field">
          <label htmlFor="clientId">Client<span className="required">*</span></label>
          <select
            id="clientId"
            value={values.clientId}
            onChange={(e) => {
              setValues((prev) => ({ ...prev, clientId: e.target.value }))
              setErrors((prev) => ({ ...prev, clientId: undefined }))
            }}
            aria-invalid={errors.clientId ? true : undefined}
            aria-describedby={errors.clientId ? 'clientId-error' : undefined}
            disabled={submitting || clients === null}
            autoFocus
          >
            <option value="">{clients === null ? 'Loading clients…' : 'Select a client'}</option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName} · {c.mobile}
              </option>
            ))}
          </select>
          {errors.clientId ? (
            <p id="clientId-error" className="field-error">{errors.clientId}</p>
          ) : (
            canAddClient && (
              <p className="field-hint">
                Not in the list? <Link to="/clients/new" className="link">Add a client</Link> first.
              </p>
            )
          )}
        </div>

        <div className="form-field" style={{ gridColumn: 'span 2' }}>
          <label htmlFor="projectName">Project name<span className="required">*</span></label>
          <input
            id="projectName"
            value={values.projectName}
            onChange={(e) => {
              setValues((prev) => ({ ...prev, projectName: e.target.value }))
              setErrors((prev) => ({ ...prev, projectName: undefined }))
            }}
            aria-invalid={errors.projectName ? true : undefined}
            aria-describedby={errors.projectName ? 'projectName-error' : undefined}
            disabled={submitting}
            placeholder="e.g. Modular Kitchen – 3BHK"
            autoComplete="off"
          />
          {errors.projectName && <p id="projectName-error" className="field-error">{errors.projectName}</p>}
        </div>

        {mode === 'create' && (
          <>
            <h2 className="form-section-title">
              Assign to <span className="section-note">(optional{me?.role === 'SALES' ? ' — you are assigned automatically' : ''})</span>
            </h2>
            <div className="form-field span-2">
              <UserPicker
                users={users.filter((u) => !(me?.role === 'SALES' && u.id === me.id))}
                selected={values.assigneeIds}
                onChange={(ids) => setValues((prev) => ({ ...prev, assigneeIds: ids }))}
                disabled={submitting}
              />
            </div>
          </>
        )}
      </div>

      <div className="form-actions">
        <Link to={cancelTo} className="btn btn-outline">Cancel</Link>
        <button type="submit" className="btn btn-accent" disabled={submitting}>
          {mode === 'edit' ? (submitting ? 'Saving…' : 'Save changes') : submitting ? 'Creating…' : 'Create lead'}
        </button>
      </div>
    </form>
  )
}
