import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Icon from '../components/Icon.jsx'
import ThemeSwitcher from '../components/ThemeSwitcher.jsx'

// Sidebar navigation definition: route, label, and hand-drawn icon name.
const navItems = [
  { to: '/', label: 'Dashboard', icon: 'home', end: true },
  { to: '/tasks', label: 'My Tasks', icon: 'tasks' },
  { to: '/assignments', label: 'Assignments', icon: 'assignment' },
  { to: '/subjects', label: 'Subjects', icon: 'book' },
  { to: '/exams', label: 'Exam Planner', icon: 'cap' },
  { to: '/calendar', label: 'Calendar', icon: 'calendar' },
  { to: '/timer', label: 'Study Timer', icon: 'clock' },
  { to: '/analytics', label: 'Analytics & Goals', icon: 'chart' },
  { to: '/profile', label: 'Profile', icon: 'user' },
  { to: '/settings', label: 'Settings', icon: 'gear' },
]

// App shell shared by every private page: off-canvas sidebar (mobile),
// top header, and the routed page content via <Outlet />.
export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // Ends the server session, then drops the user on the login page.
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
              <Icon name={item.icon} size={19} />
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
          <h1 className="header-title">study, on purpose.</h1>
          <ThemeSwitcher />
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
