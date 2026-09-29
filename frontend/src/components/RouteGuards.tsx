import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { UserRole } from '../api/auth'
import { useAuth } from '../context/auth-context'

/** Only signed-in users can see these routes */
export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="page-loader">Loading…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

/** Only users with one of these roles can see the nested routes (use inside ProtectedRoute) */
export function RequireRole({ roles }: { roles: UserRole[] }) {
  const { user } = useAuth()

  if (!user || !roles.includes(user.role)) {
    return (
      <div className="page-header">
        <h1>No access</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    )
  }
  return <Outlet />
}

/** Signed-in users are sent away from the login and forgot-password pages */
export function GuestRoute() {
  const { user, loading } = useAuth()

  if (loading) return <div className="page-loader">Loading…</div>
  if (user) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
