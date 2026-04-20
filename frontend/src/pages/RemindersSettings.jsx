import { useState, useEffect } from 'react'
import { Reminders, isRemindersSupported } from '../native/reminders'
import {
  getRemindersSettings,
  setRemindersSettings,
} from '../native/remindersSettings'

export default function RemindersSettings() {
  const remindersSupported = isRemindersSupported()

  const [permission,  setPermission]  = useState('notDetermined')
  const [lists,       setLists]       = useState([])
  const [prefs,       setPrefs]       = useState(getRemindersSettings())
  const [busy,        setBusy]        = useState(false)
  const [msg,         setMsg]         = useState(null)
  const [error,       setError]       = useState(null)

  // On iOS: check current permission + load lists if already authorised
  useEffect(() => {
    if (!remindersSupported) return
    Reminders.checkPermission()
      .then(async r => {
        setPermission(r.status)
        if (r.status === 'authorized' || r.status === 'fullAccess') {
          const { lists: l } = await Reminders.getLists()
          setLists(l || [])
        }
      })
      .catch(() => {})
  }, [remindersSupported])

  const flash = (text, isError = false) => {
    if (isError) setError(text); else setMsg(text)
    setTimeout(() => { setMsg(null); setError(null) }, 3000)
  }

  const save = (patch) => {
    const next = setRemindersSettings(patch)
    setPrefs(next)
    flash('Saved!')
  }

  const handleRequestAccess = async () => {
    setBusy(true)
    try {
      const res = await Reminders.requestPermission()
      setPermission(res.status)
      if (res.granted) {
        const { lists: l } = await Reminders.getLists()
        setLists(l || [])
        flash('Reminders access granted!')
      } else {
        flash('Access not granted. You can enable it in iOS Settings > Privacy > Reminders.', true)
      }
    } catch (e) {
      flash(e.message, true)
    } finally {
      setBusy(false)
    }
  }

  const handleCreateShoppingList = async () => {
    setBusy(true)
    try {
      const res = await Reminders.createList('ChoreMax Shopping')
      const { lists: l } = await Reminders.getLists()
      setLists(l || [])
      save({ enabled: true, shoppingListId: res.id })
      flash('Created "ChoreMax Shopping" list!')
    } catch (e) {
      flash(e.message, true)
    } finally {
      setBusy(false)
    }
  }

  const handleRefreshLists = async () => {
    setBusy(true)
    try {
      const { lists: l } = await Reminders.getLists()
      setLists(l || [])
      flash('Lists refreshed')
    } catch (e) {
      flash(e.message, true)
    } finally {
      setBusy(false)
    }
  }

  const authorised = permission === 'authorized' || permission === 'fullAccess'

  return (
    <div>
      <h1 className="mb-lg">Lists &amp; Reminders</h1>

      {msg   && <div className="msg-success">{msg}</div>}
      {error && <div className="msg-error">{error}</div>}

      {/* Not on iOS */}
      {!remindersSupported && (
        <div className="card mb-lg">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <span style={{ fontSize: '2rem' }}>🍎</span>
            <div>
              <h3 style={{ marginBottom: '0.4rem' }}>Apple Reminders sync</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                This feature is only available in the <strong>ChoreMax iOS app</strong>.
                Install ChoreMax from the App Store to sync your shopping list and to-do
                lists with Apple Reminders across iPhone, iPad and Mac.
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                On the web app, shopping and to-do lists work fully — they just aren't
                connected to Apple Reminders.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* iOS — permission not yet requested */}
      {remindersSupported && (permission === 'notDetermined' || permission === 'unknown') && (
        <div className="card mb-lg">
          <h3 className="mb-md">🍎 Connect Apple Reminders</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Sync your shopping list and to-do lists with Apple Reminders so they appear
            on all your Apple devices — even when ChoreMax isn't open.
          </p>
          <ul style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', paddingLeft: '1.25rem', lineHeight: 1.7 }}>
            <li>Shopping items sync to a Reminders list of your choice (e.g. "Groceries")</li>
            <li>To-do lists you select appear inside ChoreMax</li>
            <li>Changes made in native Reminders sync back automatically</li>
          </ul>
          <button
            className="btn btn-primary"
            onClick={handleRequestAccess}
            disabled={busy}
          >
            {busy ? 'Requesting…' : '🔓 Allow ChoreMax to access Reminders'}
          </button>
        </div>
      )}

      {/* iOS — access denied */}
      {remindersSupported && (permission === 'denied' || permission === 'restricted') && (
        <div className="card mb-lg">
          <h3 className="mb-md">🍎 Reminders access blocked</h3>
          <div className="msg-error" style={{ marginBottom: '0.75rem' }}>
            ChoreMax doesn't have permission to access Reminders.
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>
            Go to <strong>Settings → Privacy &amp; Security → Reminders</strong> and
            allow ChoreMax, then come back here.
          </p>
        </div>
      )}

      {/* iOS — authorised ✓ */}
      {remindersSupported && authorised && (
        <>
          {/* Master toggle */}
          <div className="card mb-lg">
            <h3 className="mb-md">🍎 Apple Reminders sync</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={prefs.enabled}
                onChange={e => save({ enabled: e.target.checked })}
                style={{ width: '1.1rem', height: '1.1rem' }}
              />
              <span>Enable Reminders sync</span>
            </label>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              When enabled, your shopping list and selected to-do lists stay in sync with
              Apple Reminders. Changes made in either app are reflected in the other.
            </p>
          </div>

          {/* Shopping list */}
          <div className="card mb-lg">
            <h3 className="mb-md">🛒 Shopping List</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Choose which Reminders list receives your shopping items. When you check
              something off here it's ticked off in Reminders too, and vice versa.
            </p>
            <div className="field">
              <label>Sync shopping to this list</label>
              <select
                value={prefs.shoppingListId}
                onChange={e => save({ shoppingListId: e.target.value })}
                disabled={!prefs.enabled}
              >
                <option value="">— None —</option>
                {lists.map(l => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-sm" style={{ flexWrap: 'wrap', marginTop: '0.25rem' }}>
              <button
                className="btn btn-outline btn-sm"
                onClick={handleCreateShoppingList}
                disabled={busy || !prefs.enabled}
              >
                ＋ Create "ChoreMax Shopping" list
              </button>
            </div>
          </div>

          {/* To-do lists */}
          <div className="card mb-lg">
            <h3 className="mb-md">✅ To-Do Lists</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Tick the Reminders lists you want to appear on the Lists page inside
              ChoreMax. You can add, complete, and delete reminders from within the app.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {lists.length === 0 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  No lists found. Tap "Refresh lists" below.
                </p>
              )}
              {lists.map(l => {
                const checked = prefs.todoListIds.includes(l.id)
                return (
                  <label
                    key={l.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.4rem 0',
                      cursor: prefs.enabled ? 'pointer' : 'default',
                      opacity: prefs.enabled ? 1 : 0.5,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!prefs.enabled}
                      style={{ width: '1.1rem', height: '1.1rem' }}
                      onChange={e => {
                        const ids = new Set(prefs.todoListIds)
                        if (e.target.checked) ids.add(l.id); else ids.delete(l.id)
                        save({ todoListIds: Array.from(ids) })
                      }}
                    />
                    <span style={{ flex: 1 }}>{l.title}</span>
                    {l.source && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {l.source}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          </div>

          {/* Utility */}
          <div className="card mb-lg">
            <h3 className="mb-md">Manage</h3>
            <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
              <button
                className="btn btn-outline btn-sm"
                onClick={handleRefreshLists}
                disabled={busy}
              >
                🔄 Refresh lists
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  if (confirm('Disable Reminders sync and clear all list selections?')) {
                    save({ enabled: false, shoppingListId: '', todoListIds: [] })
                  }
                }}
              >
                Disconnect Reminders
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.75rem' }}>
              Disconnecting only removes the link inside ChoreMax — your Reminders lists
              and their items are not deleted.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
