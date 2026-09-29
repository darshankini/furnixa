import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'
import { AuthLayout } from '../components/AuthLayout'

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must contain at least one letter and one number.'
  }
  return null
}

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!token) {
    return (
      <AuthLayout title="Invalid link" subtitle="This password reset link is missing or broken.">
        <Link to="/forgot-password" className="btn-primary btn-link">Request a new link</Link>
      </AuthLayout>
    )
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const problem = validatePassword(password)
    if (problem) return setError(problem)
    if (password !== confirm) return setError('Passwords do not match.')

    setSubmitting(true)
    try {
      const res = await authApi.resetPassword(token, password)
      navigate('/login', { replace: true, state: { message: res.message } })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Use at least 8 characters with letters and numbers.">
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="password">New password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="field">
          <label htmlFor="confirm">Confirm new password</label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={submitting}
          />
        </div>

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Updating…' : 'Update password'}
        </button>
      </form>

      <p className="auth-footer">
        <Link to="/login" className="link">← Back to sign in</Link>
      </p>
    </AuthLayout>
  )
}
