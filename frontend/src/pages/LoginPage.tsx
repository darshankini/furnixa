import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { LoginType } from '../api/auth'
import { ApiError } from '../api/client'
import { AuthLayout } from '../components/AuthLayout'
import { useAuth } from '../context/auth-context'

interface LocationState {
  from?: { pathname: string }
  message?: string
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as LocationState | null) ?? {}

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loginType, setLoginType] = useState<LoginType>('user')
  
    const options: { label: string; value: LoginType }[] = [
      {
        label : 'User',
        value : 'user'
      },
      {
        label : 'Client',
        value : 'client'
      }
    ]

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    

    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }

    setSubmitting(true)
    try {
      await login(email.trim(), password,loginType)
      navigate(state.from?.pathname ?? '/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue to Furnixa CMS">
      {state.message && <div className="alert alert-success">{state.message}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="field">
          <div className="field-label-row">
            <label htmlFor="password">Password</label>
            <Link to="/forgot-password" className="link">Forgot password?</Link>
          </div>
          <div className="password-wrap">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {/* <div className="field">
          <div className='inline-flex'>
          <input type="radio" name="login_type" value="user"/><label>User</label>
          <input type="radio" name="login_type" value="client"/><label>Client</label>
          </div>
        </div> */}
        <div className='w-full'>
          <label className='mb-2 block text-sm font-semibold text-[#b4530f]'>Login as</label>
          <div className='flex gap-3 rounded-xl p-1'>
            {options.map((option) => (
              <label
              key={option.value}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200
                ${loginType === option.value ? 'border-[#b4530f] bg-white text-[#b4530f]' :
                  'border-transparent text-gray-600 hover:bg-white hover:text-gray-900'
                }`}>
              <input type="radio" name="login_type" value={option.value} checked={loginType === option.value}
              onChange={()=>setLoginType(option.value)} className='h-4 w-4 accent-[#b4530f]'/>
              {option.label}
              </label>
            ))}
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  )
}
