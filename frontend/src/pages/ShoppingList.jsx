import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api/client'

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
  const removalTimers = useRef({})
  const pin = sessionStorage.getItem('parentPin')

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
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => { fetchList() }, [fetchList])

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

    try {
      await api.shoppingList.check({
        week_start: weekStart,
        ingredient_name: item.ingredient_name,
        ingredient_unit: item.ingredient_unit,
        checked: !wasChecked,
      })
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

  const handleClearAll = async () => {
    if (!confirm('Clear all checked items?')) return
    try {
      await api.shoppingList.clearChecks(weekStart, pin)
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

  // Group items by category
  const grouped = {}
  if (data?.items) {
    for (const item of data.items) {
      const cat = item.ingredient_category
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(item)
    }
  }

  const totalItems = data?.items?.length || 0
  const checkedItems = data?.items?.filter(i => i.checked).length || 0

  return (
    <div>
      <div className="flex-between mb-lg" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1>Shopping List</h1>
          {totalItems > 0 && (
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {checkedItems}/{totalItems} items checked
            </p>
          )}
        </div>
        <div className="flex gap-sm" style={{ alignItems: 'center' }}>
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
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#x1F6D2;</div>
          <h3>No items yet</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            Plan meals for this week to generate your shopping list
          </p>
        </div>
      ) : (
        <>
          {checkedItems > 0 && (
            <div className="mb-md">
              <button className="btn btn-sm btn-danger" onClick={handleClearAll}>
                Clear Checked Items
              </button>
            </div>
          )}

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
                          <span style={{ fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {Number(item.total_quantity)} {item.ingredient_unit}
                          </span>
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
