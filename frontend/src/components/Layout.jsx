import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { useChild } from '../context/ChildContext'
import { useAuth } from '../context/AuthContext'
import { getAvatarEmoji } from '../data/avatars'

export default function Layout() {
  const { activeChild } = useChild()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isChildView = location.pathname.startsWith('/child/')
  const childId = activeChild?.id

  return (
    <div className="app-container">
      <nav className="topnav">
        {isChildView ? (
          <button className="topnav-back" onClick={() => navigate('/')}>
            &larr;
          </button>
        ) : (
          <div className="topnav-title">ChoreMax</div>
        )}
        {isChildView && activeChild && (
          <div className="topnav-title">
            {getAvatarEmoji(activeChild.avatar_value)} {activeChild.name}
          </div>
        )}
        <div className="topnav-actions">
          <button className="btn btn-sm btn-outline" onClick={() => navigate('/parent')}>
            Settings
          </button>
          {!isChildView && (
            <button className="btn btn-sm btn-outline" onClick={logout}>
              Logout
            </button>
          )}
        </div>
      </nav>

      <main className="page" style={isChildView ? { paddingBottom: '5rem' } : {}}>
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
            <span className="nav-icon">&#x1F3E0;</span>
            My Stuff
          </Link>
        </nav>
      )}
    </div>
  )
}
