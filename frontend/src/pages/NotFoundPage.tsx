import { ArrowLeft, Home } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

/** Any URL that no route matches (shown inside the app layout, so the sidebar stays) */
export function NotFoundPage() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="status-page">
      <p className="status-code">404</p>
      <h1>Page not found</h1>
      <p>
        There is no page at <code>{location.pathname}</code>. It may have been moved, or the link is wrong.
      </p>
      <div className="status-actions">
        <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} aria-hidden="true" />
          Go back
        </button>
        <Link to="/dashboard" className="btn btn-accent">
          <Home size={16} aria-hidden="true" />
          Dashboard
        </Link>
      </div>
    </div>
  )
}
