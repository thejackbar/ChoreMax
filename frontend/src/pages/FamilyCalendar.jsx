import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { getAvatarEmoji } from '../data/avatars'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function FamilyCalendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1) // 1-indexed
  const [days, setDays] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [loading, setLoading] = useState(true)
  const [googleAvailable, setGoogleAvailable] = useState(false)

  const fetchMonth = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.calendar.month(year, month)
      setDays(data.days || [])
      setGoogleAvailable(data.google_available || false)
    } catch (e) {
      console.error('Calendar fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => { fetchMonth() }, [fetchMonth])

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }
  const goToToday = () => {
    const t = new Date()
    setYear(t.getFullYear())
    setMonth(t.getMonth() + 1)
    setSelectedDay(null)
  }

  // Build calendar grid (Monday start)
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay()
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 // Mon=0
  const daysInMonth = new Date(year, month, 0).getDate()
  const todayStr = getToday()

  const dayMap = {}
  days.forEach(d => { dayMap[d.date] = d })

  const cells = []
  for (let i = 0; i < startOffset; i++) {
    cells.push({ empty: true, key: `e${i}` })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const data = dayMap[dateStr]
    cells.push({
      empty: false,
      key: dateStr,
      day: d,
      dateStr,
      isToday: dateStr === todayStr,
      events: data?.events || [],
      chores: data?.chores || [],
      meals: data?.meals || [],
    })
  }

  const selectedData = selectedDay ? dayMap[selectedDay] : null

  return (
    <div className="fc-page">
      {/* Header */}
      <div className="fc-header">
        <button className="fc-nav-btn" onClick={prevMonth}>&lsaquo;</button>
        <div className="fc-header-center">
          <h2 className="fc-title">{MONTHS[month - 1]} {year}</h2>
          {(year !== today.getFullYear() || month !== today.getMonth() + 1) && (
            <button className="fc-today-btn" onClick={goToToday}>Today</button>
          )}
        </div>
        <button className="fc-nav-btn" onClick={nextMonth}>&rsaquo;</button>
      </div>

      {loading ? (
        <div className="fc-loading">Loading calendar...</div>
      ) : (
        <div className="fc-body">
          {/* Calendar grid */}
          <div className="fc-grid-area">
            <div className="fc-weekdays">
              {WEEKDAYS.map(w => <div key={w} className="fc-weekday">{w}</div>)}
            </div>
            <div className="fc-grid">
              {cells.map(cell => (
                <div
                  key={cell.key}
                  className={[
                    'fc-cell',
                    cell.empty && 'fc-cell--empty',
                    cell.isToday && 'fc-cell--today',
                    selectedDay === cell.dateStr && 'fc-cell--selected',
                  ].filter(Boolean).join(' ')}
                  onClick={() => !cell.empty && setSelectedDay(cell.dateStr === selectedDay ? null : cell.dateStr)}
                >
                  {!cell.empty && (
                    <>
                      <span className="fc-day-num">{cell.day}</span>
                      <div className="fc-cell-dots">
                        {/* Event dots */}
                        {cell.events.slice(0, 3).map((ev, i) => (
                          <span key={i} className="fc-dot" style={{ background: ev.color }} title={ev.title} />
                        ))}
                        {cell.events.length > 3 && (
                          <span className="fc-dot-more">+{cell.events.length - 3}</span>
                        )}
                        {/* Chore indicators */}
                        {cell.chores.length > 0 && (() => {
                          const totalDone = cell.chores.reduce((s, c) => s + c.completed, 0)
                          const totalAll = cell.chores.reduce((s, c) => s + c.total, 0)
                          const allDone = totalAll > 0 && totalDone >= totalAll
                          const someDone = totalDone > 0 && !allDone
                          return (
                            <span className={`fc-chore-dot ${allDone ? 'fc-chore-done' : someDone ? 'fc-chore-partial' : 'fc-chore-none'}`} />
                          )
                        })()}
                        {/* Meal indicator */}
                        {cell.meals.length > 0 && (
                          <span className="fc-meal-dot" title={cell.meals.map(m => m.meal_name).join(', ')} />
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="fc-legend">
              <span className="fc-legend-item"><span className="fc-dot" style={{ background: '#3b82f6' }} /> Events</span>
              <span className="fc-legend-item"><span className="fc-chore-dot fc-chore-done" /> Chores done</span>
              <span className="fc-legend-item"><span className="fc-chore-dot fc-chore-partial" /> Chores partial</span>
              <span className="fc-legend-item"><span className="fc-meal-dot" /> Meals</span>
            </div>
          </div>

          {/* Day detail panel */}
          {selectedData && (
            <DayDetail
              dateStr={selectedDay}
              data={selectedData}
              onClose={() => setSelectedDay(null)}
            />
          )}
        </div>
      )}
    </div>
  )
}


function DayDetail({ dateStr, data, onClose }) {
  const d = new Date(dateStr + 'T00:00:00')
  const label = d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="fc-detail">
      <div className="fc-detail-header">
        <h3>{label}</h3>
        <button className="fc-detail-close" onClick={onClose}>&times;</button>
      </div>

      {/* Events */}
      {data.events.length > 0 && (
        <div className="fc-detail-section">
          <h4>Events</h4>
          {data.events.map((ev, i) => (
            <div key={i} className="fc-event-card" style={{ borderLeftColor: ev.color }}>
              <div className="fc-event-title">{ev.title}</div>
              {ev.is_all_day ? (
                <div className="fc-event-time">All day</div>
              ) : ev.start_time && (
                <div className="fc-event-time">
                  {ev.start_time}{ev.end_time ? ` - ${ev.end_time}` : ''}
                </div>
              )}
              {ev.location && <div className="fc-event-location">{ev.location}</div>}
              <div className="fc-event-source">{ev.source}</div>
            </div>
          ))}
        </div>
      )}

      {/* Chores */}
      {data.chores.length > 0 && (
        <div className="fc-detail-section">
          <h4>Chores</h4>
          {data.chores.map((ch, i) => (
            <div key={i} className="fc-chore-card">
              <span className="fc-chore-avatar">{getAvatarEmoji(ch.avatar_value)}</span>
              <span className="fc-chore-name">{ch.child_name}</span>
              <span className={`fc-chore-count ${ch.completed >= ch.total ? 'fc-chore-count--done' : ''}`}>
                {ch.completed}/{ch.total}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Meals */}
      {data.meals.length > 0 && (
        <div className="fc-detail-section">
          <h4>Meals</h4>
          {data.meals.map((m, i) => (
            <div key={i} className="fc-meal-card">
              <span className="fc-meal-slot">{m.slot}</span>
              <span className="fc-meal-name">{m.meal_name}</span>
            </div>
          ))}
        </div>
      )}

      {data.events.length === 0 && data.chores.length === 0 && data.meals.length === 0 && (
        <div className="fc-detail-empty">Nothing scheduled</div>
      )}
    </div>
  )
}
