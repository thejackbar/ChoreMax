import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api/client'
import { useChild } from '../context/ChildContext'
import PinModal from '../components/PinModal'
import { Reminders, isRemindersSupported } from '../native/reminders'
import { getRemindersSettings } from '../native/remindersSettings'

const CATEGORIES = [
  { id: 'general',      label: 'General',      emoji: '\uD83D\uDCCB' },
  { id: 'errands',      label: 'Errands',       emoji: '\uD83D\uDE97' },
  { id: 'household',    label: 'Household',     emoji: '\uD83C\uDFE0' },
  { id: 'appointments', label: 'Appointments',  emoji: '\uD83D\uDCC5' },
  { id: 'school',       label: 'School',        emoji: '\uD83C\uDFEB' },
  { id: 'shopping',     label: 'Shopping',      emoji: '\uD83D\uDED2' },
]
const getCatEmoji = (id) => CATEGORIES.find(c => c.id === id)?.emoji || '\uD83D\uDCCB'

const PRIORITY_LABELS = { 0: '', 1: '!!!', 5: '!!', 9: '!' }
const PRIORITY_COLORS = { 0: '', 1: 'var(--danger)', 5: 'var(--warning, #f59e0b)', 9: 'var(--text-secondary)' }

// ── Apple Reminder form (create / edit) ─────────────────────────────────────
function AppleReminderModal({ lists, initialListId, reminder, onSave, onClose }) {
  const [title,   setTitle]   = useState(reminder?.title   || '')
  const [notes,   setNotes]   = useState(reminder?.notes   || '')
  const [dueDate, setDueDate] = useState(
    reminder?.dueDate ? reminder.dueDate.slice(0, 10) : ''
  )
  const [listId,  setListId]  = useState(reminder?.listId || initialListId || lists[0]?.id || '')
  const [priority, setPriority] = useState(reminder?.priority ?? 0)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError(null)
    try {
      const dueDateISO = dueDate ? new Date(dueDate + 'T09:00:00').toISOString() : undefined
      if (reminder) {
        await Reminders.updateReminder({
          id: reminder.id,
          title: title.trim(),
          notes: notes || undefined,
          dueDate: dueDateISO,
          priority,
        })
      } else {
        await Reminders.createReminder({
          title: title.trim(),
          listId,
          notes: notes || undefined,
          dueDate: dueDateISO,
          priority,
        })
      }
      onSave()
    } catch (e) {
      setError(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
        <h2 style={{ marginBottom: '1rem' }}>
          🍎 {reminder ? 'Edit Reminder' : 'New Reminder'}
        </h2>
        {error && <div className="msg-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>
          {!reminder && lists.length > 1 && (
            <div className="field">
              <label>List</label>
              <select value={listId} onChange={e => setListId(e.target.value)}>
                {lists.map(l => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="field">
              <label>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Priority</label>
              <select value={priority} onChange={e => setPriority(Number(e.target.value))}>
                <option value={0}>None</option>
                <option value={9}>Low !</option>
                <option value={5}>Medium !!</option>
                <option value={1}>High !!!</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes..."
            />
          </div>
          <div className="flex gap-sm" style={{ marginTop: '0.5rem' }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : reminder ? 'Save' : 'Add Reminder'}
            </button>
            <button className="btn btn-outline" type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function TodoList() {
  const { children } = useChild()
  const [todos,          setTodos]          = useState([])
  const [loading,        setLoading]        = useState(true)
  const [showCompleted,  setShowCompleted]  = useState(false)
  const [filterCat,      setFilterCat]      = useState('')
  const [showForm,       setShowForm]       = useState(false)
  const [editItem,       setEditItem]       = useState(null)
  const [deleteItem,     setDeleteItem]     = useState(null)
  const [pinError,       setPinError]       = useState(null)

  // Apple Reminders state
  const [appleLists,     setAppleLists]     = useState([])
  const [appleReminders, setAppleReminders] = useState({})  // { listId: [reminder] }
  const [appleCompleted, setAppleCompleted] = useState({})  // { listId: [reminder] }
  const [showAppleDone,  setShowAppleDone]  = useState({})  // { listId: bool }
  const [appleModal,     setAppleModal]     = useState(null) // { listId } or { reminder }
  const [appleLoading,   setAppleLoading]   = useState(false)

  // ChoreMax form state
  const [title,      setTitle]      = useState('')
  const [description,setDescription]= useState('')
  const [category,   setCategory]   = useState('general')
  const [priority,   setPriority]   = useState(0)
  const [dueDate,    setDueDate]    = useState('')
  const [assignedTo, setAssignedTo] = useState('')

  const pin = sessionStorage.getItem('parentPin')
  const remindersEnabled = isRemindersSupported() && (() => {
    const s = getRemindersSettings()
    return s.enabled && s.todoListIds?.length > 0
  })()

  // ── Fetch ChoreMax todos ────────────────────────────────────────────────────
  const fetchTodos = useCallback(async () => {
    try {
      const params = {}
      if (showCompleted) params.show_completed = 'true'
      if (filterCat)     params.category       = filterCat
      const data = await api.todos.list(params)
      setTodos(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [showCompleted, filterCat])

  useEffect(() => { fetchTodos() }, [fetchTodos])

  // ── Fetch Apple Reminders ──────────────────────────────────────────────────
  const fetchAppleReminders = useCallback(async () => {
    if (!remindersEnabled) return
    setAppleLoading(true)
    try {
      const prefs = getRemindersSettings()
      const { lists } = await Reminders.getLists()
      const selected = (lists || []).filter(l => prefs.todoListIds.includes(l.id))
      setAppleLists(selected)

      const active    = {}
      const completed = {}
      for (const l of selected) {
        const { reminders: all } = await Reminders.getReminders({
          listIds: [l.id],
          includeCompleted: true,
        })
        active[l.id]    = (all || []).filter(r => !r.completed)
        completed[l.id] = (all || []).filter(r =>  r.completed)
      }
      setAppleReminders(active)
      setAppleCompleted(completed)
    } catch (e) {
      console.warn('Reminders load failed:', e)
    } finally {
      setAppleLoading(false)
    }
  }, [remindersEnabled])

  useEffect(() => { fetchAppleReminders() }, [fetchAppleReminders])

  // Re-fetch when app comes back to foreground (user may have used Reminders app)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchAppleReminders()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [fetchAppleReminders])

  // ── Apple Reminders actions ────────────────────────────────────────────────
  const handleCompleteApple = async (listId, reminder) => {
    try {
      await Reminders.completeReminder({ id: reminder.id, completed: true })
      setAppleReminders(prev => ({
        ...prev,
        [listId]: (prev[listId] || []).filter(r => r.id !== reminder.id),
      }))
      setAppleCompleted(prev => ({
        ...prev,
        [listId]: [{ ...reminder, completed: true }, ...(prev[listId] || [])],
      }))
    } catch (e) { console.error(e) }
  }

  const handleUncompleteApple = async (listId, reminder) => {
    try {
      await Reminders.completeReminder({ id: reminder.id, completed: false })
      setAppleCompleted(prev => ({
        ...prev,
        [listId]: (prev[listId] || []).filter(r => r.id !== reminder.id),
      }))
      setAppleReminders(prev => ({
        ...prev,
        [listId]: [...(prev[listId] || []), { ...reminder, completed: false }],
      }))
    } catch (e) { console.error(e) }
  }

  const handleDeleteApple = async (listId, reminder) => {
    if (!confirm(`Delete "${reminder.title}"?`)) return  // eslint-disable-line no-restricted-globals
    try {
      await Reminders.deleteReminder({ id: reminder.id })
      setAppleReminders(prev => ({
        ...prev,
        [listId]: (prev[listId] || []).filter(r => r.id !== reminder.id),
      }))
      setAppleCompleted(prev => ({
        ...prev,
        [listId]: (prev[listId] || []).filter(r => r.id !== reminder.id),
      }))
    } catch (e) { console.error(e) }
  }

  const handleSaveAppleReminder = async () => {
    setAppleModal(null)
    await fetchAppleReminders()
  }

  // ── ChoreMax actions ───────────────────────────────────────────────────────
  const resetForm = () => {
    setTitle(''); setDescription(''); setCategory('general')
    setPriority(0); setDueDate(''); setAssignedTo('')
    setEditItem(null); setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = {
      title, description: description || null, category, priority,
      due_date: dueDate || null, assigned_to: assignedTo || null,
    }
    try {
      if (editItem) { await api.todos.update(editItem.id, data, pin) }
      else          { await api.todos.create(data, pin) }
      resetForm()
      await fetchTodos()
    } catch (e) { alert(e.message) }
  }

  const handleToggle = async (todo) => {
    try {
      await api.todos.toggle(todo.id)
      setTodos(prev => prev.map(t =>
        t.id === todo.id ? { ...t, is_completed: !t.is_completed } : t
      ))
    } catch (e) { console.error(e) }
  }

  const startEdit = (todo) => {
    setTitle(todo.title); setDescription(todo.description || '')
    setCategory(todo.category); setPriority(todo.priority)
    setDueDate(todo.due_date || ''); setAssignedTo(todo.assigned_to || '')
    setEditItem(todo); setShowForm(true)
  }

  const handleDelete = async (pinVal) => {
    try {
      await api.todos.delete(deleteItem.id, pinVal)
      setDeleteItem(null); setPinError(null)
      await fetchTodos()
    } catch (e) { setPinError(e.message) }
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const activeTodos    = todos.filter(t => !t.is_completed)
  const completedTodos = todos.filter(t =>  t.is_completed)
  const grouped = {}
  activeTodos.forEach(t => {
    if (!grouped[t.category]) grouped[t.category] = []
    grouped[t.category].push(t)
  })

  const getAssignedName = (id) => {
    if (!id) return null
    if (id === 'parent') return 'Parent'
    return children.find(c => c.id === id)?.name || null
  }
  const isOverdue = (d) => d && new Date(d + 'T23:59:59') < new Date()

  if (loading) return <div className="text-center mt-lg">Loading...</div>

  return (
    <div>
      <div className="flex-between mb-lg" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1>Lists</h1>
          <p className="text-muted text-sm" style={{ marginTop: '0.25rem' }}>
            {activeTodos.length} active
            {completedTodos.length > 0 && ` · ${completedTodos.length} done`}
          </p>
        </div>
        <div className="flex gap-sm">
          {remindersEnabled && (
            <button
              className="btn btn-sm btn-outline"
              onClick={fetchAppleReminders}
              title="Sync with Apple Reminders"
            >
              {appleLoading ? '⏳' : '🔄'} Sync
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true) }}>
            + Add Task
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="todo-filters mb-md">
        <button className={`mp-filter ${!filterCat ? 'active' : ''}`} onClick={() => setFilterCat('')}>
          All
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            className={`mp-filter ${filterCat === c.id ? 'active' : ''}`}
            onClick={() => setFilterCat(filterCat === c.id ? '' : c.id)}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {/* ── Apple Reminders sections ── */}
      {appleLists.map(list => {
        const active    = appleReminders[list.id] || []
        const done      = appleCompleted[list.id] || []
        const showDone  = showAppleDone[list.id]

        return (
          <div key={`apple-${list.id}`} className="todo-group mb-md">
            <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
              <h3 className="todo-group-title" style={{ margin: 0 }}>
                🍎 {list.title}
                <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '0.4rem' }}>
                  Apple Reminders
                </span>
              </h3>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setAppleModal({ listId: list.id })}
              >
                + Add
              </button>
            </div>

            <div className="todo-list">
              {active.length === 0 && done.length === 0 && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', padding: '0.5rem 0' }}>
                  No reminders
                </div>
              )}
              {active.map(r => (
                <div key={r.id} className="todo-item">
                  <button className="todo-check" onClick={() => handleCompleteApple(list.id, r)}>
                    ⬜
                  </button>
                  <div className="todo-content" onClick={() => setAppleModal({ reminder: r })}>
                    <span className="todo-title">{r.title}</span>
                    <div className="todo-meta">
                      {r.dueDate && (
                        <span className={`todo-due ${new Date(r.dueDate) < new Date() ? 'overdue' : ''}`}>
                          📅 {new Date(r.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      {r.priority > 0 && (
                        <span style={{ color: PRIORITY_COLORS[r.priority], fontWeight: 700, fontSize: '0.8rem' }}>
                          {PRIORITY_LABELS[r.priority]}
                        </span>
                      )}
                      {r.notes && (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          📝 {r.notes.slice(0, 40)}{r.notes.length > 40 ? '…' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className="todo-delete"
                    onClick={() => handleDeleteApple(list.id, r)}
                    title="Delete reminder"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Completed reminders in this list */}
            {done.length > 0 && (
              <>
                <button
                  className="btn btn-sm btn-outline"
                  style={{ marginTop: '0.5rem' }}
                  onClick={() => setShowAppleDone(prev => ({ ...prev, [list.id]: !showDone }))}
                >
                  {showDone ? 'Hide' : 'Show'} {done.length} completed
                </button>
                {showDone && (
                  <div className="todo-list" style={{ marginTop: '0.5rem', opacity: 0.6 }}>
                    {done.map(r => (
                      <div key={r.id} className="todo-item todo-item--done">
                        <button
                          className="todo-check"
                          onClick={() => handleUncompleteApple(list.id, r)}
                          title="Mark as incomplete"
                        >
                          ✅
                        </button>
                        <div className="todo-content">
                          <span className="todo-title" style={{ textDecoration: 'line-through' }}>
                            {r.title}
                          </span>
                        </div>
                        <button
                          className="todo-delete"
                          onClick={() => handleDeleteApple(list.id, r)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}

      {/* ── ChoreMax todos ── */}
      {Object.keys(grouped).length === 0 && !showCompleted && appleLists.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
          <h3>All clear!</h3>
          <p className="text-muted">No tasks to do. Add one to get started.</p>
        </div>
      )}

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="todo-group mb-md">
          <h3 className="todo-group-title">{getCatEmoji(cat)} {CATEGORIES.find(c => c.id === cat)?.label || cat}</h3>
          <div className="todo-list">
            {items.map(todo => (
              <div key={todo.id} className={`todo-item ${todo.is_completed ? 'todo-item--done' : ''} ${isOverdue(todo.due_date) && !todo.is_completed ? 'todo-item--overdue' : ''}`}>
                <button className="todo-check" onClick={() => handleToggle(todo)}>
                  {todo.is_completed ? '✅' : '⬜'}
                </button>
                <div className="todo-content" onClick={() => startEdit(todo)}>
                  <span className="todo-title">{todo.title}</span>
                  <div className="todo-meta">
                    {todo.due_date && (
                      <span className={`todo-due ${isOverdue(todo.due_date) ? 'overdue' : ''}`}>
                        📅 {new Date(todo.due_date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    {todo.assigned_to && (
                      <span className="todo-assigned">👤 {getAssignedName(todo.assigned_to)}</span>
                    )}
                    {todo.priority > 0 && (
                      <span className="todo-priority">{'!'.repeat(todo.priority)}</span>
                    )}
                  </div>
                </div>
                <button className="todo-delete" onClick={() => setDeleteItem(todo)}>×</button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {completedTodos.length > 0 && (
        <button className="btn btn-sm btn-outline mb-md" onClick={() => setShowCompleted(!showCompleted)}>
          {showCompleted ? 'Hide' : 'Show'} {completedTodos.length} completed
        </button>
      )}
      {showCompleted && completedTodos.length > 0 && (
        <div className="todo-group mb-md" style={{ opacity: 0.6 }}>
          <h3 className="todo-group-title">✅ Completed</h3>
          <div className="todo-list">
            {completedTodos.map(todo => (
              <div key={todo.id} className="todo-item todo-item--done">
                <button className="todo-check" onClick={() => handleToggle(todo)}>✅</button>
                <div className="todo-content"><span className="todo-title">{todo.title}</span></div>
                <button className="todo-delete" onClick={() => setDeleteItem(todo)}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ChoreMax task form modal ── */}
      {showForm && (
        <div className="modal-overlay" onClick={() => resetForm()}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2>{editItem ? 'Edit Task' : 'New Task'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} required autoFocus />
              </div>
              <div className="field">
                <label>Description (optional)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="field">
                  <label>Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)}>
                    {CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Priority</label>
                  <select value={priority} onChange={e => setPriority(Number(e.target.value))}>
                    <option value={0}>Normal</option>
                    <option value={1}>High</option>
                    <option value={2}>Urgent</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="field">
                  <label>Due Date</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
                <div className="field">
                  <label>Assign To</label>
                  <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                    <option value="">Unassigned</option>
                    <option value="parent">Parent</option>
                    {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-sm" style={{ marginTop: '0.5rem' }}>
                <button className="btn btn-primary" type="submit">{editItem ? 'Save' : 'Add Task'}</button>
                <button className="btn btn-outline" type="button" onClick={resetForm}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Apple Reminder create / edit modal ── */}
      {appleModal && (
        <AppleReminderModal
          lists={appleLists}
          initialListId={appleModal.listId}
          reminder={appleModal.reminder || null}
          onSave={handleSaveAppleReminder}
          onClose={() => setAppleModal(null)}
        />
      )}

      {deleteItem && (
        <PinModal
          title={`Delete "${deleteItem.title}"?`}
          error={pinError}
          onSubmit={handleDelete}
          onCancel={() => { setDeleteItem(null); setPinError(null) }}
        />
      )}
    </div>
  )
}
