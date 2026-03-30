import { useState } from 'react'
import { Outlet, useNavigate, useLocation, NavLink, Link } from 'react-router-dom'
import { useChild } from '../context/ChildContext'
import { useAuth } from '../context/AuthContext'
import { getAvatarEmoji } from '../data/avatars'

export default function Layout() {
  const { activeChild } = useChild()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isChildView = location.pathname.startsWith('/child/')
  const childId = activeChild?.id
  const themeIndex = activeChild?.display_order != null ? activeChild.display_order % 6 : 0

  const closeSidebar = () => setSidebarOpen(false)

  const navLinkClass = ({ isActive }) => `child-sidebar-link ${isActive ? 'active' : ''}`

  return (
    <div className="app-layout" data-child-theme={isChildView ? themeIndex : undefined}>
      {/* Mobile overlay */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={closeSidebar} />

      {/* Left sidebar */}
      <nav className={`child-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {isChildView && activeChild ? (
          <div className="child-sidebar-header">
            <div style={{ fontSize: '2.5rem' }}>{getAvatarEmoji(activeChild.avatar_value)}</div>
            <div className="child-sidebar-name">{activeChild.name}</div>
          </div>
        ) : (
          <div className="child-sidebar-header">
            <div className="child-sidebar-name">ChoreMax</div>
          </div>
        )}

        <div className="child-sidebar-section">
          <NavLink to="/" end className={navLinkClass} onClick={closeSidebar}>
            &#x1F3E0; Home
          </NavLink>
          {isChildView && childId && (
            <>
              <NavLink to={`/child/${childId}/daily`} className={navLinkClass} onClick={closeSidebar}>
                &#x1F4CB; Daily Chores
              </NavLink>
              <NavLink to={`/child/${childId}/weekly`} className={navLinkClass} onClick={closeSidebar}>
                &#x1F4C5; Weekly Chores
              </NavLink>
              <NavLink to={`/child/${childId}/dashboard`} className={navLinkClass} onClick={closeSidebar}>
                &#x1F3C6; My Stuff
              </NavLink>
            </>
          )}
        </div>

        <div className="child-sidebar-divider" />

        <div className="child-sidebar-section">
          <NavLink to="/meals/plan" className={navLinkClass} onClick={closeSidebar}>
            &#x1F37D;&#xFE0F; Meal Plan
          </NavLink>
          <NavLink to="/lists/shopping" className={navLinkClass} onClick={closeSidebar}>
            &#x1F6D2; Shopping List
          </NavLink>
        </div>

        <div className="child-sidebar-divider" />

        <div className="child-sidebar-section">
          <button className="child-sidebar-link" onClick={() => { closeSidebar(); navigate('/parent') }}>
            &#x2699;&#xFE0F; Parent Settings
          </button>
          <button className="child-sidebar-link" onClick={() => { closeSidebar(); logout() }}>
            &#x1F6AA; Logout
          </button>
        </div>
      </nav>

      {/* Main content area */}
      <div className="app-main">
        {/* Mobile top bar */}
        <nav className="mobile-topbar">
          <button className={`burger-btn ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(!sidebarOpen)}>
            <span /><span /><span />
          </button>
          {isChildView && activeChild ? (
            <div className="topnav-title">
              {getAvatarEmoji(activeChild.avatar_value)} {activeChild.name}
            </div>
          ) : (
            <div className="topnav-title">ChoreMax</div>
          )}
          {isChildView && (
            <button className="topnav-back" onClick={() => navigate('/')}>
              &#x1F3E0;
            </button>
          )}
        </nav>

        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
