import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useChild } from '../context/ChildContext'
import PinModal from '../components/PinModal'
import { Reminders, isRemindersSupported } from '../native/reminders'
import { getRemindersSettings } from '../native/remindersSettings'

const CATEGORIES = [
  { id: 'general', label: 'General', emoji: '\uD83D\uDCCB' },
  { id: 'errands', label: 'Errands', emoji: '\uD83D\uDE97' },
  { id: 'household', label: 'Household', emoji: '\uD83C\uDFE0' },
  { id: 'appointments', label: 'Appointments', emoji: '\uD83D\uDCC5' },
  { id: 'school', label: 'School', emoji: '\uD83C\uDFEB' },
  { id: 'shopping', label: 'Shopping', emoji: '\uD83D\uDED2' },
]

const getCatEmoji = (id) => CATEGORIES.find(c => c.id === id)?.emoji || '\uD83D\uDCCB'

export default function TodoList() {
  const { children } = useChild()
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCompleted, setShowCompleted] = useState(false)
  const [filterCat, setFilterCat] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [pinError, setPinError] = useState(null)
  // Apple Reminders: lists the user selected, plus their current reminders
  const [appleLists, setAppleLists] = useState([])       // [{id, title}]
  const [appleReminders, setAppleReminders] = useState({}) // {listId: [{id, title, ...}]}

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [priority, setPriority] = useState(0)
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState('')

  const pin = sessionStorage.getItem('parentPin')

  const fetchTodos = useCallback(async () => {
    try {
      const params = {}
      if (showCompleted) params.show_completed = 'true'
      if (filterCat) params.category = filterCat
      const data = await api.todos.list(params)
      setTodos(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [showCompleted, filterCat])

  useEffect(() => { fetchTodos() }, [fetchTodos])

  // Load Apple Reminders from the lists the user selected in settings.
  useEffect(() => {
    if (!isRemindersSupported()) return
    const prefs = getRemindersSettings()
    if (!prefs.enabled || !prefs.todoListIds || prefs.todoListIds.length === 0) return
    ;(async () => {
      try {
        const { lists } = await Reminders.getLists()
        const selected = (lists || []).filter(l => prefs.todoListIds.includes(l.id))
        setAppleLists(selected)
        const byList = {}
        for (const l of selected) {
          const { reminders } = await Reminders.getReminders({
            listIds: [l.id],
            includeCompleted: false,
          })
          byList[l.id] = reminders || []
        }
        setAppleReminders(byList)
      } catch (e) {
        console.warn('Reminders load failed:', e)
      }
    })()
  }, [])

  const handleToggleAppleReminder = async (listId, reminder) => {
    try {
      await Reminders.completeReminder({ id: reminder.id, completed: true })
      setAppleReminders(prev => ({
        ...prev,
        [listId]: (prev[listId] || []).filter(r => r.id !== reminder.id),
      }))
    } catch (e) {
      console.error(e)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setCategory('general')
    setPriority(0)
    setDueDate('')
    setAssignedTo('')
    setEditItem(null)
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = {
      title,
      description: description || null,
      category,
      priority,
      due_date: dueDate || null,
      assigned_to: assignedTo || null,
    }
    try {
      if (editItem) {
        await api.todos.update(editItem.id, data, pin)
      } else {
        await api.todos.create(data, pin)
      }
      resetForm()
      await fetchTodos()
    } catch (e) {
      alert(e.message)
    }
  }

  const handleToggle = async (todo) => {
    try {
      await api.todos.toggle(todo.id)
      setTodos(prev => prev.map(t =>
        t.id === todo.id ? { ...t, is_completed: !t.is_completed } : t
      ))
    } catch (e) {
      console.error(e)
    }
  }

  const startEdit = (todo) => {
    setTitle(todo.title)
    setDescription(todo.description || '')
    setCategory(todo.category)
    setPriority(todo.priority)
    setDueDate(todo.due_date || '')
    setAssignedTo(todo.assigned_to || '')
    setEditItem(todo)
    setShowForm(true)
  }

  const handleDelete = async (pinVal) => {
    try {
      await api.todos.delete(deleteItem.id, pinVal)
      setDeleteItem(null)
      setPinError(null)
      await fetchTodos()
    } catch (e) {
      setPinError(e.message)
    }
  }

  const activeTodos = todos.filter(t => !t.is_completed)
  const completedTodos = todos.filter(t => t.is_completed)

  // Group active by category
  const grouped = {}
  activeTodos.forEach(t => {
    if (!grouped[t.category]) grouped[t.category] = []
    grouped[t.category].push(t)
  })

  const getAssignedName = (id) => {
    if (!id) return null
    if (id === 'parent') return 'Parent'
    const child = children.find(c => c.id === id)
    return child?.name || null
  }

  const isOverdue = (dueDate) => {
    if (!dueDate) return false
    return new Date(dueDate + 'T23:59:59') < new Date()
  }

  if (loading) return <div className="text-center mt-lg">Loading...</div>

  return (
    <div>
      <div className="flex-between mb-lg" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1>To-Do List</h1>
          <p className="text-muted text-sm" style={{ marginTop: '0.25rem' }}>
            {activeTodos.length} active {completedTodos.length > 0 && `\u00B7 ${completedTodos.length} done`}
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true) }}>
          + Add Task
        </button>
      </div>

      {/* Category filter */}
      <div className="todo-filters mb-md">
        <button
          className={`mp-filter ${!filterCat ? 'active' : ''}`}
          onClick={() => setFilterCat('')}
        >All</button>
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            className={`mp-filter ${filterCat === c.id ? 'active' : ''}`}
            onClick={() => setFilterCat(filterCat === c.id ? '' : c.id)}
          >{c.emoji} {c.label}</button>
        ))}
      </div>

      {/* Active todos grouped by category */}
      {Object.keys(grouped).length === 0 && !showCompleted && (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>&#x2705;</div>
          <h3>All clear!</h3>
          <p className="text-muted">No tasks to do. Add one to get started.</p>
        </div>
      )}

      {appleLists.map(list => {
        const items = appleReminders[list.id] || []
        if (items.length === 0) return null
        return (
          <div key={`apple-${list.id}`} className="todo-group mb-md">
            <h3 className="todo-group-title">&#x1F34E; {list.title} <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>(Apple Reminders)</span></h3>
            <div className="todo-list">
              {items.map(r => (
                <div key={r.id} className="todo-item">
                  <button className="todo-check" onClick={() => handleToggleAppleReminder(list.id, r)}>
                    {'\u2B1C'}
                  </button>
                  <div className="todo-content">
                    <span className="todo-title">{r.title}</span>
                    {r.dueDate && (
                      <div className="todo-meta">
                        <span className="todo-due">&#x1F4C5; {new Date(r.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="todo-group mb-md">
          <h3 className="todo-group-title">{getCatEmoji(cat)} {CATEGORIES.find(c => c.id === cat)?.label || cat}</h3>
          <div className="todo-list">
            {items.map(todo => (
              <div key={todo.id} className={`todo-item ${todo.is_completed ? 'todo-item--done' : ''} ${isOverdue(todo.due_date) && !todo.is_completed ? 'todo-item--overdue' : ''}`}>
                <button className="todo-check" onClick={() => handleToggle(todo)}>
                  {todo.is_completed ? '\u2705' : '\u2B1C'}
                </button>
                <div className="todo-content" onClick={() => startEdit(todo)}>
                  <span className="todo-title">{todo.title}</span>
                  <div className="todo-meta">
                    {todo.due_date && (
                      <span className={`todo-due ${isOverdue(todo.due_date) ? 'overdue' : ''}`}>
                        &#x1F4C5; {new Date(todo.due_date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    {todo.assigned_to && (
                      <span className="todo-assigned">&#x1F464; {getAssignedName(todo.assigned_to)}</span>
                    )}
                    {todo.priority > 0 && (
                      <span className="todo-priority">{'!'.repeat(todo.priority)}</span>
                    )}
                  </div>
                </div>
                <button className="todo-delete" onClick={() => setDeleteItem(todo)}>&times;</button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Show completed toggle */}
      {completedTodos.length > 0 && (
        <button
          className="btn btn-sm btn-outline mb-md"
          onClick={() => setShowCompleted(!showCompleted)}
        >
          {showCompleted ? 'Hide' : 'Show'} {completedTodos.length} completed
        </button>
      )}

      {showCompleted && completedTodos.length > 0 && (
        <div className="todo-group mb-md" style={{ opacity: 0.6 }}>
          <h3 className="todo-group-title">&#x2705; Completed</h3>
          <div className="todo-list">
            {completedTodos.map(todo => (
              <div key={todo.id} className="todo-item todo-item--done">
                <button className="todo-check" onClick={() => handleToggle(todo)}>&#x2705;</button>
                <div className="todo-content">
                  <span className="todo-title">{todo.title}</span>
                </div>
                <button className="todo-delete" onClick={() => setDeleteItem(todo)}>&times;</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit form modal */}
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
                  <label>Due Date (optional)</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
                <div className="field">
                  <label>Assign To</label>
                  <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                    <option value="">Unassigned</option>
                    <option value="parent">Parent</option>
                    {children.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
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
