import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { getAvatarEmoji } from '../data/avatars'
import { getTokenEmoji, formatTokens } from '../data/tokenIcons'
import EmptyState from '../components/EmptyState'

export default function ManageGoals() {
  const [goals, setGoals] = useState([])
  const [children, setChildren] = useState([])
  const [balances, setBalances] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState(null)

  // Form state
  const [title, setTitle] = useState('')
  const [tokenCost, setTokenCost] = useState('')
  const [emoji, setEmoji] = useState('\u{1F3AF}')

  // Redeem state
  const [redeemGoal, setRedeemGoal] = useState(null)
  const [redeemChild, setRedeemChild] = useState('')
  const [redeemError, setRedeemError] = useState(null)
  const [redeemSuccess, setRedeemSuccess] = useState(null)

  const pin = sessionStorage.getItem('parentPin')

  const fetchData = useCallback(async () => {
    try {
      const [g, ch] = await Promise.all([
        api.goals.listAll(pin),
        api.children.list(),
      ])
      setGoals(g)
      setChildren(ch)
      // Fetch balances for all children
      const bals = {}
      for (const child of ch) {
        try {
          const b = await api.tokens.balance(child.id)
          bals[child.id] = b
        } catch {}
      }
      setBalances(bals)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [pin])

  useEffect(() => { fetchData() }, [fetchData])

  const openAdd = () => {
    setEditing(null)
    setTitle('')
    setTokenCost('')
    setEmoji('\u{1F3AF}')
    setShowForm(true)
    setError(null)
  }

  const openEdit = (goal) => {
    setEditing(goal)
    setTitle(goal.title)
    setTokenCost(String(goal.token_cost))
    setEmoji(goal.emoji)
    setShowForm(true)
    setError(null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError(null)
    const data = {
      title,
      token_cost: parseInt(tokenCost) || 0,
      emoji,
    }
    try {
      if (editing) {
        await api.goals.update(editing.id, data, pin)
      } else {
        await api.goals.create(data, pin)
      }
      setShowForm(false)
      await fetchData()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleDelete = async (goal) => {
    if (!confirm(`Delete "${goal.title}"?`)) return
    try {
      await api.goals.delete(goal.id, pin)
      await fetchData()
    } catch (e) {
      alert(e.message)
    }
  }

  const openRedeem = (goal) => {
    setRedeemGoal(goal)
    setRedeemChild('')
    setRedeemError(null)
    setRedeemSuccess(null)
  }

  const handleRedeem = async () => {
    if (!redeemChild) {
      setRedeemError('Select a child')
      return
    }
    setRedeemError(null)
    try {
      await api.goals.redeem(redeemGoal.id, { child_id: redeemChild }, pin)
      setRedeemSuccess(`${redeemGoal.title} redeemed!`)
      await fetchData()
      setTimeout(() => {
        setRedeemGoal(null)
        setRedeemSuccess(null)
      }, 2000)
    } catch (e) {
      setRedeemError(e.message)
    }
  }

  if (loading) return <div className="text-center mt-lg">Loading...</div>

  return (
    <div>
      <div className="flex-between mb-lg">
        <h1>Manage Goals</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Goal</button>
      </div>

      {/* Child balances overview */}
      {children.length > 0 && (
        <div className="card mb-lg">
          <h3 className="mb-md">Token Balances</h3>
          <div className="stat-grid">
            {children.map(child => {
              const bal = balances[child.id]
              return (
                <div key={child.id} className="stat-card">
                  <div className="stat-value">
                    {getAvatarEmoji(child.avatar_value)} {bal ? formatTokens(bal.balance, bal.token_icon || child.token_icon) : '...'}
                  </div>
                  <div className="stat-label">{child.name}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div className="card mb-lg">
          <h3 className="mb-md">{editing ? 'Edit Goal' : 'Add Goal'}</h3>
          {error && <div className="msg-error">{error}</div>}
          <form onSubmit={handleSave}>
            <div className="flex gap-md">
              <div className="field" style={{ flex: 1 }}>
                <label>Goal Name</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Tickets to the Footy"
                  required
                />
              </div>
              <div className="field" style={{ width: '80px' }}>
                <label>Emoji</label>
                <input type="text" value={emoji} onChange={e => setEmoji(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>Token Cost</label>
              <input
                type="number"
                step="1"
                min="1"
                value={tokenCost}
                onChange={e => setTokenCost(e.target.value)}
                placeholder="e.g. 200"
                required
              />
              <small className="text-muted">How many tokens this goal costs to redeem</small>
            </div>
            <div className="flex gap-sm">
              <button className="btn btn-primary" type="submit">Save</button>
              <button className="btn btn-outline" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Redeem modal */}
      {redeemGoal && (
        <div className="card mb-lg" style={{ borderColor: 'var(--success)', borderWidth: '2px' }}>
          <h3 className="mb-md">Redeem: {redeemGoal.emoji} {redeemGoal.title}</h3>
          <p className="text-muted mb-md">Cost: {redeemGoal.token_cost} tokens</p>
          {redeemError && <div className="msg-error">{redeemError}</div>}
          {redeemSuccess && <div className="msg-success">{redeemSuccess}</div>}
          {!redeemSuccess && (
            <>
              <div className="field">
                <label>Select Child</label>
                <select value={redeemChild} onChange={e => setRedeemChild(e.target.value)}>
                  <option value="">-- Choose --</option>
                  {children.map(child => {
                    const bal = balances[child.id]
                    const balance = bal?.balance || 0
                    const canAfford = balance >= redeemGoal.token_cost
                    return (
                      <option key={child.id} value={child.id} disabled={!canAfford}>
                        {child.name} ({balance} tokens){!canAfford ? ' - Not enough' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>
              <div className="flex gap-sm">
                <button className="btn btn-success" onClick={handleRedeem}>Redeem</button>
                <button className="btn btn-outline" onClick={() => setRedeemGoal(null)}>Cancel</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Goals list */}
      {goals.length === 0 && !showForm ? (
        <EmptyState
          icon="&#x1F3AF;"
          title="No goals yet"
          message="Create reward goals that children can work toward"
          action={<button className="btn btn-primary" onClick={openAdd}>+ Add Goal</button>}
        />
      ) : (
        goals.map(goal => (
          <div key={goal.id} className="manage-item">
            <div className="manage-item-info">
              <span className="item-emoji">{goal.emoji}</span>
              <div>
                <div className="item-title">{goal.title}</div>
                <div className="item-sub">{goal.token_cost} tokens to redeem</div>
              </div>
            </div>
            <div className="manage-item-actions">
              <button className="btn btn-sm btn-success" onClick={() => openRedeem(goal)}>Redeem</button>
              <button className="btn btn-sm btn-outline" onClick={() => openEdit(goal)}>Edit</button>
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(goal)}>Delete</button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
