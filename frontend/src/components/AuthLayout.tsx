import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  children: ReactNode
}

export function AuthLayout({ title, subtitle, children }: Props) {
  return (
    <div className="auth-page">
      <aside className="auth-brand">
        <div className="brand-logo">Furnixa</div>
        <div>
          <h2>Furniture projects, from enquiry to invoice.</h2>
          <p>Manage clients, leads, quotations, production and dispatch in one place.</p>
        </div>
        <small>© {new Date().getFullYear()} Furnixa CMS</small>
      </aside>

      <main className="auth-panel">
        <div className="auth-card">
          <div className="brand-logo mobile-only">Furnixa</div>
          <h1>{title}</h1>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          {children}
        </div>
      </main>
    </div>
  )
}
