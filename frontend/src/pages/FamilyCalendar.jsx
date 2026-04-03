import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { getAvatarEmoji } from '../data/avatars'
import { formatTokens } from '../data/tokenIcons'
import ConfettiAnimation from '../components/ConfettiAnimation'
import PinModal from '../components/PinModal'

const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMonday(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toDateStr(d)
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

function formatWeekRange(weekStart) {
  const s = new Date(weekStart + 'T00:00:00')
  const e = new Date(weekStart + 'T00:00:00')
  e.setDate(e.getDate() + 6)
  const sMonth = s.toLocaleDateString('en-AU', { month: 'short' })
  const eMonth = e.toLocaleDateString('en-AU', { month: 'short' })
  if (sMonth === eMonth) {
    return `${s.getDate()} - ${e.getDate()} ${sMonth} ${s.getFullYear()}`
  }
  return `${s.getDate()} ${sMonth} - ${e.getDate()} ${eMonth} ${s.getFullYear()}`
}

export default function FamilyCalendar() {
  const [view, setView] = useState('week')
  const [weekStart, setWeekStart] = useState(getMonday())
  const [monthYear, setMonthYear] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 })
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [confettiTrigger, setConfettiTrigger] = useState(0)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let data
      if (view === 'week') {
        data = await api.calendar.week(weekStart)
      } else {
        data = await api.calendar.month(monthYear.year, monthYear.month)
      }
      setDays(data.days || [])
    } catch (e) {
      console.error('Calendar fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [view, weekStart, monthYear])

  useEffect(() => { fetchData() }, [fetchData])

  const prevWeek = () => setWeekStart(addDays(weekStart, -7))
  const nextWeek = () => setWeekStart(addDays(weekStart, 7))
  const goThisWeek = () => setWeekStart(getMonday())
  const prevMonth = () => setMonthYear(p => p.month === 1 ? { year: p.year - 1, month: 12 } : { ...p, month: p.month - 1 })
  const nextMonth = () => setMonthYear(p => p.month === 12 ? { year: p.year + 1, month: 1 } : { ...p, month: p.month + 1 })
  const goThisMonth = () => { const t = new Date(); setMonthYear({ year: t.getFullYear(), month: t.getMonth() + 1 }) }

  const todayStr = getToday()
  const isCurrentWeek = weekStart === getMonday()
  const isCurrentMonth = monthYear.year === new Date().getFullYear() && monthYear.month === new Date().getMonth() + 1

  return (
    <div className="fc-page">
      <ConfettiAnimation trigger={confettiTrigger} />

      <div className="fc-header">
        <button className="fc-nav-btn" onClick={view === 'week' ? prevWeek : prevMonth}>&lsaquo;</button>
        <div className="fc-header-center">
          <h2 className="fc-title">
            {view === 'week' ? formatWeekRange(weekStart) : `${MONTHS[monthYear.month - 1]} ${monthYear.year}`}
          </h2>
          {((view === 'week' && !isCurrentWeek) || (view === 'month' && !isCurrentMonth)) && (
            <button className="fc-today-btn" onClick={view === 'week' ? goThisWeek : goThisMonth}>Today</button>
          )}
        </div>
        <button className="fc-nav-btn" onClick={view === 'week' ? nextWeek : nextMonth}>&rsaquo;</button>
      </div>

      <div className="fc-view-toggle">
        <button className={`fc-view-btn ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>Week</button>
        <button className={`fc-view-btn ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>Month</button>
      </div>

      {loading ? (
        <div className="fc-loading">Loading calendar...</div>
      ) : view === 'week' ? (
        <WeekView
          days={days}
          todayStr={todayStr}
          weekStart={weekStart}
          onRefresh={fetchData}
          onConfetti={() => setConfettiTrigger(t => t + 1)}
        />
      ) : (
        <MonthView days={days} todayStr={todayStr} year={monthYear.year} month={monthYear.month} />
      )}
    </div>
  )
}


// ============================================================
// Week View - sectioned columns with chore completion
// ============================================================

function WeekView({ days, todayStr, weekStart, onRefresh, onConfetti }) {
  const navigate = useNavigate()
  const [completing, setCompleting] = useState(null)
  const [undoInfo, setUndoInfo] = useState(null)
  const [pinError, setPinError] = useState(null)

  const handleComplete = async (chore, childId, dateStr) => {
    if (completing) return
    if (chore.completed) {
      setUndoInfo({ chore, childId })
      setPinError(null)
      return
    }
    setCompleting(`${childId}-${chore.id}`)
    try {
      const payload = { chore_id: chore.id, child_id: childId }
      if (dateStr !== getToday()) payload.for_date = dateStr
      await api.completions.complete(payload)
      onConfetti()
      await onRefresh()
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
      await onRefresh()
    } catch (e) {
      setPinError(e.message)
    }
  }

  return (
    <>
      <div className="fc-week">
        {days.map((dayData, i) => {
          const dateStr = dayData.date
          if (!dateStr) return null
          const d = new Date(dateStr + 'T00:00:00')
          const isToday = dateStr === todayStr
          const isPast = dateStr < todayStr
          const isFuture = dateStr > todayStr
          const dayNum = d.getDate()
          const monthShort = d.toLocaleDateString('en-AU', { month: 'short' })

          return (
            <div key={dateStr} className={`fc-week-day ${isToday ? 'fc-week-day--today' : ''} ${isPast ? 'fc-week-day--past' : ''}`}>
              <div className="fc-week-day-header">
                <span className="fc-week-day-name">{WEEKDAYS_SHORT[i]}</span>
                <span className={`fc-week-day-num ${isToday ? 'fc-week-day-num--today' : ''}`}>{dayNum} {monthShort}</span>
              </div>
              <div className="fc-week-day-body">

                {/* Events section */}
                {dayData.events.length > 0 && (
                  <div className="fc-week-section">
                    <div className="fc-week-section-label">Events</div>
                    {dayData.events.map((ev, j) => (
                      <div key={j} className="fc-week-event" style={{ borderLeftColor: ev.color }}>
                        <div className="fc-week-event-title">{ev.title}</div>
                        {!ev.is_all_day && ev.start_time && (
                          <div className="fc-week-event-time">{ev.start_time}{ev.end_time ? ` - ${ev.end_time}` : ''}</div>
                        )}
                        {ev.is_all_day && <div className="fc-week-event-time">All day</div>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Meals section */}
                {dayData.meals.length > 0 && (
                  <div className="fc-week-section">
                    <div
                      className="fc-week-section-label fc-week-section-label--clickable"
                      onClick={() => navigate('/meals/plan')}
                    >
                      Meals &#x203A;
                    </div>
                    {dayData.meals.map((m, j) => (
                      <div
                        key={`m${j}`}
                        className="fc-week-meal fc-week-meal--clickable"
                        onClick={() => navigate('/meals/plan')}
                      >
                        <span className="fc-week-meal-slot">{m.slot}</span>
                        <span className="fc-week-meal-name">{m.meal_name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Chores section - per child */}
                {dayData.chores.length > 0 && (
                  <div className="fc-week-section">
                    <div className="fc-week-section-label">Chores</div>
                    {dayData.chores.map((childData) => (
                      <div key={childData.child_id} className="fc-week-child">
                        <div
                          className="fc-week-child-header fc-week-child-header--clickable"
                          onClick={() => navigate(`/child/${childData.child_id}/daily`)}
                        >
                          <span className="fc-week-child-avatar">{getAvatarEmoji(childData.avatar_value)}</span>
                          <span className="fc-week-child-name">{childData.child_name}</span>
                          <span className={`fc-week-child-count ${childData.completed >= childData.total ? 'done' : ''}`}>
                            {childData.completed}/{childData.total}
                          </span>
                        </div>
                        {/* Individual chores - only show for today and past (completable) */}
                        {childData.chores && (isToday || isPast) && (
                          <div className="fc-week-chore-list">
                            {childData.chores.map(chore => (
                              <button
                                key={chore.id}
                                className={`fc-week-chore-item ${chore.completed ? 'fc-week-chore-item--done' : ''}`}
                                onClick={() => handleComplete(chore, childData.child_id, dateStr)}
                                disabled={completing === `${childData.child_id}-${chore.id}` || isFuture}
                              >
                                <span className="fc-week-chore-check">{chore.completed ? '\u2705' : '\u2B1C'}</span>
                                <span className="fc-week-chore-emoji">{chore.emoji}</span>
                                <span className="fc-week-chore-text">{chore.title}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {dayData.events.length === 0 && dayData.meals.length === 0 && dayData.chores.length === 0 && (
                  <div className="fc-week-empty">-</div>
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
    </>
  )
}


// ============================================================
// Month View - compact grid with dots + detail panel
// ============================================================

function MonthView({ days, todayStr, year, month }) {
  const navigate = useNavigate()
  const dayMap = {}
  days.forEach(d => { dayMap[d.date] = d })

  const firstDayOfMonth = new Date(year, month - 1, 1).getDay()
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1
  const daysInMonth = new Date(year, month, 0).getDate()

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push({ empty: true, key: `e${i}` })
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const data = dayMap[dateStr]
    cells.push({
      empty: false, key: dateStr, day: d, dateStr,
      isToday: dateStr === todayStr,
      events: data?.events || [], chores: data?.chores || [], meals: data?.meals || [],
    })
  }

  const [selectedDay, setSelectedDay] = useState(null)
  const selectedData = selectedDay ? dayMap[selectedDay] : null

  return (
    <div className="fc-body">
      <div className="fc-grid-area">
        <div className="fc-weekdays">
          {WEEKDAYS_SHORT.map(w => <div key={w} className="fc-weekday">{w}</div>)}
        </div>
        <div className="fc-grid">
          {cells.map(cell => (
            <div
              key={cell.key}
              className={[
                'fc-cell', cell.empty && 'fc-cell--empty',
                cell.isToday && 'fc-cell--today',
                selectedDay === cell.dateStr && 'fc-cell--selected',
              ].filter(Boolean).join(' ')}
              onClick={() => !cell.empty && setSelectedDay(cell.dateStr === selectedDay ? null : cell.dateStr)}
            >
              {!cell.empty && (
                <>
                  <span className="fc-day-num">{cell.day}</span>
                  <div className="fc-cell-dots">
                    {cell.events.slice(0, 3).map((ev, i) => (
                      <span key={i} className="fc-dot" style={{ background: ev.color }} />
                    ))}
                    {cell.events.length > 3 && <span className="fc-dot-more">+{cell.events.length - 3}</span>}
                    {cell.chores.length > 0 && (() => {
                      const done = cell.chores.reduce((s, c) => s + c.completed, 0)
                      const total = cell.chores.reduce((s, c) => s + c.total, 0)
                      const allDone = total > 0 && done >= total
                      return <span className={`fc-chore-dot ${allDone ? 'fc-chore-done' : done > 0 ? 'fc-chore-partial' : 'fc-chore-none'}`} />
                    })()}
                    {cell.meals.length > 0 && <span className="fc-meal-dot" />}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="fc-legend">
          <span className="fc-legend-item"><span className="fc-dot" style={{ background: '#3b82f6' }} /> Events</span>
          <span className="fc-legend-item"><span className="fc-chore-dot fc-chore-done" /> Chores done</span>
          <span className="fc-legend-item"><span className="fc-chore-dot fc-chore-partial" /> Chores partial</span>
          <span className="fc-legend-item"><span className="fc-meal-dot" /> Meals</span>
        </div>
      </div>

      {selectedData && (
        <DayDetail dateStr={selectedDay} data={selectedData} onClose={() => setSelectedDay(null)} navigate={navigate} />
      )}
    </div>
  )
}


function DayDetail({ dateStr, data, onClose, navigate }) {
  const d = new Date(dateStr + 'T00:00:00')
  const label = d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="fc-detail">
      <div className="fc-detail-header">
        <h3>{label}</h3>
        <button className="fc-detail-close" onClick={onClose}>&times;</button>
      </div>
      {data.events.length > 0 && (
        <div className="fc-detail-section">
          <h4>Events</h4>
          {data.events.map((ev, i) => (
            <div key={i} className="fc-event-card" style={{ borderLeftColor: ev.color }}>
              <div className="fc-event-title">{ev.title}</div>
              {ev.is_all_day ? <div className="fc-event-time">All day</div> : ev.start_time && (
                <div className="fc-event-time">{ev.start_time}{ev.end_time ? ` - ${ev.end_time}` : ''}</div>
              )}
              {ev.location && <div className="fc-event-location">{ev.location}</div>}
              <div className="fc-event-source">{ev.source}</div>
            </div>
          ))}
        </div>
      )}
      {data.chores.length > 0 && (
        <div className="fc-detail-section">
          <h4>Chores</h4>
          {data.chores.map((ch, i) => (
            <div
              key={i}
              className="fc-chore-card fc-chore-card--clickable"
              onClick={() => ch.child_id ? navigate(`/child/${ch.child_id}/daily`) : null}
            >
              <span className="fc-chore-avatar">{getAvatarEmoji(ch.avatar_value)}</span>
              <span className="fc-chore-name">{ch.child_name}</span>
              <span className={`fc-chore-count ${ch.completed >= ch.total ? 'fc-chore-count--done' : ''}`}>{ch.completed}/{ch.total}</span>
            </div>
          ))}
        </div>
      )}
      {data.meals.length > 0 && (
        <div className="fc-detail-section">
          <h4>Meals</h4>
          {data.meals.map((m, i) => (
            <div key={i} className="fc-meal-card fc-meal-card--clickable" onClick={() => navigate('/meals/plan')}>
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
