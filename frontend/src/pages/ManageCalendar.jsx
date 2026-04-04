import { useState, useEffect } from 'react'
import { api } from '../api/client'

const FEED_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

export default function ManageCalendar() {
  const pin = sessionStorage.getItem('parentPin')
  const [calConns, setCalConns] = useState([])
  const [showAddIcal, setShowAddIcal] = useState(false)
  const [icalName, setIcalName] = useState('')
  const [icalUrl, setIcalUrl] = useState('')
  const [icalColor, setIcalColor] = useState('#3b82f6')
  const [calLoading, setCalLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [error, setError] = useState(null)

  // Google calendar picker
  const [googlePending, setGooglePending] = useState(null)
  const [googleCalendars, setGoogleCalendars] = useState([])
  const [selectedGoogleCals, setSelectedGoogleCals] = useState(new Set())
  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    api.calendar.connections().then(setCalConns).catch(() => {})

    // Handle Google OAuth redirect params
    const params = new URLSearchParams(window.location.search)
    const pendingId = params.get('google_pending')
    if (pendingId) {
      setGooglePending(pendingId)
      window.history.replaceState({}, '', '/parent/calendar')
      api.calendar.googleCalendars(pendingId).then(data => {
        setGoogleCalendars(data.calendars || [])
        const preSelected = new Set(data.calendars.filter(c => c.selected).map(c => c.id))
        setSelectedGoogleCals(preSelected)
      }).catch(e => setError(e.message))
    }
    const success = params.get('calendar_success')
    if (success) {
      setMsg('Google Calendar connected!')
      window.history.replaceState({}, '', '/parent/calendar')
      api.calendar.connections().then(setCalConns).catch(() => {})
    }
    const calError = params.get('calendar_error')
    if (calError) {
      setError('Google Calendar authorization failed. Please try again.')
      window.history.replaceState({}, '', '/parent/calendar')
    }
  }, [])

  return (
    <div>
      <h1 className="mb-lg">Manage Calendar</h1>

      {msg && <div className="msg-success">{msg}</div>}
      {error && <div className="msg-error">{error}</div>}

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
