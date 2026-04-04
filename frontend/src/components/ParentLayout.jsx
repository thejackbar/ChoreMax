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
        <button className="parent-sidebar-link" onClick={logout} title="Logout">
          <span className="sidebar-icon">&#x1F6AA;</span>
          <span className="sidebar-label">Logout</span>
        </button>
      </nav>
      <div className="parent-content">
        <Outlet />
      </div>
    </div>
  )
}
