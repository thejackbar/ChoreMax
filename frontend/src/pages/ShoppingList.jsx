import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api/client'
import { Reminders, isRemindersSupported } from '../native/reminders'
import { getRemindersSettings } from '../native/remindersSettings'

// Inline "Add item" row shown above the first category card when Reminders sync is on
function AddItemRow({ onAdd, listTitle }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      await onAdd(trimmed)
      setText('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="shopping-add-row">
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={`Add item${listTitle ? ` to ${listTitle}` : ''}…`}
        className="shopping-add-input"
        disabled={saving}
      />
      <button
        type="submit"
        className="btn btn-primary btn-sm"
        disabled={saving || !text.trim()}
      >
        {saving ? '…' : '+ Add'}
      </button>
    </form>
  )
}

function toLocalDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMonday(d = new Date()) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  return toLocalDateStr(date)
}

function addWeeks(dateStr, weeks) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + weeks * 7)
  return toLocalDateStr(d)
}

function formatWeekLabel(weekStart) {
  const start = new Date(weekStart + 'T00:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const opts = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString(undefined, opts)} - ${end.toLocaleDateString(undefined, opts)}`
}

const CATEGORY_LABELS = {
  produce: 'Produce',
  dairy: 'Dairy',
  meat: 'Meat',
  seafood: 'Seafood',
  pantry: 'Pantry',
  frozen: 'Frozen',
  bakery: 'Bakery',
  beverages: 'Beverages',
  condiments: 'Condiments',
  other: 'Other',
}

const CATEGORY_EMOJIS = {
  produce: '\uD83E\uDD66',
  dairy: '\uD83E\uDDC8',
  meat: '\uD83E\uDD69',
  seafood: '\uD83E\uDD90',
  pantry: '\uD83C\uDF7F',
  frozen: '\u2744\uFE0F',
  bakery: '\uD83C\uDF5E',
  beverages: '\uD83E\uDDC3',
  condiments: '\uD83E\uDED9',
  other: '\uD83D\uDED2',
}

export default function ShoppingList() {
  const [weekStart, setWeekStart] = useState(getMonday())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState({})
  const [pendingRemoval, setPendingRemoval] = useState({}) // key -> timeout id
  const [extraItems, setExtraItems] = useState([]) // items pulled from Apple Reminders
  const [syncStatus, setSyncStatus] = useState(null) // 'syncing' | 'ok' | 'error'
  const removalTimers = useRef({})
  // Map of itemKey -> Reminder id (so we can update/delete the matching reminder)
  const reminderIdMap = useRef({})
  const pin = sessionStorage.getItem('parentPin')
  // Cached list title for the "Add item" placeholder
  const [remindersListTitle, setRemindersListTitle] = useState('')

  // Check once per mount whether Apple Reminders sync is turned on + configured.
  const remindersSyncActive = () => {
    if (!isRemindersSupported()) return false
    const s = getRemindersSettings()
    return s.enabled && !!s.shoppingListId
  }

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      Object.values(removalTimers.current).forEach(clearTimeout)
    }
  }, [])

  const fetchList = useCallback(async () => {
    try {
      const result = await api.shoppingList.get(weekStart)
      setData(result)
      // Clear pending removals on fresh fetch
      Object.values(removalTimers.current).forEach(clearTimeout)
      removalTimers.current = {}
      setPendingRemoval({})

      // If Reminders sync is active, pull extra items that were added natively
      // and push any ingredients that aren't yet in the Reminders list.
      if (remindersSyncActive()) {
        setSyncStatus('syncing')
        try {
          const { shoppingListId } = getRemindersSettings()

          // Resolve the list title (for the add-item placeholder) once
          try {
            const { lists } = await Reminders.getLists()
            const found = (lists || []).find(l => l.id === shoppingListId)
            if (found) setRemindersListTitle(found.title)
          } catch {}

          const { reminders } = await Reminders.getReminders({
            listIds: [shoppingListId],
            includeCompleted: false,
          })

          // Build a set of existing titles so we only show native items the
          // meal-plan aggregation didn't already cover.
          const planned = new Set(
            (result.items || []).map(i => i.ingredient_name.toLowerCase())
          )
          const extras = []
          const idMap = {}
          for (const r of reminders) {
            const title = (r.title || '').trim()
            if (!title) continue
            const key = `${title.toLowerCase()}::`
            idMap[key] = r.id
            if (!planned.has(title.toLowerCase())) {
              extras.push({
                ingredient_name: title,
                ingredient_unit: '',
                ingredient_category: 'other',
                total_quantity: '',
                checked: false,
                _remindersOnly: true,
              })
            }
          }
          // Also remember reminder ids for planned items so we can tick them
          for (const i of (result.items || [])) {
            const match = reminders.find(r =>
              (r.title || '').trim().toLowerCase() === i.ingredient_name.toLowerCase()
            )
            if (match) idMap[`${i.ingredient_name}::${i.ingredient_unit}`] = match.id
          }
          reminderIdMap.current = idMap
          setExtraItems(extras)

          // Push planned items that are missing from the Reminders list
          for (const i of (result.items || [])) {
            const k = `${i.ingredient_name}::${i.ingredient_unit}`
            if (!idMap[k]) {
              try {
                const created = await Reminders.createReminder({
                  title: i.ingredient_name.charAt(0).toUpperCase() + i.ingredient_name.slice(1),
                  listId: shoppingListId,
                  notes: i.total_quantity ? `${i.total_quantity} ${i.ingredient_unit}` : undefined,
                })
                reminderIdMap.current[k] = created.id
              } catch {}
            }
          }
          setSyncStatus('ok')
        } catch (e) {
          console.warn('Reminders sync failed:', e)
          setSyncStatus('error')
        }
      } else {
        setSyncStatus(null)
        setExtraItems([])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => { fetchList() }, [fetchList])

  // Re-sync when the user comes back from the native Reminders app
  useEffect(() => {
    if (!isRemindersSupported()) return
    const onVisible = () => {
      if (document.visibilityState === 'visible' && remindersSyncActive()) fetchList()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [fetchList])

  // ── Manual "Add item" (creates a Reminder + appends as extra item) ──────────
  const handleAddItem = async (text) => {
    if (!remindersSyncActive()) return
    const { shoppingListId } = getRemindersSettings()
    const capitalized = text.charAt(0).toUpperCase() + text.slice(1)
    try {
      const created = await Reminders.createReminder({
        title: capitalized,
        listId: shoppingListId,
      })
      const newItem = {
        ingredient_name: text,
        ingredient_unit: '',
        ingredient_category: 'other',
        total_quantity: '',
        checked: false,
        _remindersOnly: true,
      }
      const key = `${text.toLowerCase()}::`
      reminderIdMap.current[key] = created.id
      setExtraItems(prev => [...prev, newItem])
    } catch (e) {
      console.error('Failed to add item to Reminders:', e)
      alert('Could not add item to Reminders. Please try again.')
    }
  }

  const itemKey = (item) => `${item.ingredient_name}::${item.ingredient_unit}`

  const handleCheck = async (item) => {
    const key = itemKey(item)
    const wasChecked = item.checked

    // If unchecking (undo), cancel the pending removal
    if (wasChecked) {
      if (removalTimers.current[key]) {
        clearTimeout(removalTimers.current[key])
        delete removalTimers.current[key]
      }
      setPendingRemoval(prev => { const n = { ...prev }; delete n[key]; return n })
    }

    // If this is a Reminders-only item, just tick it off natively
    if (item._remindersOnly) {
      const rid = reminderIdMap.current[key]
      if (rid) {
        try { await Reminders.completeReminder({ id: rid, completed: !wasChecked }) } catch {}
      }
      setExtraItems(prev => prev.filter(i => itemKey(i) !== key))
      return
    }

    try {
      await api.shoppingList.check({
        week_start: weekStart,
        ingredient_name: item.ingredient_name,
        ingredient_unit: item.ingredient_unit,
        checked: !wasChecked,
      })

      // Mirror state into Apple Reminders if a matching reminder exists
      if (remindersSyncActive()) {
        const rid = reminderIdMap.current[key]
        if (rid) {
          try { await Reminders.completeReminder({ id: rid, completed: !wasChecked }) } catch {}
        }
      }
      // Optimistic update
      setData(prev => ({
        ...prev,
        items: prev.items.map(i =>
          i.ingredient_name === item.ingredient_name && i.ingredient_unit === item.ingredient_unit
            ? { ...i, checked: !wasChecked }
            : i
        ),
      }))

      // If checking off, schedule removal after 3 seconds
      if (!wasChecked) {
        setPendingRemoval(prev => ({ ...prev, [key]: true }))
        removalTimers.current[key] = setTimeout(() => {
          setData(prev => {
            if (!prev) return prev
            return {
              ...prev,
              items: prev.items.filter(i => itemKey(i) !== key || !i.checked),
            }
          })
          setPendingRemoval(prev => { const n = { ...prev }; delete n[key]; return n })
          delete removalTimers.current[key]
        }, 3000)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleRemoveAll = async () => {
    if (!confirm('Remove all items from this week\'s shopping list? They will not come back until you re-plan meals or reset.')) return
    try {
      await api.shoppingList.removeAll(weekStart, pin)
      await fetchList()
    } catch (e) {
      alert(e.message)
    }
  }

  const toggleCategory = (cat) => {
    setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }))
  }

  const isToday = weekStart === getMonday()

  if (loading) return <div className="text-center mt-lg">Loading...</div>

  // Group items by category (planned + extras from Apple Reminders)
  const grouped = {}
  const combined = [...(data?.items || []), ...extraItems]
  for (const item of combined) {
    const cat = item.ingredient_category
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(item)
  }

  const totalItems = combined.length
  const checkedItems = combined.filter(i => i.checked).length

  return (
    <div>
      <div className="flex-between mb-lg" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1>Shopping List</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            {totalItems > 0 && (
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                {checkedItems}/{totalItems} items checked
              </p>
            )}
            {syncStatus === 'syncing' && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>⏳ Syncing Reminders…</span>
            )}
            {syncStatus === 'ok' && (
              <span style={{ fontSize: '0.75rem', color: 'var(--success, #22c55e)' }}>🍎 Reminders synced</span>
            )}
            {syncStatus === 'error' && (
              <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>⚠️ Reminders sync failed</span>
            )}
          </div>
        </div>
        <div className="flex gap-sm" style={{ alignItems: 'center' }}>
          {remindersSyncActive() && (
            <button
              className="btn btn-sm btn-outline"
              onClick={fetchList}
              title="Sync with Apple Reminders"
            >
              {syncStatus === 'syncing' ? '⏳' : '🔄'} Sync
            </button>
          )}
          <button className="btn btn-sm btn-outline" onClick={() => setWeekStart(addWeeks(weekStart, -1))}>&larr;</button>
          <button
            className={`btn btn-sm ${isToday ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setWeekStart(getMonday())}
          >This Week</button>
          <span style={{ fontWeight: 600, minWidth: '160px', textAlign: 'center' }}>{formatWeekLabel(weekStart)}</span>
          <button className="btn btn-sm btn-outline" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>&rarr;</button>
        </div>
      </div>

      {totalItems === 0 ? (
        <div>
          {remindersSyncActive() && (
            <div className="mb-md">
              <AddItemRow onAdd={handleAddItem} listTitle={remindersListTitle} />
            </div>
          )}
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#x1F6D2;</div>
            <h3>No items yet</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Plan meals for this week to generate your shopping list
              {remindersSyncActive() ? ', or add items above.' : '.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-between mb-md" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
            {remindersSyncActive() ? (
              <AddItemRow onAdd={handleAddItem} listTitle={remindersListTitle} />
            ) : (
              <div />
            )}
            <button className="btn btn-sm btn-danger" onClick={handleRemoveAll}>
              Remove All
            </button>
          </div>

          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="card mb-sm">
              <div
                className="flex-between"
                style={{ cursor: 'pointer', padding: '0.25rem 0' }}
                onClick={() => toggleCategory(category)}
              >
                <h3 style={{ fontSize: '1rem' }}>
                  {CATEGORY_EMOJIS[category] || ''} {CATEGORY_LABELS[category] || category}
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '0.5rem' }}>
                    ({items.length})
                  </span>
                </h3>
                <span style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>
                  {collapsed[category] ? '\u25B6' : '\u25BC'}
                </span>
              </div>

              {!collapsed[category] && (
                <div style={{ marginTop: '0.5rem' }}>
                  {items.map(item => {
                    const key = itemKey(item)
                    const isPending = pendingRemoval[key]
                    return (
                      <div
                        key={`${item.ingredient_name}-${item.ingredient_unit}`}
                        className={`shopping-item-row ${isPending ? 'shopping-item-row--removing' : ''}`}
                      >
                        <label
                          className="shopping-item"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.5rem 0',
                            cursor: 'pointer',
                            textDecoration: item.checked ? 'line-through' : 'none',
                            opacity: item.checked ? 0.5 : 1,
                            flex: 1,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => handleCheck(item)}
                            style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }}
                          />
                          <span style={{ flex: 1 }}>
                            {item.ingredient_name.charAt(0).toUpperCase() + item.ingredient_name.slice(1)}
                          </span>
                          {item.total_quantity !== '' && item.total_quantity != null && (
                            <span style={{ fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                              {Number(item.total_quantity)} {item.ingredient_unit}
                            </span>
                          )}
                        </label>
                        {isPending && (
                          <button
                            className="shopping-undo-btn"
                            onClick={() => handleCheck(item)}
                          >
                            Undo
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
