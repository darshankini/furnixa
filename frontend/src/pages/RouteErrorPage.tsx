import { Home, RotateCcw } from 'lucide-react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'

/** After a deploy, an open tab may ask for a code file that no longer exists; a reload fixes it */
function isStaleBuild(error: unknown): boolean {
  return error instanceof Error && /dynamically imported module|Importing a module script failed|error loading dynamically/i.test(error.message)
}

interface Props {
  /** Full-screen version for errors outside the app layout (login pages, or the layout itself failing) */
  standalone?: boolean
}

/**
 * Shown instead of a route whose page crashed while rendering, so one broken page
 * doesn't blank the whole app. Inside the layout the sidebar keeps working.
 */
export function RouteErrorPage({ standalone = false }: Props) {
  const error = useRouteError()

  let title = 'Something went wrong'
  let message = 'This page ran into an unexpected error. Try again, or go back to the dashboard.'
  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? 'Page not found' : `Error ${error.status}`
    message = error.statusText || message
  } else if (isStaleBuild(error)) {
    title = 'A new version is available'
    message = 'Furnixa was updated while this page was open. Reload to get the latest version.'
  }

  const details = error instanceof Error ? (error.stack ?? error.message) : String(error)

  const content = (
    <div className="status-page" role="alert">
      <p className="status-code">Error</p>
      <h1>{title}</h1>
      <p>{message}</p>
      <div className="status-actions">
        <button type="button" className="btn btn-accent" onClick={() => window.location.reload()}>
          <RotateCcw size={16} aria-hidden="true" />
          Reload page
        </button>
        {/* A full page load, so a crashed layout starts fresh too */}
        <Link to="/dashboard" reloadDocument className="btn btn-outline">
          <Home size={16} aria-hidden="true" />
          Dashboard
        </Link>
      </div>
      {/* The technical details only help while developing */}
      {import.meta.env.DEV && <pre className="status-details">{details}</pre>}
    </div>
  )

  return standalone ? <div className="status-screen">{content}</div> : content
}
