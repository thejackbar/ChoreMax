import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ParentLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('parentSidebarCollapsed') === 'true')

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('parentSidebarCollapsed', String(next))
  }

  const linkClass = ({ isActive }) => `parent-sidebar-link ${isActive ? 'active' : ''}`

  const handleBack = () => {
    if (window.history.length > 1) window.history.back()
    else navigate('/')
  }

  const handleLogout = async () => {
    sessionStorage.removeItem('parentPin')
    await logout()
    navigate('/login')
  }

  return (
    <div className={`parent-layout ${collapsed ? 'parent-sidebar-collapsed' : ''}`}>
      <nav className={`parent-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <button className="sidebar-collapse-btn" onClick={toggleCollapse} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? '\u276F' : '\u276E'}
        </button>

        <NavLink to="/parent" end className={linkClass} title="Dashboard">
          <span className="sidebar-icon">&#x1F4CA;</span>
          <span className="sidebar-label">Dashboard</span>
        </NavLink>
        <NavLink to="/parent/chores" className={linkClass} title="Chores">
          <span className="sidebar-icon">&#x2705;</span>
          <span className="sidebar-label">Chores</span>
        </NavLink>
        <NavLink to="/parent/children" className={linkClass} title="Children">
          <span className="sidebar-icon">&#x1F9D2;</span>
          <span className="sidebar-label">Children</span>
        </NavLink>
        <NavLink to="/parent/meals" className={linkClass} title="Meals">
          <span className="sidebar-icon">&#x1F37D;&#xFE0F;</span>
          <span className="sidebar-label">Meals</span>
        </NavLink>
        <NavLink to="/parent/goals" className={linkClass} title="Goals">
          <span className="sidebar-icon">&#x1F3AF;</span>
          <span className="sidebar-label">Goals</span>
        </NavLink>
        <NavLink to="/parent/calendar" className={linkClass} title="Calendar">
          <span className="sidebar-icon">&#x1F4C5;</span>
          <span className="sidebar-label">Calendar</span>
        </NavLink>
        <NavLink to="/parent/settings" className={linkClass} title="Settings">
          <span className="sidebar-icon">&#x2699;&#xFE0F;</span>
          <span className="sidebar-label">Settings</span>
        </NavLink>

        <div style={{ flex: 1 }} />

        <button className="parent-sidebar-link" onClick={() => navigate('/')} title="Back to Family">
          <span className="sidebar-icon">&#x1F46A;</span>
          <span className="sidebar-label">Family</span>
        </button>
        <button className="parent-sidebar-link" onClick={handleLogout} title="Logout">
          <span className="sidebar-icon">&#x1F6AA;</span>
          <span className="sidebar-label">Logout</span>
        </button>
      </nav>
      <div className="parent-content">
        {/* Top bar with back button - available on every settings page */}
        <div className="parent-topbar">
          <button className="parent-back-btn" onClick={handleBack} title="Go back" aria-label="Go back">
            &lsaquo; Back
          </button>
        </div>

        <div className="parent-content-inner">
          <Outlet />
        </div>

        {/* Sticky footer - always visible on every settings page */}
        <div className="parent-settings-footer">
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/')}>
            <span style={{ marginRight: '0.35rem' }}>&#x1F46A;</span>
            Return to Family View
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleLogout}>
            <span style={{ marginRight: '0.35rem' }}>&#x1F6AA;</span>
            Log Out
          </button>
        </div>
      </div>
    </div>
  )
}
