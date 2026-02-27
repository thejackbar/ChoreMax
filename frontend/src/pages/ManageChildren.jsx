import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { getAvatarEmoji } from '../data/avatars'
import { formatMoney } from '../data/currencies'
import AvatarPicker from '../components/AvatarPicker'
import EmptyState from '../components/EmptyState'

export default function ManageChildren() {
  const { user } = useAuth()
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [avatarValue, setAvatarValue] = useState('bear')
  const [birthday, setBirthday] = useState('')
  const [error, setError] = useState(null)

  // Goal state
  const [goalChild, setGoalChild] = useState(null)
  const [goalTitle, setGoalTitle] = useState('')
  const [goalValue, setGoalValue] = useState('')
  const [goalEmoji, setGoalEmoji] = useState('\u{1F3AF}')
  const [goalError, setGoalError] = useState(null)
  const [goals, setGoals] = useState({})

  const pin = sessionStorage.getItem('parentPin')
  const currency = user?.currency || 'AUD'

  const fetchChildren = useCallback(async () => {
    try {
      const data = await api.children.list()
      setChildren(data)
      // Fetch active target for each child
      data.forEach(async (child) => {
        try {
          const targets = await api.targets.get(child.id)
          if (targets && targets.length > 0) {
            const active = targets.find(t => t.is_active)
            if (active) {
              setGoals(prev => ({ ...prev, [child.id]: active }))
            }
          }
        } catch {}
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchChildren() }, [fetchChildren])

  const openAdd = () => {
    setEditing(null)
    setName('')
    setAvatarValue('bear')
    setBirthday('')
    setShowForm(true)
    setError(null)
  }

  const openEdit = (child) => {
    setEditing(child)
    setName(child.name)
    setAvatarValue(child.avatar_value)
    setBirthday(child.birthday || '')
    setShowForm(true)
    setError(null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const payload = {
        name,
        avatar_value: avatarValue,
        avatar_type: 'builtin',
        birthday: birthday || null,
      }
      if (editing) {
        await api.children.update(editing.id, payload, pin)
      } else {
        await api.children.create(payload, pin)
      }
      setShowForm(false)
      await fetchChildren()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleDelete = async (child) => {
    if (!confirm(`Remove ${child.name}? This will delete all their chore history and piggy bank.`)) return
    try {
      await api.children.delete(child.id, pin)
      await fetchChildren()
    } catch (e) {
      alert(e.message)
    }
  }

  const openGoalEdit = (child) => {
    const existing = goals[child.id]
    setGoalChild(child)
    setGoalTitle(existing?.title || '')
    setGoalValue(existing?.target_value || '')
    setGoalEmoji(existing?.emoji || '\u{1F3AF}')
    setGoalError(null)
  }

  const handleSaveGoal = async (e) => {
    e.preventDefault()
    setGoalError(null)
    if (!goalTitle || !goalValue) {
      setGoalError('Title and value are required')
      return
    }
    try {
      const existing = goals[goalChild.id]
      if (existing) {
        await api.targets.update(existing.id, {
          title: goalTitle,
          target_value: Number(goalValue),
          emoji: goalEmoji,
        }, pin)
      } else {
        await api.targets.create({
          child_id: goalChild.id,
          title: goalTitle,
          target_value: Number(goalValue),
          emoji: goalEmoji,
        }, pin)
      }
      setGoalChild(null)
      await fetchChildren()
    } catch (e) {
      setGoalError(e.message)
    }
  }

  if (loading) return <div className="text-center mt-lg">Loading...</div>

  return (
    <div>
      <div className="flex-between mb-lg">
        <h1>Manage Children</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Child</button>
      </div>

      {showForm && (
        <div className="card mb-lg">
          <h3 className="mb-md">{editing ? 'Edit Child' : 'Add Child'}</h3>
          {error && <div className="msg-error">{error}</div>}
          <form onSubmit={handleSave}>
            <div className="field">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Child's name"
                required
              />
            </div>
            <div className="field">
              <label>Birthday</label>
              <input
                type="date"
                value={birthday}
                onChange={e => setBirthday(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Avatar</label>
              <AvatarPicker selected={avatarValue} onSelect={setAvatarValue} />
            </div>
            <div className="flex gap-sm">
              <button className="btn btn-primary" type="submit">Save</button>
              <button className="btn btn-outline" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Goal editing modal */}
      {goalChild && (
        <div className="card mb-lg">
          <h3 className="mb-md">Set Goal for {goalChild.name}</h3>
          {goalError && <div className="msg-error">{goalError}</div>}
          <form onSubmit={handleSaveGoal}>
            <div className="field">
              <label>Goal Name</label>
              <input
                type="text"
                value={goalTitle}
                onChange={e => setGoalTitle(e.target.value)}
                placeholder="e.g. New bike, Trip to the zoo"
                required
              />
            </div>
            <div className="field">
              <label>Target Amount ({currency})</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={goalValue}
                onChange={e => setGoalValue(e.target.value)}
                placeholder="e.g. 50.00"
                required
              />
            </div>
            <div className="field">
              <label>Emoji</label>
              <input
                type="text"
                value={goalEmoji}
                onChange={e => setGoalEmoji(e.target.value)}
                style={{ maxWidth: '80px', textAlign: 'center', fontSize: '1.5rem' }}
              />
            </div>
            <div className="flex gap-sm">
              <button className="btn btn-primary" type="submit">Save Goal</button>
              <button className="btn btn-outline" type="button" onClick={() => setGoalChild(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {children.length === 0 && !showForm ? (
        <EmptyState
          icon="&#x1F476;"
          title="No children yet"
          message="Add your first child to get started"
          action={<button className="btn btn-primary" onClick={openAdd}>+ Add Child</button>}
        />
      ) : (
        children.map(child => {
          const goal = goals[child.id]
          const age = child.birthday ? Math.floor((Date.now() - new Date(child.birthday).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null
          return (
            <div key={child.id} className="manage-item" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
              <div className="manage-item-info">
                <span className="item-emoji">{getAvatarEmoji(child.avatar_value)}</span>
                <div>
                  <div className="item-title">{child.name}</div>
                  <div className="item-sub">
                    {age !== null && `Age ${age}`}
                    {child.birthday && ` \u2022 ${new Date(child.birthday + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </div>
                  {goal && (
                    <div className="item-sub" style={{ color: 'var(--secondary)' }}>
                      {goal.emoji} Goal: {goal.title} ({formatMoney(goal.target_value, currency)})
                    </div>
                  )}
                </div>
              </div>
              <div className="manage-item-actions">
                <button className="btn btn-sm btn-secondary" onClick={() => openGoalEdit(child)}>
                  {goal ? 'Edit Goal' : 'Set Goal'}
                </button>
                <button className="btn btn-sm btn-outline" onClick={() => openEdit(child)}>Edit</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(child)}>Delete</button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
