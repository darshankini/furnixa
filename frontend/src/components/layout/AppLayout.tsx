import { Armchair, Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import './layout.css'

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  // Close the mobile menu with the Escape key
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <div className="app-shell">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <div className="app-main">
        {/* Shown only on tablets and phones */}
        <header className="mobile-topbar">
          <button type="button" className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div className="mobile-brand">
            <Armchair size={18} aria-hidden="true" />
            Furnixa
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
