import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'
import { AuthLayout } from '../components/AuthLayout'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [devLink, setDevLink] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setDevLink('')

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }

    setSubmitting(true)
    try {
      const res = await authApi.forgotPassword(email.trim())
      setSuccess(res.message)
      if (res.devResetLink) setDevLink(res.devResetLink)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter your registered email and we'll send you a link to reset your password."
    >
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      {devLink && (
        <div className="alert alert-info">
          <strong>Dev mode:</strong> <a href={devLink}>Open reset link</a>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />
        </div>

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="auth-footer">
        <Link to="/login" className="link">← Back to sign in</Link>
      </p>
    </AuthLayout>
  )
}
