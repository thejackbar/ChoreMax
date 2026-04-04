import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useChild } from '../context/ChildContext'
import { formatTokens } from '../data/tokenIcons'
import ConfettiAnimation from '../components/ConfettiAnimation'
import ProgressBar from '../components/ProgressBar'
import EmptyState from '../components/EmptyState'
import PinModal from '../components/PinModal'

const getToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatDisplayDate = (dateStr) => {
  const today = getToday()
  if (dateStr === today) return 'Today'
  const d = new Date(dateStr + 'T00:00:00')
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
  if (dateStr === yStr) return 'Yesterday'
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function ChildDailyChores() {
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
  const [selectedDate, setSelectedDate] = useState(getToday)

  const isToday = selectedDate === getToday()
  const tokenIcon = activeChild?.token_icon || 'star'

  const fetchChores = useCallback(async () => {
    try {
      const forDate = selectedDate === getToday() ? undefined : selectedDate
      const data = await api.chores.childDaily(childId, forDate)
      setChores(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [childId, selectedDate])

  useEffect(() => { fetchChores() }, [fetchChores])

  const handleComplete = async (chore) => {
    if (completing) return
    if (chore.completed) {
      setUndoChore(chore)
      setPinError(null)
      return
    }
    setCompleting(chore.id)
    try {
      const payload = { chore_id: chore.id, child_id: childId }
      if (!isToday) {
        payload.for_date = selectedDate
      }
      await api.completions.complete(payload)
      setConfettiTrigger(t => t + 1)
      await fetchChores()
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

  const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const goToPreviousDay = () => {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() - 1)
    setSelectedDate(toDateStr(d))
  }

  const goToNextDay = () => {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + 1)
    const next = toDateStr(d)
    if (next <= getToday()) {
      setSelectedDate(next)
    }
  }

  const filtered = chores.filter(c => {
    if (filter === 'completed') return c.completed
    if (filter === 'uncompleted') return !c.completed
    return true
  })

  const completedCount = chores.filter(c => c.completed).length

  // Group by time_of_day
  const morningChores = filtered.filter(c => c.time_of_day === 'morning')
  const eveningChores = filtered.filter(c => c.time_of_day === 'evening')
  const anytimeChores = filtered.filter(c => c.time_of_day === 'anytime')

  const renderChoreCard = (chore) => (
    <button
      key={chore.id}
      className={`chore-card ${chore.completed ? 'chore-card--done' : ''}`}
      onClick={() => handleComplete(chore)}
      disabled={completing === chore.id}
    >
      <span className="chore-emoji">{chore.emoji}</span>
      <span className="chore-title">{chore.title}</span>
      <span className="chore-value">{formatTokens(chore.value, tokenIcon)}</span>
      {chore.completed && chore.completed_by_name && chore.assignment_type === 'standalone' && (
        <span className="chore-claimed">Done by {chore.completed_by_name}</span>
      )}
      {completing === chore.id && <span className="chore-claimed">Completing...</span>}
    </button>
  )

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

      {/* Progress header */}
      <div className="chore-progress-header">
        <div className="chore-progress-top">
          <h2>Daily Chores</h2>
          <span className="text-muted font-heading" style={{ fontSize: '1.1rem' }}>
            {completedCount}/{chores.length} done
          </span>
        </div>
        <ProgressBar
          current={completedCount}
          target={chores.length}
          showLabel={false}
        />
      </div>

      {/* Date Navigator */}
      <div className="date-nav">
        <button className="date-nav-btn" onClick={goToPreviousDay}>
          &lsaquo;
        </button>
        <div className="date-nav-center">
          <span className="date-nav-label">{formatDisplayDate(selectedDate)}</span>
          {!isToday && (
            <button className="date-nav-today-btn" onClick={() => setSelectedDate(getToday())}>
              Back to Today
            </button>
          )}
        </div>
        <button
          className="date-nav-btn"
          onClick={goToNextDay}
          disabled={isToday}
        >
          &rsaquo;
        </button>
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
          icon={filter === 'uncompleted' ? '\u{1F389}' : '\u{1F4CB}'}
          title={filter === 'uncompleted'
            ? (isToday ? 'All done for today!' : `All done for ${formatDisplayDate(selectedDate)}!`)
            : 'No chores found'}
          message={filter === 'uncompleted'
            ? (isToday ? 'Great job! All daily chores are completed.' : 'All chores were completed for this day.')
            : null}
        />
      ) : (
        <>
          {morningChores.length > 0 && (
            <div className="chore-section">
              <h3 className="chore-section-title">&#x2600;&#xFE0F; Morning</h3>
              <div className="chore-grid">{morningChores.map(renderChoreCard)}</div>
            </div>
          )}
          {eveningChores.length > 0 && (
            <div className="chore-section">
              <h3 className="chore-section-title">&#x1F319; Evening</h3>
              <div className="chore-grid">{eveningChores.map(renderChoreCard)}</div>
            </div>
          )}
          {anytimeChores.length > 0 && (
            <div className="chore-section">
              {(morningChores.length > 0 || eveningChores.length > 0) && (
                <h3 className="chore-section-title">&#x1F31F; Anytime</h3>
              )}
              <div className="chore-grid">{anytimeChores.map(renderChoreCard)}</div>
            </div>
          )}
        </>
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
