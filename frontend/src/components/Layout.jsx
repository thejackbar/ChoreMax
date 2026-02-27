import { useState } from 'react'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { useChild } from '../context/ChildContext'
import { useAuth } from '../context/AuthContext'
import { getAvatarEmoji } from '../data/avatars'

export default function Layout() {
  const { activeChild } = useChild()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isChildView = location.pathname.startsWith('/child/')
  const childId = activeChild?.id

  const closeDrawer = () => setDrawerOpen(false)

  return (
    <div className="app-container">
      {/* Drawer overlay */}
      <div className={`drawer-overlay ${drawerOpen ? 'open' : ''}`} onClick={closeDrawer} />

      {/* Slide-out drawer */}
      <nav className={`drawer ${drawerOpen ? 'open' : ''}`}>
        {isChildView && activeChild && (
          <>
            <div style={{ padding: '0 1.75rem', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '2.5rem' }}>{getAvatarEmoji(activeChild.avatar_value)}</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginTop: '0.5rem' }}>
                {activeChild.name}
              </div>
            </div>
            <div className="drawer-divider" />
          </>
        )}
        <Link to="/" className="drawer-link" onClick={closeDrawer}>
          &#x1F3E0; Home
        </Link>
        {isChildView && childId && (
          <>
            <Link to={`/child/${childId}/daily`} className={`drawer-link ${location.pathname.includes('/daily') ? 'active' : ''}`} onClick={closeDrawer}>
              &#x1F4CB; Daily Chores
            </Link>
            <Link to={`/child/${childId}/weekly`} className={`drawer-link ${location.pathname.includes('/weekly') ? 'active' : ''}`} onClick={closeDrawer}>
              &#x1F4C5; Weekly Chores
            </Link>
            <Link to={`/child/${childId}/dashboard`} className={`drawer-link ${location.pathname.includes('/dashboard') ? 'active' : ''}`} onClick={closeDrawer}>
              &#x1F3C6; My Stuff
            </Link>
          </>
        )}
        <div className="drawer-divider" />
        <button className="drawer-link" onClick={() => { closeDrawer(); navigate('/parent'); }}>
          &#x2699;&#xFE0F; Parent Settings
        </button>
        <button className="drawer-link" onClick={() => { closeDrawer(); logout(); }}>
          &#x1F6AA; Logout
        </button>
      </nav>

      {/* Top nav */}
      <nav className="topnav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className={`burger-btn ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(!drawerOpen)}>
            <span /><span /><span />
          </button>
          {isChildView && activeChild ? (
            <div className="topnav-title">
              {getAvatarEmoji(activeChild.avatar_value)} {activeChild.name}
            </div>
          ) : (
            <div className="topnav-title">ChoreMax</div>
          )}
        </div>
        {isChildView && (
          <button className="topnav-back" onClick={() => navigate('/')}>
            &#x1F3E0;
          </button>
        )}
      </nav>

      <main className="page" style={isChildView ? { paddingBottom: '5.5rem' } : {}}>
        <Outlet />
      </main>

      {isChildView && childId && (
        <nav className="bottomnav">
          <Link
            to={`/child/${childId}/daily`}
            className={`bottomnav-item ${location.pathname.includes('/daily') ? 'active' : ''}`}
          >
            <span className="nav-icon">&#x1F4CB;</span>
            Daily
          </Link>
          <Link
            to={`/child/${childId}/weekly`}
            className={`bottomnav-item ${location.pathname.includes('/weekly') ? 'active' : ''}`}
          >
            <span className="nav-icon">&#x1F4C5;</span>
            Weekly
          </Link>
          <Link
            to={`/child/${childId}/dashboard`}
            className={`bottomnav-item ${location.pathname.includes('/dashboard') ? 'active' : ''}`}
          >
            <span className="nav-icon">&#x1F3C6;</span>
            My Stuff
          </Link>
        </nav>
      )}
    </div>
  )
}
