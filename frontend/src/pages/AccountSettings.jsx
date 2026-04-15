import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { CURRENCIES } from '../data/currencies'
import ThemeSelector, { getStoredTheme, applyTheme } from '../components/ThemeSelector'
import { Reminders, isRemindersSupported } from '../native/reminders'
import {
  getRemindersSettings,
  setRemindersSettings,
  REMINDERS_SETTINGS_KEY,
} from '../native/remindersSettings'

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

  // Lists settings
  const [autoAddIngredients, setAutoAddIngredients] = useState(
    user?.auto_add_ingredients_to_list ?? true
  )

  // Default home page
  const [defaultHomePage, setDefaultHomePage] = useState(user?.default_home_page || 'family')
  const [children, setChildren] = useState([])

  useEffect(() => {
    // Load children for the default-home-page picker
    api.children.list().then(setChildren).catch(() => {})
  }, [])

  // Apple Reminders integration (iOS only, device-local settings)
  const remindersSupported = isRemindersSupported()
  const [remindersPermission, setRemindersPermission] = useState('notDetermined')
  const [remindersLists, setRemindersLists] = useState([])
  const [remindersPrefs, setRemindersPrefs] = useState(getRemindersSettings())
  const [remindersBusy, setRemindersBusy] = useState(false)

  useEffect(() => {
    if (!remindersSupported) return
    Reminders.checkPermission()
      .then(r => {
        setRemindersPermission(r.status)
        if (r.status === 'authorized' || r.status === 'fullAccess') {
          return Reminders.getLists().then(({ lists }) => setRemindersLists(lists || []))
        }
      })
      .catch(() => {})
  }, [remindersSupported])

  const handleRequestRemindersAccess = async () => {
    setRemindersBusy(true)
    try {
      const res = await Reminders.requestPermission()
      setRemindersPermission(res.status)
      if (res.granted) {
        const { lists } = await Reminders.getLists()
        setRemindersLists(lists || [])
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setRemindersBusy(false)
    }
  }

  const handleSaveReminders2 = (patch) => {
    const next = setRemindersSettings(patch)
    setRemindersPrefs(next)
    setMsg('Apple Reminders settings saved!')
  }

  const handleCreateGroceriesList = async () => {
    setRemindersBusy(true)
    try {
      const res = await Reminders.createList('ChoreMax Shopping')
      const { lists } = await Reminders.getLists()
      setRemindersLists(lists || [])
      handleSaveReminders2({ enabled: true, shoppingListId: res.id })
    } catch (e) {
      setError(e.message)
    } finally {
      setRemindersBusy(false)
    }
  }

  // Daily reminders (backend)
  const [morningEnabled, setMorningEnabled] = useState(true)
  const [morningTime, setMorningTime] = useState('06:00')
  const [eveningEnabled, setEveningEnabled] = useState(true)
  const [eveningTime, setEveningTime] = useState('18:00')

  useEffect(() => {
    api.settings.getReminders().then(r => {
      setMorningEnabled(r.morning_enabled)
      setMorningTime(r.morning_time?.slice(0, 5) || '06:00')
      setEveningEnabled(r.evening_enabled)
      setEveningTime(r.evening_time?.slice(0, 5) || '18:00')
    }).catch(() => {})
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

  const handleSaveLists = async (e) => {
    e.preventDefault()
    setMsg(null)
    setError(null)
    try {
      await api.settings.updateAccount({ auto_add_ingredients_to_list: autoAddIngredients }, pin)
      await refreshUser()
      setMsg('List settings saved!')
    } catch (e) {
      setError(e.message)
    }
  }

  const handleSaveHome = async (e) => {
    e.preventDefault()
    setMsg(null)
    setError(null)
    try {
      await api.settings.updateAccount({ default_home_page: defaultHomePage }, pin)
      await refreshUser()
      setMsg('Default home page saved!')
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

      {/* Default Home Page */}
      <div className="card mb-lg">
        <h3 className="mb-md">Default Home Page</h3>
        <form onSubmit={handleSaveHome}>
          <div className="field">
            <label>When you open ChoreMax, start on</label>
            <select value={defaultHomePage} onChange={e => setDefaultHomePage(e.target.value)}>
              <option value="family">Family View</option>
              <option value="calendar">Calendar</option>
              <option value="meals">Meal Plan</option>
              {children.map(c => (
                <option key={c.id} value={`child:${c.id}`}>{c.name}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" type="submit">Save</button>
        </form>
      </div>

      {/* Lists */}
      <div className="card mb-lg">
        <h3 className="mb-md">Lists</h3>
        <form onSubmit={handleSaveLists}>
          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={autoAddIngredients}
                onChange={e => setAutoAddIngredients(e.target.checked)}
                style={{ marginRight: '0.5rem' }}
              />
              Automatically add meal ingredients to the shopping list
            </label>
            <small style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
              When off, your shopping list stays empty until you add items manually. Meal plans still work as usual.
            </small>
          </div>
          <button className="btn btn-primary" type="submit">Save List Settings</button>
        </form>
      </div>

      {/* Apple Reminders (iOS only) */}
      {remindersSupported && (
        <div className="card mb-lg">
          <h3 className="mb-md">Apple Reminders Sync</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Sync your shopping list and to-do lists with Apple Reminders so they appear on
            iPhone, iPad, Mac and shared family devices.
          </p>

          {(remindersPermission === 'notDetermined' || remindersPermission === 'unknown') && (
            <button
              className="btn btn-primary"
              type="button"
              disabled={remindersBusy}
              onClick={handleRequestRemindersAccess}
            >
              {remindersBusy ? 'Requesting\u2026' : 'Allow ChoreMax to access Reminders'}
            </button>
          )}

          {(remindersPermission === 'denied' || remindersPermission === 'restricted') && (
            <p className="msg-error">
              Reminders access is blocked. Open Settings &gt; Privacy &amp; Security &gt; Reminders
              and allow ChoreMax.
            </p>
          )}

          {(remindersPermission === 'authorized' || remindersPermission === 'fullAccess') && (
            <>
              <div className="field">
                <label>
                  <input
                    type="checkbox"
                    checked={remindersPrefs.enabled}
                    onChange={e => handleSaveReminders2({ enabled: e.target.checked })}
                    style={{ marginRight: '0.5rem' }}
                  />
                  Enable Apple Reminders sync
                </label>
              </div>

              <div className="field">
                <label>Shopping list target (Reminders list)</label>
                <select
                  value={remindersPrefs.shoppingListId}
                  onChange={e => handleSaveReminders2({ shoppingListId: e.target.value })}
                  disabled={!remindersPrefs.enabled}
                >
                  <option value="">\u2014 None \u2014</option>
                  {remindersLists.map(l => (
                    <option key={l.id} value={l.id}>{l.title}</option>
                  ))}
                </select>
                <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                  New shopping list items will be added to this Reminders list and ticked off
                  when you check them here.
                </small>
              </div>

              <div className="field">
                <label>Show these Reminders lists on the To-Do page</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {remindersLists.length === 0 && (
                    <small style={{ color: 'var(--text-secondary)' }}>No lists found.</small>
                  )}
                  {remindersLists.map(l => {
                    const checked = remindersPrefs.todoListIds.includes(l.id)
                    return (
                      <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!remindersPrefs.enabled}
                          onChange={e => {
                            const ids = new Set(remindersPrefs.todoListIds)
                            if (e.target.checked) ids.add(l.id); else ids.delete(l.id)
                            handleSaveReminders2({ todoListIds: Array.from(ids) })
                          }}
                        />
                        {l.title}
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                <button
                  className="btn btn-outline btn-sm"
                  type="button"
                  onClick={handleCreateGroceriesList}
                  disabled={remindersBusy}
                >
                  Create &ldquo;ChoreMax Shopping&rdquo; list
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  type="button"
                  onClick={async () => {
                    setRemindersBusy(true)
                    try {
                      const { lists } = await Reminders.getLists()
                      setRemindersLists(lists || [])
                    } finally { setRemindersBusy(false) }
                  }}
                  disabled={remindersBusy}
                >
                  Refresh lists
                </button>
              </div>
            </>
          )}
        </div>
      )}

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

    </div>
  )
}
