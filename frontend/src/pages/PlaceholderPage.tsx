import { useLocation, useParams } from 'react-router-dom'
import { PHASES } from '../data/phases'

/** Temporary page for menu items whose modules are not built yet */
export function PlaceholderPage({ title }: { title?: string }) {
  const { phase } = useParams()
  const location = useLocation()
  const heading = title ?? PHASES.find((p) => p.slug === phase)?.label ?? 'Page'

  return (
    <div className="page-header">
      <h1>{heading}</h1>
      <p>This module is coming soon. ({location.pathname})</p>
    </div>
  )
}
