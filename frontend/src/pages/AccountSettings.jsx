import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { CURRENCIES } from '../data/currencies'
import ThemeSelector, { getStoredTheme, applyTheme } from '../components/ThemeSelector'

const FEED_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

export default function AccountSettings() {
  const { user, refreshUser } = useAuth()
  const pin = sessionStorage.getItem('parentPin')
  const [currency, setCurrency] = useState(user?.currency || 'AUD')
  const [timezone, setTimezone] = useState(user?.timezone || 'Australia/Sydney')
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [familySize, setFamilySize] = useState(user?.family_size || 4)
  const [theme, setTheme] = useState(getStoredTheme)
  const [newPin, setNewPin] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [msg, setMsg] = useState(null)
  const [error, setError] = useState(null)

  // Reminders
  const [morningEnabled, setMorningEnabled] = useState(true)
  const [morningTime, setMorningTime] = useState('06:00')
  const [eveningEnabled, setEveningEnabled] = useState(true)
  const [eveningTime, setEveningTime] = useState('18:00')

  // Calendar connections
  const [calConns, setCalConns] = useState([])
  const [showAddIcal, setShowAddIcal] = useState(false)
  const [icalName, setIcalName] = useState('')
  const [icalUrl, setIcalUrl] = useState('')
  const [icalColor, setIcalColor] = useState('#3b82f6')
  const [calLoading, setCalLoading] = useState(false)

  // Google calendar picker
  const [googlePending, setGooglePending] = useState(null)
  const [googleCalendars, setGoogleCalendars] = useState([])
  const [selectedGoogleCals, setSelectedGoogleCals] = useState(new Set())
  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    api.settings.getReminders().then(r => {
      setMorningEnabled(r.morning_enabled)
      setMorningTime(r.morning_time?.slice(0, 5) || '06:00')
      setEveningEnabled(r.evening_enabled)
      setEveningTime(r.evening_time?.slice(0, 5) || '18:00')
    }).catch(() => {})
    // Load calendar connections
    api.calendar.connections().then(setCalConns).catch(() => {})

    // Handle Google OAuth redirect params
    const params = new URLSearchParams(window.location.search)
    const pendingId = params.get('google_pending')
    if (pendingId) {
      setGooglePending(pendingId)
      window.history.replaceState({}, '', '/parent/settings')
      api.calendar.googleCalendars(pendingId).then(data => {
        setGoogleCalendars(data.calendars || [])
        const preSelected = new Set(data.calendars.filter(c => c.selected).map(c => c.id))
        setSelectedGoogleCals(preSelected)
      }).catch(e => setError(e.message))
    }
    const success = params.get('calendar_success')
    if (success) {
      setMsg('Google Calendar connected!')
      window.history.replaceState({}, '', '/parent/settings')
      api.calendar.connections().then(setCalConns).catch(() => {})
    }
    const calError = params.get('calendar_error')
    if (calError) {
      setError('Google Calendar authorization failed. Please try again.')
      window.history.replaceState({}, '', '/parent/settings')
    }
  }, [])

  const TIMEZONES = [
    'Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Perth',
    'Australia/Adelaide', 'Australia/Hobart', 'Australia/Darwin',
    'Pacific/Auckland', 'America/New_York', 'America/Chicago', 'America/Denver',
    'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
    'Asia/Tokyo', 'Asia/Singapore', 'Asia/Kolkata',
  ]

  const handleSaveAccount = async (e) => {
    e.preventDefault()
    setMsg(null)
    setError(null)
    try {
      await api.settings.updateAccount({ currency, timezone, display_name: displayName, family_size: familySize }, pin)
      await refreshUser()
      setMsg('Account updated!')
    } catch (e) {
      setError(e.message)
    }
  }

  const handleChangePin = async (e) => {
    e.preventDefault()
    setMsg(null)
    setError(null)
    if (!/^\d{4,6}$/.test(newPin)) {
      setError('PIN must be 4-6 digits')
      return
    }
    try {
      await api.settings.setPin({ pin: newPin })
      setNewPin('')
      setMsg('PIN updated!')
    } catch (e) {
      setError(e.message)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setMsg(null)
    setError(null)
    try {
      await api.settings.changePassword({ current_password: currentPassword, new_password: newPassword }, pin)
      setCurrentPassword('')
      setNewPassword('')
      setMsg('Password changed!')
    } catch (e) {
      setError(e.message)
    }
  }

  const handleSaveReminders = async (e) => {
    e.preventDefault()
    setMsg(null)
    setError(null)
    try {
      await api.settings.updateReminders({
        morning_enabled: morningEnabled,
        morning_time: morningTime,
        evening_enabled: eveningEnabled,
        evening_time: eveningTime,
      }, pin)
      setMsg('Reminder settings saved!')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div>
      <h1 className="mb-lg">Account Settings</h1>

      {msg && <div className="msg-success">{msg}</div>}
      {error && <div className="msg-error">{error}</div>}

      {/* Theme */}
      <div className="card mb-lg">
        <h3 className="mb-md">Theme</h3>
        <ThemeSelector
          current={theme}
          onChange={(t) => {
            setTheme(t)
            applyTheme(t)
          }}
        />
      </div>

      {/* Account Details */}
      <div className="card mb-lg">
        <h3 className="mb-md">Account Details</h3>
        <form onSubmit={handleSaveAccount}>
          <div className="field">
            <label>Family Name</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)}>
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Timezone</label>
            <select value={timezone} onChange={e => setTimezone(e.target.value)}>
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Family Size</label>
            <input type="number" min="1" max="20" value={familySize} onChange={e => setFamilySize(Number(e.target.value))} />
            <small style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
              Used to scale meal ingredients for your shopping list
            </small>
          </div>
          <button className="btn btn-primary" type="submit">Save</button>
        </form>
      </div>

      {/* Change PIN */}
      <div className="card mb-lg">
        <h3 className="mb-md">{user?.has_pin ? 'Change PIN' : 'Set PIN'}</h3>
        <form onSubmit={handleChangePin}>
          <div className="field">
            <label>New PIN (4-6 digits)</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4,6}"
              value={newPin}
              onChange={e => setNewPin(e.target.value)}
              placeholder="Enter 4-6 digit PIN"
              required
            />
          </div>
          <button className="btn btn-primary" type="submit">
            {user?.has_pin ? 'Change PIN' : 'Set PIN'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="card mb-lg">
        <h3 className="mb-md">Change Password</h3>
        <form onSubmit={handleChangePassword}>
          <div className="field">
            <label>Current Password</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
          </div>
          <div className="field">
            <label>New Password (min 8 characters)</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={8} required />
          </div>
          <button className="btn btn-primary" type="submit">Change Password</button>
        </form>
      </div>

      {/* Reminders */}
      <div className="card mb-lg">
        <h3 className="mb-md">Reminder Settings</h3>
        <form onSubmit={handleSaveReminders}>
          <div className="field">
            <label>
              <input type="checkbox" checked={morningEnabled} onChange={e => setMorningEnabled(e.target.checked)} style={{ marginRight: '0.5rem' }} />
              Morning Reminder
            </label>
            {morningEnabled && (
              <input type="time" value={morningTime} onChange={e => setMorningTime(e.target.value)} style={{ marginTop: '0.5rem' }} />
            )}
          </div>
          <div className="field">
            <label>
              <input type="checkbox" checked={eveningEnabled} onChange={e => setEveningEnabled(e.target.checked)} style={{ marginRight: '0.5rem' }} />
              Evening Reminder (uncompleted tasks)
            </label>
            {eveningEnabled && (
              <input type="time" value={eveningTime} onChange={e => setEveningTime(e.target.value)} style={{ marginTop: '0.5rem' }} />
            )}
          </div>
          <button className="btn btn-primary" type="submit">Save Reminders</button>
        </form>
      </div>

      {/* Calendar Feeds */}
      <div className="card mb-lg">
        <h3 className="mb-md">Calendar Feeds</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Connect external calendars to see events on the family calendar. Add iCal feeds from Google Calendar, Apple Calendar, Outlook, or any other calendar app.
        </p>

        {/* Existing connections */}
        {calConns.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            {calConns.map(conn => (
              <div key={conn.id} className="cal-conn-row">
                <span className="cal-conn-color" style={{ background: conn.color }} />
                <div className="cal-conn-info">
                  <div className="cal-conn-name">
                    {conn.provider === 'google' ? '\uD83D\uDD35' : '\uD83D\uDCC5'} {conn.name}
                  </div>
                  {conn.last_synced_at && (
                    <div className="cal-conn-sync">
                      Last synced: {new Date(conn.last_synced_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                    </div>
                  )}
                </div>
                <div className="cal-conn-actions">
                  <label className="cal-conn-toggle" title={conn.is_enabled ? 'Enabled' : 'Disabled'}>
                    <input
                      type="checkbox"
                      checked={conn.is_enabled}
                      onChange={async () => {
                        try {
                          const updated = await api.calendar.updateConnection(conn.id, { is_enabled: !conn.is_enabled }, pin)
                          setCalConns(prev => prev.map(c => c.id === conn.id ? updated : c))
                        } catch {}
                      }}
                    />
                    <span className="cal-toggle-slider" />
                  </label>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={async () => {
                      setCalLoading(true)
                      try {
                        const updated = await api.calendar.syncConnection(conn.id, pin)
                        setCalConns(prev => prev.map(c => c.id === conn.id ? updated : c))
                        setMsg('Calendar synced!')
                      } catch (e) {
                        setError(e.message)
                      } finally {
                        setCalLoading(false)
                      }
                    }}
                    disabled={calLoading}
                  >
                    {calLoading ? '...' : 'Sync'}
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={async () => {
                      if (!confirm('Remove this calendar feed?')) return
                      try {
                        await api.calendar.deleteConnection(conn.id, pin)
                        setCalConns(prev => prev.filter(c => c.id !== conn.id))
                        setMsg('Calendar removed')
                      } catch (e) {
                        setError(e.message)
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add iCal feed form */}
        {showAddIcal ? (
          <form onSubmit={async (e) => {
            e.preventDefault()
            setCalLoading(true)
            setError(null)
            try {
              const newConn = await api.calendar.addConnection({
                provider: 'ical',
                name: icalName,
                ical_url: icalUrl,
                color: icalColor,
              }, pin)
              setCalConns(prev => [...prev, newConn])
              setIcalName('')
              setIcalUrl('')
              setIcalColor('#3b82f6')
              setShowAddIcal(false)
              if (newConn.sync_warning) {
                setError(newConn.sync_warning)
              } else {
                setMsg('Calendar feed added and synced!')
              }
            } catch (e) {
              setError(e.message)
            } finally {
              setCalLoading(false)
            }
          }}>
            <div className="field">
              <label>Feed Name</label>
              <input
                type="text"
                placeholder="e.g. Mum's Calendar, School Events"
                value={icalName}
                onChange={e => setIcalName(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>iCal URL (.ics)</label>
              <input
                type="text"
                placeholder="https:// or webcal:// calendar URL"
                value={icalUrl}
                onChange={e => setIcalUrl(e.target.value)}
                required
              />
              <small style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                Paste a webcal:// or https:// link from your calendar app's sharing settings
              </small>
            </div>
            <div className="field">
              <label>Colour</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {FEED_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setIcalColor(c)}
                    style={{
                      width: '2rem', height: '2rem', borderRadius: '50%', background: c,
                      border: icalColor === c ? '3px solid var(--text-primary)' : '2px solid transparent',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" type="submit" disabled={calLoading}>
                {calLoading ? 'Adding...' : 'Add Feed'}
              </button>
              <button className="btn btn-outline" type="button" onClick={() => setShowAddIcal(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={() => setShowAddIcal(true)}>
              + Add iCal Feed
            </button>
            <button
              className="btn btn-outline"
              onClick={async () => {
                try {
                  const { url } = await api.calendar.googleAuthUrl(pin)
                  // Redirect in same tab - OAuth will redirect back to /parent/settings
                  window.location.href = url
                } catch (e) {
                  if (e.message.includes('not configured')) {
                    setError('Google Calendar is not configured on this server yet')
                  } else {
                    setError(e.message)
                  }
                }
              }}
            >
              Connect Google Calendar
            </button>
          </div>
        )}

        {googlePending && googleCalendars.length > 0 && (
          <div className="card mb-lg" style={{ marginTop: '1rem', border: '2px solid var(--primary)', padding: '1rem' }}>
            <h4 style={{ marginBottom: '0.75rem' }}>Select Google Calendars</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              Choose which calendars to sync with your family calendar:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {googleCalendars.map(cal => (
                <label
                  key={cal.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.5rem', borderRadius: '8px', cursor: 'pointer',
                    background: selectedGoogleCals.has(cal.id) ? 'var(--primary-bg)' : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedGoogleCals.has(cal.id)}
                    onChange={() => {
                      setSelectedGoogleCals(prev => {
                        const next = new Set(prev)
                        if (next.has(cal.id)) next.delete(cal.id)
                        else next.add(cal.id)
                        return next
                      })
                    }}
                  />
                  <span
                    style={{ width: '12px', height: '12px', borderRadius: '50%', background: cal.background_color, flexShrink: 0 }}
                  />
                  <span style={{ fontWeight: cal.primary ? 600 : 400 }}>
                    {cal.summary}
                    {cal.primary && <span style={{ color: 'var(--muted)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>(Primary)</span>}
                  </span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-primary"
                disabled={selectedGoogleCals.size === 0 || googleLoading}
                onClick={async () => {
                  setGoogleLoading(true)
                  setError(null)
                  try {
                    const cals = googleCalendars
                      .filter(c => selectedGoogleCals.has(c.id))
                      .map(c => ({ id: c.id, name: c.summary, color: c.background_color }))
                    await api.calendar.selectGoogleCalendars(googlePending, cals, pin)
                    setGooglePending(null)
                    setGoogleCalendars([])
                    setMsg('Google calendars connected!')
                    const conns = await api.calendar.connections()
                    setCalConns(conns)
                  } catch (e) {
                    setError(e.message)
                  } finally {
                    setGoogleLoading(false)
                  }
                }}
              >
                {googleLoading ? 'Connecting...' : `Connect ${selectedGoogleCals.size} Calendar${selectedGoogleCals.size !== 1 ? 's' : ''}`}
              </button>
              <button className="btn btn-outline" onClick={() => { setGooglePending(null); setGoogleCalendars([]) }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
