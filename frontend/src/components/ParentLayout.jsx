import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ParentLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="parent-layout">
      <nav className="parent-sidebar">
        <NavLink to="/parent" end className={({ isActive }) => `parent-sidebar-link ${isActive ? 'active' : ''}`}>
          Dashboard
        </NavLink>
        <NavLink to="/parent/chores" className={({ isActive }) => `parent-sidebar-link ${isActive ? 'active' : ''}`}>
          Manage Chores
        </NavLink>
        <NavLink to="/parent/children" className={({ isActive }) => `parent-sidebar-link ${isActive ? 'active' : ''}`}>
          Manage Children
        </NavLink>
        <NavLink to="/parent/meals" className={({ isActive }) => `parent-sidebar-link ${isActive ? 'active' : ''}`}>
          Manage Meals
        </NavLink>
        <NavLink to="/parent/settings" className={({ isActive }) => `parent-sidebar-link ${isActive ? 'active' : ''}`}>
          Account Settings
        </NavLink>
        <button className="parent-sidebar-link" onClick={() => navigate('/')}>
          &larr; Back to Home
        </button>
        <button className="parent-sidebar-link" onClick={logout}>
          Logout
        </button>
      </nav>
      <div className="parent-content">
        <Outlet />
      </div>
    </div>
  )
}
