import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useChild } from '../context/ChildContext'
import { formatTokens } from '../data/tokenIcons'
import ConfettiAnimation from '../components/ConfettiAnimation'
import ProgressBar from '../components/ProgressBar'
import EmptyState from '../components/EmptyState'
import PinModal from '../components/PinModal'

export default function ChildWeeklyChores() {
  const { childId } = useParams()
  const navigate = useNavigate()
  const { activeChild } = useChild()
  const [chores, setChores] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [confettiTrigger, setConfettiTrigger] = useState(0)
  const [completing, setCompleting] = useState(null)
  const [undoChore, setUndoChore] = useState(null)
  const [pinError, setPinError] = useState(null)

  const tokenIcon = activeChild?.token_icon || 'star'

  const fetchChores = useCallback(async () => {
    try {
      const data = await api.chores.childWeekly(childId)
      setChores(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [childId])

  useEffect(() => { fetchChores() }, [fetchChores])

  const handleComplete = async (chore) => {
    if (completing) return
    // If fully completed, offer undo on last completion
    if (chore.completed) {
      setUndoChore(chore)
      setPinError(null)
      return
    }
    setCompleting(chore.id)
    try {
      await api.completions.complete({ chore_id: chore.id, child_id: childId })
      setConfettiTrigger(t => t + 1)
      await fetchChores()
      // Only navigate home if ALL weekly chores are now fully done
      const updated = await api.chores.childWeekly(childId)
      const allDone = updated.every(c => c.completed)
      if (allDone) {
        setTimeout(() => navigate('/'), 1500)
      }
    } catch (e) {
      alert(e.message)
    } finally {
      setCompleting(null)
    }
  }

  const handleUndo = async (pin) => {
    try {
      await api.completions.undo(undoChore.completion_id, pin)
      setUndoChore(null)
      setPinError(null)
      await fetchChores()
    } catch (e) {
      setPinError(e.message)
    }
  }

  const filtered = chores.filter(c => {
    if (filter === 'completed') return c.completed
    if (filter === 'uncompleted') return !c.completed
    return true
  })

  // Total completions possible = sum of max_completions per chore
  const totalPossible = chores.reduce((sum, c) => sum + c.max_completions, 0)
  const totalDone = chores.reduce((sum, c) => sum + c.completions_done, 0)

  if (loading) return <div className="text-center mt-lg">Loading...</div>

  return (
    <div>
      <ConfettiAnimation trigger={confettiTrigger} />

      {/* Navigation bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/')}>
          &#x1F46A; Family
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/calendar')}>
          &#x1F4C5; Calendar
        </button>
      </div>

      <div className="chore-progress-header">
        <div className="chore-progress-top">
          <h2>Weekly Chores</h2>
          <span className="text-muted font-heading" style={{ fontSize: '1.1rem' }}>
            {totalDone}/{totalPossible} done
          </span>
        </div>
        <ProgressBar
          current={totalDone}
          target={totalPossible}
          showLabel={false}
        />
      </div>

      <div className="filter-bar">
        {['all', 'uncompleted', 'completed'].map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'completed' ? 'Done' : 'To Do'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={filter === 'uncompleted' ? '\u{1F389}' : '\u{1F4C5}'}
          title={filter === 'uncompleted' ? 'All done for the week!' : 'No weekly chores found'}
          message={filter === 'uncompleted' ? 'Amazing! All weekly chores are completed.' : null}
        />
      ) : (
        <div className="chore-grid">
          {filtered.map(chore => (
            <button
              key={chore.id}
              className={`chore-card ${chore.completed ? 'chore-card--done' : ''}`}
              onClick={() => handleComplete(chore)}
              disabled={completing === chore.id || chore.completed}
            >
              <span className="chore-emoji">{chore.emoji}</span>
              <span className="chore-title">{chore.title}</span>
              <span className="chore-value">{formatTokens(chore.value, tokenIcon)}</span>
              {chore.max_completions > 1 && (
                <span className="chore-progress-badge">
                  {chore.completions_done}/{chore.max_completions}
                </span>
              )}
              {chore.completed && chore.completed_by_name && chore.assignment_type === 'standalone' && (
                <span className="chore-claimed">Done by {chore.completed_by_name}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {undoChore && (
        <PinModal
          title={`Undo "${undoChore.title}"?`}
          error={pinError}
          onSubmit={handleUndo}
          onCancel={() => { setUndoChore(null); setPinError(null) }}
        />
      )}
    </div>
  )
}
