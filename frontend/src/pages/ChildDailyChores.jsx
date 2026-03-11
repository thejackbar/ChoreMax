import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { formatMoney } from '../data/currencies'
import ConfettiAnimation from '../components/ConfettiAnimation'
import ProgressBar from '../components/ProgressBar'
import EmptyState from '../components/EmptyState'
import PinModal from '../components/PinModal'

const getToday = () => new Date().toISOString().split('T')[0]

const formatDisplayDate = (dateStr) => {
  const today = getToday()
  if (dateStr === today) return 'Today'
  const d = new Date(dateStr + 'T00:00:00')
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday'
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function ChildDailyChores() {
  const { childId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [chores, setChores] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [confettiTrigger, setConfettiTrigger] = useState(0)
  const [completing, setCompleting] = useState(null)
  const [undoChore, setUndoChore] = useState(null)
  const [pinError, setPinError] = useState(null)
  const [selectedDate, setSelectedDate] = useState(getToday)

  const isToday = selectedDate === getToday()

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
      if (isToday) {
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

  const goToPreviousDay = () => {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() - 1)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const goToNextDay = () => {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + 1)
    const next = d.toISOString().split('T')[0]
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

  if (loading) return <div className="text-center mt-lg">Loading...</div>

  return (
    <div>
      <ConfettiAnimation trigger={confettiTrigger} />

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
        <div className="chore-grid">
          {filtered.map(chore => (
            <button
              key={chore.id}
              className={`chore-card ${chore.completed ? 'chore-card--done' : ''}`}
              onClick={() => handleComplete(chore)}
              disabled={completing === chore.id}
            >
              <span className="chore-emoji">{chore.emoji}</span>
              <span className="chore-title">{chore.title}</span>
              <span className="chore-value">{formatMoney(chore.value, user?.currency)}</span>
              {chore.completed && chore.completed_by_name && chore.assignment_type === 'standalone' && (
                <span className="chore-claimed">Done by {chore.completed_by_name}</span>
              )}
              {completing === chore.id && <span className="chore-claimed">Completing...</span>}
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
