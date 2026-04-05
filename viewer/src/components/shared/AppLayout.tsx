/**
 * AppLayout — Main application shell with sidebar navigation.
 *
 * Provides the persistent sidebar + top bar that wraps all pages.
 * The <Outlet /> renders the active route's page component.
 */

import { NavLink, Outlet, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  {
    to: '/upload',
    icon: '⬆',
    label: 'Upload CV',
    description: 'Parse & Validate',
  },
  {
    to: '/personnel',
    icon: '⊞',
    label: 'Personnel',
    description: 'Browse & Edit',
  },
  {
    to: '/opportunities',
    icon: '◈',
    label: 'Opportunities',
    description: 'Upload & Match',
  },
]

export default function AppLayout() {
  const location = useLocation()

  // Derive page title from current route
  const currentNav = NAV_ITEMS.find(n => location.pathname.startsWith(n.to))
  const pageTitle = currentNav?.label ?? 'Dashboard'
  const pageDesc = currentNav?.description ?? ''

  return (
    <div className="layout-shell">
      {/* ── Sidebar ───────────────────────────────────── */}
      <aside className="layout-sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">SFIA</div>
          <div className="brand-text">
            <span className="brand-name">Skills Intelligence</span>
            <span className="brand-version">Platform v1.0</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">MAIN MENU</div>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'nav-active' : ''}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              <div className="nav-text">
                <span className="nav-label">{item.label}</span>
                <span className="nav-desc">{item.description}</span>
              </div>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-status">
            <span className="status-dot" />
            <span className="status-text">System Online</span>
          </div>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────── */}
      <div className="layout-main">
        <header className="layout-header">
          <div className="header-page-info">
            <h1 className="page-title">{pageTitle}</h1>
            <span className="page-desc">{pageDesc}</span>
          </div>
        </header>

        <div className="layout-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
