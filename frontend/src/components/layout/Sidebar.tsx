import { Armchair, ClipboardList, LayoutDashboard, LogOut, UserCog, Users, X, type LucideIcon } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import type { UserRole } from '../../api/auth'
import { useAuth } from '../../context/auth-context'
import { PHASES } from '../../data/phases'
import { USER_VIEW_ROLES } from '../../data/roles'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Only show to these roles; everyone sees the item when omitted */
  roles?: UserRole[]
}

const MAIN_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/leads', label: 'All Leads', icon: ClipboardList },
]

const MASTER_ITEMS: NavItem[] = [
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/users', label: 'Users', icon: UserCog, roles: USER_VIEW_ROLES },
]

const PHASE_ITEMS: NavItem[] = PHASES.map((p) => ({ to: `/phases/${p.slug}`, label: p.label, icon: p.icon }))

interface Props {
  open: boolean
  onClose: () => void
}

function formatRole(role: string): string {
  return role.charAt(0) + role.slice(1).toLowerCase()
}

export function Sidebar({ open, onClose }: Props) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : ''
  const initials = user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() : ''

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  function renderItems(items: NavItem[]) {
    const visible = items.filter((item) => !item.roles || (user && item.roles.includes(user.role)))
    return visible.map(({ to, label, icon: Icon }) => (
      <NavLink
        key={to}
        to={to}
        onClick={onClose}
        className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
      >
        <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
        <span>{label}</span>
      </NavLink>
    ))
  }

  return (
    <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
      <div className="sidebar-brand">
        <div className="sidebar-logo" aria-hidden="true">
          <Armchair size={22} strokeWidth={2} />
        </div>
        <div className="sidebar-brand-text">
          <strong>Furnixa</strong>
          <span>Furniture CMS</span>
        </div>
        <button type="button" className="sidebar-close" onClick={onClose} aria-label="Close menu">
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {renderItems(MAIN_ITEMS)}

        <div className="nav-section">Masters</div>
        {renderItems(MASTER_ITEMS)}

        <div className="nav-section">Phases</div>
        {renderItems(PHASE_ITEMS)}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="avatar" aria-hidden="true">{initials}</div>
          <div className="sidebar-user-text">
            <strong>{fullName}</strong>
            <span>{user ? formatRole(user.role) : ''}</span>
          </div>
        </div>
        <button type="button" className="sign-out" onClick={handleLogout}>
          <LogOut size={16} aria-hidden="true" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
