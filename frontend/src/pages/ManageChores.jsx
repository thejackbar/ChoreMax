import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { getAvatarEmoji } from '../data/avatars'
import { formatTokens } from '../data/tokenIcons'
import EmptyState from '../components/EmptyState'

export default function ManageChores() {
  const [chores, setChores] = useState([])
  const [children, setChildren] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState(null)
  const pin = sessionStorage.getItem('parentPin')

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('\u2B50')
  const [value, setValue] = useState('')
  const [frequency, setFrequency] = useState('daily')
  const [timeOfDay, setTimeOfDay] = useState('anytime')
  const [timesPerWeek, setTimesPerWeek] = useState(1)
  const [assignmentType, setAssignmentType] = useState('per-child')
  const [assignedChildIds, setAssignedChildIds] = useState([])
  const [assignAll, setAssignAll] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [c, ch] = await Promise.all([api.chores.list(), api.children.list()])
      setChores(c)
      setChildren(ch)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const loadTemplates = async () => {
    if (templates.length === 0) {
      const t = await api.chores.templates()
      setTemplates(t)
    }
    setShowTemplates(true)
  }

  const openAdd = () => {
    setEditing(null)
    setTitle('')
    setDescription('')
    setEmoji('\u2B50')
    setValue('')
    setFrequency('daily')
    setTimeOfDay('anytime')
    setTimesPerWeek(1)
    setAssignmentType('per-child')
    setAssignedChildIds([])
    setAssignAll(true)
    setShowForm(true)
    setShowTemplates(false)
    setError(null)
  }

  const openEdit = (chore) => {
    setEditing(chore)
    setTitle(chore.title)
    setDescription(chore.description || '')
    setEmoji(chore.emoji)
    setValue(String(chore.value))
    setFrequency(chore.frequency)
    setTimeOfDay(chore.time_of_day || 'anytime')
    setTimesPerWeek(chore.times_per_week || 1)
    setAssignmentType(chore.assignment_type)
    setAssignedChildIds(chore.assigned_child_ids || [])
    setAssignAll(!chore.assigned_child_ids?.length || chore.assigned_child_ids.length === children.length)
    setShowForm(true)
    setShowTemplates(false)
    setError(null)
  }

  const useTemplate = (t) => {
    setEditing(null)
    setTitle(t.title)
    setDescription(t.description || '')
    setEmoji(t.emoji)
    setValue(String(t.value))
    setFrequency(t.frequency)
    setTimeOfDay(t.time_of_day || 'anytime')
    setTimesPerWeek(t.times_per_week || 1)
    setAssignmentType('per-child')
    setAssignedChildIds([])
    setAssignAll(true)
    setShowForm(true)
    setShowTemplates(false)
    setError(null)
  }

  const toggleChild = (childId) => {
    setAssignedChildIds(prev =>
      prev.includes(childId) ? prev.filter(id => id !== childId) : [...prev, childId]
    )
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError(null)
    const data = {
      title,
      description: description || null,
      emoji,
      value: parseInt(value) || 0,
      frequency,
      time_of_day: frequency === 'daily' ? timeOfDay : 'anytime',
      times_per_week: frequency === 'weekly' ? timesPerWeek : 1,
      assignment_type: assignmentType,
      assigned_child_ids: assignAll ? null : assignedChildIds,
    }
    try {
      if (editing) {
        await api.chores.update(editing.id, data, pin)
      } else {
        await api.chores.create(data, pin)
      }
      setShowForm(false)
      await fetchData()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleDelete = async (chore) => {
    if (!confirm(`Delete "${chore.title}"?`)) return
    try {
      await api.chores.delete(chore.id, pin)
      await fetchData()
    } catch (e) {
      alert(e.message)
    }
  }

  if (loading) return <div className="text-center mt-lg">Loading...</div>

  return (
    <div>
      <div className="flex-between mb-lg">
        <h1>Manage Chores</h1>
        <div className="flex gap-sm">
          <button className="btn btn-outline" onClick={loadTemplates}>Templates</button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Chore</button>
        </div>
      </div>

      {/* Template picker */}
      {showTemplates && (
        <div className="card mb-lg">
          <div className="flex-between mb-md">
            <h3>Chore Templates</h3>
            <button className="btn btn-sm btn-outline" onClick={() => setShowTemplates(false)}>Close</button>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {templates.map((t, i) => (
              <div key={i} className="manage-item" style={{ cursor: 'pointer' }} onClick={() => useTemplate(t)}>
                <div className="manage-item-info">
                  <span className="item-emoji">{t.emoji}</span>
                  <div>
                    <div className="item-title">{t.title}</div>
                    <div className="item-sub">
                      {t.frequency}
                      {t.time_of_day && t.time_of_day !== 'anytime' ? ` (${t.time_of_day})` : ''}
                      {t.times_per_week > 1 ? ` - ${t.times_per_week}x/week` : ''}
                      {t.description ? ` - ${t.description}` : ''}
                    </div>
                  </div>
                </div>
                <span className="item-value">{t.value} &#x2B50;</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div className="card mb-lg">
          <h3 className="mb-md">{editing ? 'Edit Chore' : 'Add Chore'}</h3>
          {error && <div className="msg-error">{error}</div>}
          <form onSubmit={handleSave}>
            <div className="flex gap-md">
              <div className="field" style={{ flex: 1 }}>
                <label>Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div className="field" style={{ width: '80px' }}>
                <label>Emoji</label>
                <input type="text" value={emoji} onChange={e => setEmoji(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>Description (optional)</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="flex gap-md">
              <div className="field" style={{ flex: 1 }}>
                <label>Token Value</label>
                <input type="number" step="1" min="0" value={value} onChange={e => setValue(e.target.value)} required placeholder="e.g. 10" />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>Frequency</label>
                <select value={frequency} onChange={e => setFrequency(e.target.value)}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>
            {frequency === 'daily' && (
              <div className="field">
                <label>Time of Day</label>
                <select value={timeOfDay} onChange={e => setTimeOfDay(e.target.value)}>
                  <option value="morning">Morning</option>
                  <option value="anytime">Anytime</option>
                  <option value="evening">Evening</option>
                </select>
              </div>
            )}
            {frequency === 'weekly' && (
              <div className="field">
                <label>Times per Week</label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={timesPerWeek}
                  onChange={e => setTimesPerWeek(parseInt(e.target.value) || 1)}
                />
                <small className="text-muted">How many times this chore should be done each week</small>
              </div>
            )}
            <div className="field">
              <label>Assignment Type</label>
              <select value={assignmentType} onChange={e => setAssignmentType(e.target.value)}>
                <option value="per-child">Each child completes independently</option>
                <option value="standalone">Only one child can complete (first come)</option>
              </select>
            </div>
            <div className="field">
              <label>
                <input
                  type="checkbox"
                  checked={assignAll}
                  onChange={e => setAssignAll(e.target.checked)}
                  style={{ marginRight: '0.5rem' }}
                />
                Assign to all children
              </label>
            </div>
            {!assignAll && (
              <div className="field">
                <label>Select Children</label>
                <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                  {children.map(c => (
                    <label key={c.id} className="flex gap-sm" style={{ alignItems: 'center', padding: '0.25rem 0' }}>
                      <input
                        type="checkbox"
                        checked={assignedChildIds.includes(c.id)}
                        onChange={() => toggleChild(c.id)}
                      />
                      {getAvatarEmoji(c.avatar_value)} {c.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-sm">
              <button className="btn btn-primary" type="submit">Save</button>
              <button className="btn btn-outline" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Chore list */}
      {chores.length === 0 && !showForm ? (
        <EmptyState
          icon="&#x2705;"
          title="No chores yet"
          message="Add chores for your children to complete"
          action={
            <div className="flex gap-sm flex-center">
              <button className="btn btn-outline" onClick={loadTemplates}>Use Templates</button>
              <button className="btn btn-primary" onClick={openAdd}>+ Add Chore</button>
            </div>
          }
        />
      ) : (
        <>
          <h3 className="mb-sm">Daily Chores</h3>
          {chores.filter(c => c.frequency === 'daily').map(chore => (
            <div key={chore.id} className="manage-item">
              <div className="manage-item-info">
                <span className="item-emoji">{chore.emoji}</span>
                <div>
                  <div className="item-title">{chore.title}</div>
                  <div className="item-sub">
                    {chore.assignment_type === 'standalone' ? 'First come' : 'Each child'} &middot;
                    {chore.assigned_child_ids.length} children
                    {chore.time_of_day !== 'anytime' && ` \u2022 ${chore.time_of_day}`}
                  </div>
                </div>
              </div>
              <div className="manage-item-actions">
                <span className="item-value">{chore.value} &#x2B50;</span>
                <button className="btn btn-sm btn-outline" onClick={() => openEdit(chore)}>Edit</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(chore)}>Delete</button>
              </div>
            </div>
          ))}

          <h3 className="mb-sm mt-lg">Weekly Chores</h3>
          {chores.filter(c => c.frequency === 'weekly').map(chore => (
            <div key={chore.id} className="manage-item">
              <div className="manage-item-info">
                <span className="item-emoji">{chore.emoji}</span>
                <div>
                  <div className="item-title">{chore.title}</div>
                  <div className="item-sub">
                    {chore.assignment_type === 'standalone' ? 'First come' : 'Each child'} &middot;
                    {chore.assigned_child_ids.length} children
                    {chore.times_per_week > 1 && ` \u2022 ${chore.times_per_week}x/week`}
                  </div>
                </div>
              </div>
              <div className="manage-item-actions">
                <span className="item-value">{chore.value} &#x2B50;</span>
                <button className="btn btn-sm btn-outline" onClick={() => openEdit(chore)}>Edit</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(chore)}>Delete</button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
