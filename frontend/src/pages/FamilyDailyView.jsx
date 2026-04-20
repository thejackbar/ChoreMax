import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useChild } from '../context/ChildContext'
import { getAvatarEmoji } from '../data/avatars'
import { formatTokens } from '../data/tokenIcons'
import ConfettiAnimation from '../components/ConfettiAnimation'
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
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })
}

const getDayOfWeek = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'long' })
}

// Get Monday of the week for a given date
const getWeekStart = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
}

const getDayName = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'long' }).toLowerCase()
}

const MEAL_SLOTS = [
  { key: 'breakfast', icon: '\u2615', label: 'Breakfast' },
  { key: 'lunch', icon: '\uD83C\uDF5C', label: 'Lunch' },
  { key: 'dinner', icon: '\uD83C\uDF7D\uFE0F', label: 'Dinner' },
]

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
  const [meals, setMeals] = useState({})
  const [events, setEvents] = useState([])

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

  // Fetch meals and events for the day
  useEffect(() => {
    const weekStart = getWeekStart(selectedDate)
    const dayName = getDayName(selectedDate)

    // Fetch meal plan for the week
    api.mealPlans.getWeek(weekStart).then(plan => {
      const dayMeals = {}
      if (plan?.entries) {
        plan.entries.forEach(entry => {
          if (entry.day_of_week === dayName) {
            dayMeals[entry.meal_type] = entry
          }
        })
      }
      setMeals(dayMeals)
    }).catch(() => setMeals({}))

    // Fetch calendar events for the week and filter to today
    api.calendar.week(weekStart).then(week => {
      if (week?.days) {
        const dayData = week.days.find(d => d.date === selectedDate)
        setEvents(dayData?.events || [])
      } else {
        setEvents([])
      }
    }).catch(() => setEvents([]))
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

  const hasMeals = Object.keys(meals).length > 0
  const hasEvents = events.length > 0

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

          const morning = member.chores.filter(c => c.time_of_day === 'morning')
          const evening = member.chores.filter(c => c.time_of_day === 'evening')
          const anytime = member.chores.filter(c => c.time_of_day === 'anytime')

          return (
            <div key={member.child_id} className={`family-column ${allDone ? 'family-column--done' : ''}`}>
              <div className="family-column-header" onClick={() => goToChild(member)} style={{ cursor: 'pointer' }}>
                <span className="family-avatar">{getAvatarEmoji(member.avatar_value)}</span>
                <span className="family-name">{member.child_name}</span>
                <span className="family-balance">{formatTokens(member.token_balance, member.token_icon)}</span>
              </div>
              <button className="family-hub-btn" onClick={() => goToChild(member)}>
                View {member.child_name}&apos;s Hub →
              </button>

              <div className="family-progress">
                <div className="family-progress-bar">
                  <div
                    className="family-progress-fill"
                    style={{ width: `${pct}%`, background: member.color || 'var(--primary)' }}
                  />
                </div>
                <span className="family-progress-text">{member.completed_count}/{member.total_count}</span>
              </div>

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

      {/* Daily Glance: Meals & Events */}
      {(hasMeals || hasEvents) && (
        <div className="family-glance">
          {hasMeals && (
            <div className="family-glance-card" onClick={() => navigate('/meals/plan')}>
              <h3 className="family-glance-title">&#x1F37D;&#xFE0F; Meals</h3>
              <div className="family-glance-items">
                {MEAL_SLOTS.map(slot => {
                  const entry = meals[slot.key]
                  return (
                    <div key={slot.key} className="family-glance-meal">
                      <span className="family-glance-meal-icon">{slot.icon}</span>
                      <div>
                        <div className="family-glance-meal-type">{slot.label}</div>
                        <div className="family-glance-meal-name">
                          {entry ? (entry.meal_name || entry.custom_text || 'Planned') : '—'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {hasEvents && (
            <div className="family-glance-card" onClick={() => navigate('/calendar')}>
              <h3 className="family-glance-title">&#x1F4C5; Events</h3>
              <div className="family-glance-items">
                {events.slice(0, 5).map((ev, i) => (
                  <div key={i} className="family-glance-event">
                    <span className="family-glance-event-dot" style={{ background: ev.color || 'var(--primary)' }} />
                    <div>
                      <div className="family-glance-event-title">{ev.title}</div>
                      {ev.start_time && (
                        <div className="family-glance-event-time">
                          {ev.start_time.slice(0, 5)}{ev.end_time ? ` - ${ev.end_time.slice(0, 5)}` : ''}
                        </div>
                      )}
                      {ev.is_all_day && <div className="family-glance-event-time">All day</div>}
                    </div>
                  </div>
                ))}
                {events.length > 5 && (
                  <div className="family-glance-more">+{events.length - 5} more</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

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
