import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useChild } from '../context/ChildContext'
import { getAvatarEmoji } from '../data/avatars'
import { formatTokens } from '../data/tokenIcons'
import ConfettiAnimation from '../components/ConfettiAnimation'
import PinModal from '../components/PinModal'

const getToday = () => new Date().toISOString().split('T')[0]

const formatDisplayDate = (dateStr) => {
  const today = getToday()
  if (dateStr === today) return 'Today'
  const d = new Date(dateStr + 'T00:00:00')
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday'
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })
}

const getDayOfWeek = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'long' })
}

export default function FamilyDailyView() {
  const navigate = useNavigate()
  const { setActiveChild } = useChild()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(getToday)
  const [completing, setCompleting] = useState(null)
  const [confettiTrigger, setConfettiTrigger] = useState(0)
  const [undoInfo, setUndoInfo] = useState(null)
  const [pinError, setPinError] = useState(null)

  const isToday = selectedDate === getToday()

  const fetchData = useCallback(async () => {
    try {
      const forDate = selectedDate === getToday() ? undefined : selectedDate
      const result = await api.dashboard.familyDaily(forDate)
      setData(result)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => { fetchData() }, [fetchData])

  const handleComplete = async (chore, childId) => {
    if (completing) return
    if (chore.completed) {
      setUndoInfo({ chore, childId })
      setPinError(null)
      return
    }
    setCompleting(`${childId}-${chore.id}`)
    try {
      const payload = { chore_id: chore.id, child_id: childId }
      if (!isToday) payload.for_date = selectedDate
      await api.completions.complete(payload)
      setConfettiTrigger(t => t + 1)
      await fetchData()
    } catch (e) {
      alert(e.message)
    } finally {
      setCompleting(null)
    }
  }

  const handleUndo = async (pin) => {
    try {
      await api.completions.undo(undoInfo.chore.completion_id, pin)
      setUndoInfo(null)
      setPinError(null)
      await fetchData()
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
    if (next <= getToday()) setSelectedDate(next)
  }

  const goToChild = (child) => {
    setActiveChild({
      id: child.child_id,
      name: child.child_name,
      avatar_type: child.avatar_type,
      avatar_value: child.avatar_value,
      token_icon: child.token_icon,
      color: child.color,
    })
    navigate(`/child/${child.child_id}`)
  }

  if (loading) return <div className="text-center mt-lg"><h2>Loading...</h2></div>
  if (!data || data.members.length === 0) {
    return (
      <div className="text-center mt-lg">
        <h1>Family View</h1>
        <p className="text-muted mt-md">No children added yet.</p>
        <button className="btn btn-primary mt-md" onClick={() => navigate('/parent/children')}>
          Add Children
        </button>
      </div>
    )
  }

  return (
    <div className="family-view">
      <ConfettiAnimation trigger={confettiTrigger} />

      {/* Date header */}
      <div className="family-date-header">
        <button className="date-nav-btn" onClick={goToPreviousDay}>&lsaquo;</button>
        <div className="family-date-center">
          <h1 className="family-date-title">{formatDisplayDate(selectedDate)}</h1>
          {isToday && <span className="family-date-day">{getDayOfWeek(selectedDate)}</span>}
          {!isToday && (
            <button className="date-nav-today-btn" onClick={() => setSelectedDate(getToday())}>
              Back to Today
            </button>
          )}
        </div>
        <button className="date-nav-btn" onClick={goToNextDay} disabled={isToday}>&rsaquo;</button>
      </div>

      {/* Family columns */}
      <div className="family-columns">
        {data.members.map(member => {
          const allDone = member.total_count > 0 && member.completed_count === member.total_count
          const pct = member.total_count > 0 ? Math.round((member.completed_count / member.total_count) * 100) : 0

          // Group by time_of_day
          const morning = member.chores.filter(c => c.time_of_day === 'morning')
          const evening = member.chores.filter(c => c.time_of_day === 'evening')
          const anytime = member.chores.filter(c => c.time_of_day === 'anytime')

          return (
            <div key={member.child_id} className={`family-column ${allDone ? 'family-column--done' : ''}`}>
              {/* Column header */}
              <button className="family-column-header" onClick={() => goToChild(member)}>
                <span className="family-avatar">{getAvatarEmoji(member.avatar_value)}</span>
                <span className="family-name">{member.child_name}</span>
                <span className="family-balance">{formatTokens(member.token_balance, member.token_icon)}</span>
              </button>

              {/* Progress */}
              <div className="family-progress">
                <div className="family-progress-bar">
                  <div
                    className="family-progress-fill"
                    style={{ width: `${pct}%`, background: member.color || 'var(--primary)' }}
                  />
                </div>
                <span className="family-progress-text">{member.completed_count}/{member.total_count}</span>
              </div>

              {/* Chore list */}
              <div className="family-chores">
                {member.chores.length === 0 && (
                  <div className="family-empty">No chores assigned</div>
                )}

                {morning.length > 0 && (
                  <div className="family-time-group">
                    <div className="family-time-label">&#x2600;&#xFE0F; Morning</div>
                    {morning.map(chore => (
                      <button
                        key={chore.id}
                        className={`family-chore ${chore.completed ? 'family-chore--done' : ''}`}
                        onClick={() => handleComplete(chore, member.child_id)}
                        disabled={completing === `${member.child_id}-${chore.id}`}
                      >
                        <span className="family-chore-check">{chore.completed ? '\u2705' : '\u2B1C'}</span>
                        <span className="family-chore-emoji">{chore.emoji}</span>
                        <span className="family-chore-title">{chore.title}</span>
                      </button>
                    ))}
                  </div>
                )}

                {evening.length > 0 && (
                  <div className="family-time-group">
                    <div className="family-time-label">&#x1F319; Evening</div>
                    {evening.map(chore => (
                      <button
                        key={chore.id}
                        className={`family-chore ${chore.completed ? 'family-chore--done' : ''}`}
                        onClick={() => handleComplete(chore, member.child_id)}
                        disabled={completing === `${member.child_id}-${chore.id}`}
                      >
                        <span className="family-chore-check">{chore.completed ? '\u2705' : '\u2B1C'}</span>
                        <span className="family-chore-emoji">{chore.emoji}</span>
                        <span className="family-chore-title">{chore.title}</span>
                      </button>
                    ))}
                  </div>
                )}

                {anytime.length > 0 && (
                  <div className="family-time-group">
                    {(morning.length > 0 || evening.length > 0) && (
                      <div className="family-time-label">&#x1F31F; Anytime</div>
                    )}
                    {anytime.map(chore => (
                      <button
                        key={chore.id}
                        className={`family-chore ${chore.completed ? 'family-chore--done' : ''}`}
                        onClick={() => handleComplete(chore, member.child_id)}
                        disabled={completing === `${member.child_id}-${chore.id}`}
                      >
                        <span className="family-chore-check">{chore.completed ? '\u2705' : '\u2B1C'}</span>
                        <span className="family-chore-emoji">{chore.emoji}</span>
                        <span className="family-chore-title">{chore.title}</span>
                      </button>
                    ))}
                  </div>
                )}

                {allDone && (
                  <div className="family-all-done">
                    &#x1F389; All done!
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {undoInfo && (
        <PinModal
          title={`Undo "${undoInfo.chore.title}"?`}
          error={pinError}
          onSubmit={handleUndo}
          onCancel={() => { setUndoInfo(null); setPinError(null) }}
        />
      )}
    </div>
  )
}
