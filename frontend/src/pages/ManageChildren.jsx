import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { getAvatarEmoji } from '../data/avatars'
import { TOKEN_ICONS, getTokenEmoji, formatTokens } from '../data/tokenIcons'
import AvatarPicker from '../components/AvatarPicker'
import EmptyState from '../components/EmptyState'

const CHILD_COLORS = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#10b981', label: 'Emerald' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#f97316', label: 'Orange' },
  { value: '#ef4444', label: 'Red' },
]

export default function ManageChildren() {
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [avatarValue, setAvatarValue] = useState('bear')
  const [birthday, setBirthday] = useState('')
  const [tokenIcon, setTokenIcon] = useState('star')
  const [color, setColor] = useState('#6366f1')
  const [error, setError] = useState(null)

  // Token adjustment state
  const [adjBalance, setAdjBalance] = useState(null)
  const [adjTokenIcon, setAdjTokenIcon] = useState('star')
  const [adjType, setAdjType] = useState('add')
  const [adjAmount, setAdjAmount] = useState('')
  const [adjDescription, setAdjDescription] = useState('')
  const [adjError, setAdjError] = useState(null)
  const [adjSuccess, setAdjSuccess] = useState(null)
  const [adjLoading, setAdjLoading] = useState(false)

  const pin = sessionStorage.getItem('parentPin')

  const fetchChildren = useCallback(async () => {
    try {
      const data = await api.children.list()
      setChildren(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchChildren() }, [fetchChildren])

  const resetAdjustment = () => {
    setAdjBalance(null)
    setAdjType('add')
    setAdjAmount('')
    setAdjDescription('')
    setAdjError(null)
    setAdjSuccess(null)
  }

  const openAdd = () => {
    setEditing(null)
    setName('')
    setAvatarValue('bear')
    setBirthday('')
    setTokenIcon('star')
    setColor('#6366f1')
    setShowForm(true)
    setError(null)
    resetAdjustment()
  }

  const openEdit = async (child) => {
    setEditing(child)
    setName(child.name)
    setAvatarValue(child.avatar_value)
    setBirthday(child.birthday || '')
    setTokenIcon(child.token_icon || 'star')
    setColor(child.color || '#6366f1')
    setShowForm(true)
    setError(null)
    resetAdjustment()
    try {
      const bal = await api.tokens.balance(child.id)
      setAdjBalance(bal.balance)
      setAdjTokenIcon(bal.token_icon || child.token_icon || 'star')
    } catch {}
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
        token_icon: tokenIcon,
        color,
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
    if (!confirm(`Remove ${child.name}? This will delete all their chore history and token balance.`)) return
    try {
      await api.children.delete(child.id, pin)
      await fetchChildren()
    } catch (e) {
      alert(e.message)
    }
  }

  const handleAdjust = async () => {
    setAdjError(null)
    setAdjSuccess(null)
    if (!adjAmount || Number(adjAmount) <= 0) {
      setAdjError('Enter a valid amount')
      return
    }
    setAdjLoading(true)
    try {
      await api.tokens.adjust({
        child_id: editing.id,
        amount: parseInt(adjAmount),
        type: adjType,
        description: adjDescription || null,
      }, pin)
      const bal = await api.tokens.balance(editing.id)
      setAdjBalance(bal.balance)
      setAdjAmount('')
      setAdjDescription('')
      setAdjSuccess(`${adjType === 'add' ? 'Added' : 'Subtracted'} ${adjAmount} ${getTokenEmoji(adjTokenIcon)} successfully`)
    } catch (e) {
      setAdjError(e.message)
    } finally {
      setAdjLoading(false)
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
            <div className="field">
              <label>Token Icon</label>
              <div className="token-icon-picker">
                {Object.entries(TOKEN_ICONS).map(([key, { emoji, label }]) => (
                  <button
                    key={key}
                    type="button"
                    className={`token-icon-option ${tokenIcon === key ? 'selected' : ''}`}
                    onClick={() => setTokenIcon(key)}
                    title={label}
                  >
                    <span style={{ fontSize: '1.5rem' }}>{emoji}</span>
                    <span style={{ fontSize: '0.7rem' }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Color</label>
              <div className="color-picker">
                {CHILD_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    className={`color-option ${color === c.value ? 'selected' : ''}`}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setColor(c.value)}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-sm">
              <button className="btn btn-primary" type="submit">Save</button>
              <button className="btn btn-outline" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>

          {editing && (
            <>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.5rem 0' }} />
              <h4 style={{ marginBottom: '0.75rem' }}>{getTokenEmoji(adjTokenIcon)} Token Adjustment</h4>
              {adjBalance !== null && (
                <div style={{ marginBottom: '1rem', fontWeight: 600, color: 'var(--secondary)', fontSize: '1.1rem' }}>
                  Current Balance: {formatTokens(adjBalance, adjTokenIcon)}
                </div>
              )}
              {adjError && <div className="msg-error">{adjError}</div>}
              {adjSuccess && <div className="msg-success">{adjSuccess}</div>}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${adjType === 'add' ? 'btn-success' : 'btn-outline'}`}
                  onClick={() => setAdjType('add')}
                >
                  + Add
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${adjType === 'subtract' ? 'btn-danger' : 'btn-outline'}`}
                  onClick={() => setAdjType('subtract')}
                >
                  - Subtract
                </button>
              </div>
              <div className="field">
                <label>Amount</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={adjAmount}
                  onChange={e => setAdjAmount(e.target.value)}
                  placeholder="e.g. 10"
                />
              </div>
              <div className="field">
                <label>Description (optional)</label>
                <input
                  type="text"
                  value={adjDescription}
                  onChange={e => setAdjDescription(e.target.value)}
                  placeholder="e.g. Bonus for helping, Behaviour penalty"
                />
              </div>
              <button
                type="button"
                className={`btn btn-sm ${adjType === 'add' ? 'btn-success' : 'btn-danger'}`}
                onClick={handleAdjust}
                disabled={adjLoading}
              >
                {adjLoading ? 'Processing...' : `${adjType === 'add' ? 'Add' : 'Subtract'} Tokens`}
              </button>
            </>
          )}
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
                    {' \u2022 '}{getTokenEmoji(child.token_icon || 'star')} tokens
                  </div>
                </div>
              </div>
              <div className="manage-item-actions">
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
