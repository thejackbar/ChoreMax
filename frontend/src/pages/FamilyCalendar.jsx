import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { getAvatarEmoji } from '../data/avatars'
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
  const [googleConns, setGoogleConns] = useState([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let data
      if (view === 'week') {
        data = await api.calendar.week(weekStart)
        setGoogleConns(data.google_connections || [])
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
          googleConns={googleConns}
          onRefresh={fetchData}
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

function WeekView({ days, todayStr, weekStart, googleConns, onRefresh }) {
  const navigate = useNavigate()
  const pin = sessionStorage.getItem('parentPin')

  // Add event state
  const [showAddEvent, setShowAddEvent] = useState(null) // date string or null
  const [eventTitle, setEventTitle] = useState('')
  const [eventAllDay, setEventAllDay] = useState(true)
  const [eventStartTime, setEventStartTime] = useState('09:00')
  const [eventEndTime, setEventEndTime] = useState('10:00')
  const [eventCalendar, setEventCalendar] = useState('')
  const [eventSaving, setEventSaving] = useState(false)
  const [eventError, setEventError] = useState(null)

  // Delete event state
  const [deleteTarget, setDeleteTarget] = useState(null) // event object
  const [pinError, setPinError] = useState(null)

  // Set default calendar when conns load
  useEffect(() => {
    if (googleConns.length > 0 && !eventCalendar) {
      setEventCalendar(googleConns[0].id)
    }
  }, [googleConns])

  const handleAddEvent = async () => {
    if (!eventTitle.trim() || !eventCalendar) return
    setEventSaving(true)
    setEventError(null)
    try {
      await api.calendar.createEvent({
        connection_id: eventCalendar,
        title: eventTitle.trim(),
        start_date: showAddEvent,
        is_all_day: eventAllDay,
        start_time: eventAllDay ? undefined : eventStartTime,
        end_time: eventAllDay ? undefined : eventEndTime,
      }, pin)
      setShowAddEvent(null)
      setEventTitle('')
      setEventAllDay(true)
      await onRefresh()
    } catch (e) {
      setEventError(e.message)
    } finally {
      setEventSaving(false)
    }
  }

  const handleDeleteEvent = async (pinVal) => {
    try {
      await api.calendar.deleteEvent(deleteTarget.id, pinVal)
      setDeleteTarget(null)
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
                <div className="fc-week-section">
                  <div className="fc-week-section-label">
                    Events
                    {googleConns.length > 0 && (
                      <button
                        className="fc-add-btn"
                        onClick={(e) => { e.stopPropagation(); setShowAddEvent(dateStr); setEventError(null) }}
                        title="Add event"
                      >+</button>
                    )}
                  </div>
                  {dayData.events.length > 0 ? dayData.events.map((ev, j) => (
                    <div
                      key={j}
                      className={`fc-week-event ${ev.provider === 'google' ? 'fc-week-event--deletable' : ''}`}
                      style={{ borderLeftColor: ev.color }}
                      onClick={() => ev.provider === 'google' ? setDeleteTarget(ev) : null}
                      title={ev.provider === 'google' ? 'Click to delete' : ''}
                    >
                      <div className="fc-week-event-title">{ev.title}</div>
                      {!ev.is_all_day && ev.start_time && (
                        <div className="fc-week-event-time">{ev.start_time}{ev.end_time ? ` - ${ev.end_time}` : ''}</div>
                      )}
                      {ev.is_all_day && <div className="fc-week-event-time">All day</div>}
                    </div>
                  )) : (
                    <div className="fc-week-section-empty">No events</div>
                  )}
                </div>

                {/* Meals section */}
                <div className="fc-week-section">
                  <div
                    className="fc-week-section-label fc-week-section-label--clickable"
                    onClick={() => navigate('/meals/plan')}
                  >
                    Meals &#x203A;
                  </div>
                  {dayData.meals.length > 0 ? dayData.meals.map((m, j) => (
                    <div
                      key={`m${j}`}
                      className="fc-week-meal fc-week-meal--clickable"
                      onClick={() => navigate('/meals/plan')}
                    >
                      <span className="fc-week-meal-slot">{m.slot}</span>
                      <span className="fc-week-meal-name">{m.meal_name}</span>
                    </div>
                  )) : (
                    <div className="fc-week-section-empty">No meals</div>
                  )}
                </div>

                {/* Chores section - daily progress per child */}
                <div className="fc-week-section">
                  <div className="fc-week-section-label">Chores</div>
                  {dayData.chores.length > 0 ? dayData.chores.map((childData) => {
                    const pct = childData.total > 0 ? Math.round((childData.completed / childData.total) * 100) : 0
                    return (
                      <div
                        key={childData.child_id}
                        className="fc-week-child fc-week-child--clickable"
                        onClick={() => navigate(`/child/${childData.child_id}/dashboard`)}
                      >
                        <div className="fc-week-child-header">
                          <span className="fc-week-child-avatar">{getAvatarEmoji(childData.avatar_value)}</span>
                          <span className="fc-week-child-name">{childData.child_name}</span>
                          <span className={`fc-week-child-count ${childData.completed >= childData.total ? 'done' : ''}`}>
                            {childData.completed}/{childData.total}
                          </span>
                        </div>
                        <div className="fc-week-progress-bar">
                          <div
                            className={`fc-week-progress-fill ${pct >= 100 ? 'fc-week-progress-fill--done' : ''}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  }) : (
                    <div className="fc-week-section-empty">No chores</div>
                  )}
                </div>

              </div>
            </div>
          )
        })}
      </div>

      {/* Add Event Modal */}
      {showAddEvent && (
        <div className="fc-modal-overlay" onClick={() => setShowAddEvent(null)}>
          <div className="fc-modal" onClick={e => e.stopPropagation()}>
            <h3>Add Event - {new Date(showAddEvent + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</h3>
            {eventError && <div className="msg-error" style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>{eventError}</div>}
            <div className="field">
              <label>Title</label>
              <input
                type="text"
                value={eventTitle}
                onChange={e => setEventTitle(e.target.value)}
                placeholder="Event name"
                autoFocus
              />
            </div>
            {googleConns.length > 1 && (
              <div className="field">
                <label>Calendar</label>
                <select value={eventCalendar} onChange={e => setEventCalendar(e.target.value)}>
                  {googleConns.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="field">
              <label>
                <input
                  type="checkbox"
                  checked={eventAllDay}
                  onChange={e => setEventAllDay(e.target.checked)}
                  style={{ marginRight: '0.5rem' }}
                />
                All day
              </label>
            </div>
            {!eventAllDay && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>Start</label>
                  <input type="time" value={eventStartTime} onChange={e => setEventStartTime(e.target.value)} />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>End</label>
                  <input type="time" value={eventEndTime} onChange={e => setEventEndTime(e.target.value)} />
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button className="btn btn-primary" onClick={handleAddEvent} disabled={eventSaving || !eventTitle.trim()}>
                {eventSaving ? 'Saving...' : 'Add Event'}
              </button>
              <button className="btn btn-outline" onClick={() => setShowAddEvent(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Event - PIN confirmation */}
      {deleteTarget && (
        <PinModal
          title={`Delete "${deleteTarget.title}"?`}
          error={pinError}
          onSubmit={handleDeleteEvent}
          onCancel={() => { setDeleteTarget(null); setPinError(null) }}
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
