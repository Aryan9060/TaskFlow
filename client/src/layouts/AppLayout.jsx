import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/tasks', label: 'My Tasks' },
  { to: '/assignments', label: 'Assignments' },
  { to: '/subjects', label: 'Subjects' },
  { to: '/exams', label: 'Exam Planner' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/timer', label: 'Study Timer' },
  { to: '/analytics', label: 'Analytics & Goals' },
  { to: '/profile', label: 'Profile' },
  { to: '/settings', label: 'Settings' },
]

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-mark">TF</span>
          <span className="brand-name">TaskFlow</span>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <p className="user-name">{user?.name}</p>
          <p className="user-email">{user?.email}</p>
          <button type="button" className="btn-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <button
            type="button"
            className="menu-button"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          <h1 className="header-title">TaskFlow</h1>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
