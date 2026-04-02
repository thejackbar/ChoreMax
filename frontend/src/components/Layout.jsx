import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom'
import { useChild } from '../context/ChildContext'
import { useAuth } from '../context/AuthContext'
import { getAvatarEmoji } from '../data/avatars'

function useDateTime() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000) // update every 30s
    return () => clearInterval(id)
  }, [])
  return now
}

function useWeather() {
  const [weather, setWeather] = useState(null)
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`
        )
        const data = await res.json()
        if (data.current) {
          setWeather({
            temp: Math.round(data.current.temperature_2m),
            code: data.current.weather_code,
          })
        }
      } catch {}
    }, () => {}, { timeout: 5000, maximumAge: 600000 })
  }, [])
  return weather
}

function getWeatherEmoji(code) {
  if (code === 0) return '\u2600\uFE0F'
  if (code <= 3) return '\u26C5'
  if (code <= 48) return '\uD83C\uDF2B\uFE0F'
  if (code <= 57) return '\uD83C\uDF27\uFE0F'
  if (code <= 67) return '\uD83C\uDF27\uFE0F'
  if (code <= 77) return '\u2744\uFE0F'
  if (code <= 82) return '\uD83C\uDF26\uFE0F'
  if (code <= 86) return '\uD83C\uDF28\uFE0F'
  if (code >= 95) return '\u26C8\uFE0F'
  return '\u2600\uFE0F'
}

export default function Layout() {
  const { activeChild } = useChild()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const now = useDateTime()
  const weather = useWeather()

  const isChildView = location.pathname.startsWith('/child/')
  const themeIndex = activeChild?.display_order != null ? activeChild.display_order % 6 : 0

  const closeSidebar = () => setSidebarOpen(false)
  const navLinkClass = ({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`

  const timeStr = now.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
  const dateStr = now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="app-layout" data-child-theme={isChildView ? themeIndex : undefined}>
      {/* Mobile overlay */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={closeSidebar} />

      {/* Left sidebar */}
      <nav className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Date/time/weather header */}
        <div className="sidebar-datetime">
          <div className="sidebar-time">{timeStr}</div>
          <div className="sidebar-date">{dateStr}</div>
          {weather && (
            <div className="sidebar-weather">
              {getWeatherEmoji(weather.code)} {weather.temp}°
            </div>
          )}
        </div>

        <div className="sidebar-divider" />

        {/* Main nav */}
        <div className="sidebar-section">
          <NavLink to="/" end className={navLinkClass} onClick={closeSidebar}>
            <span className="sidebar-icon">&#x1F46A;</span> Family
          </NavLink>
          <NavLink to="/meals/plan" className={navLinkClass} onClick={closeSidebar}>
            <span className="sidebar-icon">&#x1F37D;&#xFE0F;</span> Meal Plan
          </NavLink>
        </div>

        <div className="sidebar-divider" />

        {/* Lists section */}
        <div className="sidebar-section">
          <div className="sidebar-section-label">Lists</div>
          <NavLink to="/lists/todos" className={navLinkClass} onClick={closeSidebar}>
            <span className="sidebar-icon">&#x1F4CB;</span> To-Do
          </NavLink>
          <NavLink to="/lists/shopping" className={navLinkClass} onClick={closeSidebar}>
            <span className="sidebar-icon">&#x1F6D2;</span> Shopping
          </NavLink>
          <NavLink to="/lists/wishlist" className={navLinkClass} onClick={closeSidebar}>
            <span className="sidebar-icon">&#x1F381;</span> Wishlists
          </NavLink>
        </div>

        <div className="sidebar-divider" />

        {/* Calendar coming soon */}
        <div className="sidebar-section">
          <div className="sidebar-link sidebar-link--disabled">
            <span className="sidebar-icon">&#x1F4C5;</span> Calendar
            <span className="sidebar-badge">Soon</span>
          </div>
        </div>

        {/* Spacer pushes settings to bottom */}
        <div style={{ flex: 1 }} />

        <div className="sidebar-divider" />

        {/* Settings at bottom - parent only */}
        <div className="sidebar-section">
          <button className="sidebar-link" onClick={() => { closeSidebar(); navigate('/parent') }}>
            <span className="sidebar-icon">&#x2699;&#xFE0F;</span> Settings
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
          <div className="topnav-center">
            <span className="topnav-time">{timeStr}</span>
            {weather && <span className="topnav-weather">{getWeatherEmoji(weather.code)} {weather.temp}°</span>}
          </div>
          {isChildView && activeChild ? (
            <button className="topnav-back" onClick={() => navigate(`/child/${activeChild.id}`)}>
              {getAvatarEmoji(activeChild.avatar_value)}
            </button>
          ) : (
            <div style={{ width: '2rem' }} />
          )}
        </nav>

        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
