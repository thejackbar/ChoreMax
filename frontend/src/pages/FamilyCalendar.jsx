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
  const [view, setView] = useState('week') // 'day' | '3day' | 'week' | 'month'
  const [weekStart, setWeekStart] = useState(getMonday())
  const [dayStart, setDayStart] = useState(() => toDateStr(new Date()))
  const [monthYear, setMonthYear] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 })
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [googleConns, setGoogleConns] = useState([])
  const [familyChildren, setFamilyChildren] = useState([])

  const dayWindowSize = view === 'day' ? 1 : view === '3day' ? 3 : 7

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let data
      if (view === 'month') {
        data = await api.calendar.month(monthYear.year, monthYear.month)
        setDays(data.days || [])
      } else if (view === 'day' || view === '3day') {
        // Fetch the containing week and slice out the visible days
        const containingMonday = getMonday(dayStart)
        data = await api.calendar.week(containingMonday)
        setGoogleConns(data.google_connections || [])
        setFamilyChildren(data.children || [])
        const all = data.days || []
        const startIdx = all.findIndex(d => d.date === dayStart)
        const slice = startIdx >= 0 ? all.slice(startIdx, startIdx + dayWindowSize) : []
        if (slice.length < dayWindowSize) {
          // Spans into next week - fetch next week too
          const nextMonday = addDays(containingMonday, 7)
          const next = await api.calendar.week(nextMonday)
          setDays([...slice, ...(next.days || []).slice(0, dayWindowSize - slice.length)])
        } else {
          setDays(slice)
        }
      } else {
        data = await api.calendar.week(weekStart)
        setGoogleConns(data.google_connections || [])
        setFamilyChildren(data.children || [])
        setDays(data.days || [])
      }
    } catch (e) {
      console.error('Calendar fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [view, weekStart, monthYear, dayStart, dayWindowSize])

  useEffect(() => { fetchData() }, [fetchData])

  const prevWeek = () => setWeekStart(addDays(weekStart, -7))
  const nextWeek = () => setWeekStart(addDays(weekStart, 7))
  const goThisWeek = () => setWeekStart(getMonday())
  const prevMonth = () => setMonthYear(p => p.month === 1 ? { year: p.year - 1, month: 12 } : { ...p, month: p.month - 1 })
  const nextMonth = () => setMonthYear(p => p.month === 12 ? { year: p.year + 1, month: 1 } : { ...p, month: p.month + 1 })
  const goThisMonth = () => { const t = new Date(); setMonthYear({ year: t.getFullYear(), month: t.getMonth() + 1 }) }
  const prevDays = () => setDayStart(addDays(dayStart, -dayWindowSize))
  const nextDays = () => setDayStart(addDays(dayStart, dayWindowSize))
  const goToday = () => setDayStart(toDateStr(new Date()))

  const todayStr = getToday()
  const isCurrentWeek = weekStart === getMonday()
  const isCurrentMonth = monthYear.year === new Date().getFullYear() && monthYear.month === new Date().getMonth() + 1
  const isToday = dayStart === todayStr

  const formatDayRange = () => {
    if (view === 'day') {
      const d = new Date(dayStart + 'T00:00:00')
      return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    }
    const s = new Date(dayStart + 'T00:00:00')
    const e = new Date(dayStart + 'T00:00:00'); e.setDate(e.getDate() + dayWindowSize - 1)
    const sMonth = s.toLocaleDateString('en-AU', { month: 'short' })
    const eMonth = e.toLocaleDateString('en-AU', { month: 'short' })
    if (sMonth === eMonth) return `${s.getDate()} - ${e.getDate()} ${sMonth} ${s.getFullYear()}`
    return `${s.getDate()} ${sMonth} - ${e.getDate()} ${eMonth} ${s.getFullYear()}`
  }

  const handlePrev = () => {
    if (view === 'week') prevWeek()
    else if (view === 'month') prevMonth()
    else prevDays()
  }
  const handleNext = () => {
    if (view === 'week') nextWeek()
    else if (view === 'month') nextMonth()
    else nextDays()
  }
  const handleToday = () => {
    if (view === 'week') goThisWeek()
    else if (view === 'month') goThisMonth()
    else goToday()
  }

  const showTodayBtn = (view === 'week' && !isCurrentWeek)
    || (view === 'month' && !isCurrentMonth)
    || ((view === 'day' || view === '3day') && !isToday)

  return (
    <div className="fc-page">
      <div className="fc-header">
        <button className="fc-nav-btn" onClick={handlePrev}>&lsaquo;</button>
        <div className="fc-header-center">
          <h2 className="fc-title">
            {view === 'week'
              ? formatWeekRange(weekStart)
              : view === 'month'
                ? `${MONTHS[monthYear.month - 1]} ${monthYear.year}`
                : formatDayRange()}
          </h2>
          {showTodayBtn && (
            <button className="fc-today-btn" onClick={handleToday}>Today</button>
          )}
        </div>
        <button className="fc-nav-btn" onClick={handleNext}>&rsaquo;</button>
      </div>

      <div className="fc-view-toggle">
        <button className={`fc-view-btn ${view === 'day' ? 'active' : ''}`} onClick={() => setView('day')}>Day</button>
        <button className={`fc-view-btn ${view === '3day' ? 'active' : ''}`} onClick={() => setView('3day')}>3 Day</button>
        <button className={`fc-view-btn ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>Week</button>
        <button className={`fc-view-btn ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>Month</button>
      </div>

      {loading ? (
        <div className="fc-loading">Loading calendar...</div>
      ) : view === 'month' ? (
        <MonthView days={days} todayStr={todayStr} year={monthYear.year} month={monthYear.month} />
      ) : (
        <WeekView
          days={days}
          todayStr={todayStr}
          weekStart={view === 'week' ? weekStart : dayStart}
          googleConns={googleConns}
          onRefresh={fetchData}
          children={familyChildren}
          windowSize={dayWindowSize}
        />
      )}
    </div>
  )
}


// ============================================================
// Week View - sectioned columns with chore completion
// ============================================================

function WeekView({ days, todayStr, weekStart, googleConns, onRefresh, children: familyChildren, windowSize = 7 }) {
  const navigate = useNavigate()
  const [pin, setPin] = useState(() => sessionStorage.getItem('parentPin'))
  const [pendingPinAction, setPendingPinAction] = useState(null) // () => Promise
  const [pinPromptError, setPinPromptError] = useState(null)

  // If a PIN-requiring action fails with "PIN required", prompt inline and retry
  const withPinPrompt = (action) => async () => {
    try {
      await action(pin)
    } catch (e) {
      const msg = (e?.message || '').toLowerCase()
      if (msg.includes('pin required') || msg.includes('pin not set') || msg.includes('invalid pin')) {
        setPinPromptError(msg.includes('invalid') ? 'Incorrect PIN' : null)
        setPendingPinAction(() => action)
      } else {
        throw e
      }
    }
  }

  const handlePinSubmitted = async (enteredPin) => {
    try {
      await api.settings.verifyPin({ pin: enteredPin })
      sessionStorage.setItem('parentPin', enteredPin)
      setPin(enteredPin)
      const action = pendingPinAction
      setPendingPinAction(null)
      setPinPromptError(null)
      if (action) await action(enteredPin)
    } catch {
      setPinPromptError('Incorrect PIN')
    }
  }

  // Add event state
  const [showAddEvent, setShowAddEvent] = useState(null) // date string or null
  const [eventTitle, setEventTitle] = useState('')
  const [eventAllDay, setEventAllDay] = useState(true)
  const [eventStartTime, setEventStartTime] = useState('09:00')
  const [eventEndTime, setEventEndTime] = useState('10:00')
  const [eventCalendar, setEventCalendar] = useState('')
  const [eventSaving, setEventSaving] = useState(false)
  const [eventError, setEventError] = useState(null)
  const [eventAssigned, setEventAssigned] = useState([])

  // Event detail / edit state
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editAllDay, setEditAllDay] = useState(true)
  const [editStartTime, setEditStartTime] = useState('09:00')
  const [editEndTime, setEditEndTime] = useState('10:00')
  const [editLocation, setEditLocation] = useState('')
  const [editAssigned, setEditAssigned] = useState([])

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [pinError, setPinError] = useState(null)

  const toggleAssign = (list, setList, childId) => {
    setList(prev => prev.includes(childId) ? prev.filter(id => id !== childId) : [...prev, childId])
  }

  const toggleAllAssign = (list, setList) => {
    if (list.length === familyChildren.length) {
      setList([])
    } else {
      setList(familyChildren.map(c => c.id))
    }
  }

  const AssignmentPicker = ({ assigned, setAssigned }) => {
    if (!familyChildren || familyChildren.length === 0) return null
    const allSelected = assigned.length === familyChildren.length
    return (
      <div className="field">
        <label>Assign to</label>
        <div className="assign-picker">
          <label className="assign-option">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => toggleAllAssign(assigned, setAssigned)}
            />
            <span className="assign-label">Everyone</span>
          </label>
          {familyChildren.map(child => (
            <label key={child.id} className="assign-option">
              <input
                type="checkbox"
                checked={assigned.includes(child.id)}
                onChange={() => toggleAssign(assigned, setAssigned, child.id)}
              />
              <span className="assign-avatar">{getAvatarEmoji(child.avatar_value)}</span>
              <span className="assign-label">{child.name}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }

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
    const doCreate = async (usePin) => {
      await api.calendar.createEvent({
        connection_id: eventCalendar,
        title: eventTitle.trim(),
        start_date: showAddEvent,
        is_all_day: eventAllDay,
        start_time: eventAllDay ? undefined : eventStartTime,
        end_time: eventAllDay ? undefined : eventEndTime,
        assigned_children: eventAssigned.length > 0 ? eventAssigned : undefined,
      }, usePin)
      setShowAddEvent(null)
      setEventTitle('')
      setEventAllDay(true)
      setEventAssigned([])
      await onRefresh()
    }
    try {
      await withPinPrompt(doCreate)()
    } catch (e) {
      setEventError(e.message)
    } finally {
      setEventSaving(false)
    }
  }

  const openEventDetail = (ev) => {
    setSelectedEvent(ev)
    setEditing(false)
    setEventError(null)
  }

  const startEditing = () => {
    setEditTitle(selectedEvent.title)
    setEditAllDay(selectedEvent.is_all_day)
    setEditStartTime(selectedEvent.start_time || '09:00')
    setEditEndTime(selectedEvent.end_time || '10:00')
    setEditLocation(selectedEvent.location || '')
    setEditAssigned(selectedEvent.assigned_children || [])
    setEditing(true)
    setEventError(null)
  }

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return
    setEventSaving(true)
    setEventError(null)
    const doSave = async (usePin) => {
      const isGoogle = selectedEvent.provider === 'google'
      if (isGoogle) {
        await api.calendar.updateEvent(selectedEvent.id, {
          title: editTitle.trim(),
          is_all_day: editAllDay,
          start_time: editAllDay ? null : editStartTime,
          end_time: editAllDay ? null : editEndTime,
          location: editLocation.trim() || null,
          assigned_children: editAssigned,
        }, usePin)
      } else {
        // For non-Google events, only update assignment
        await api.calendar.assignEvent(selectedEvent.id, editAssigned, usePin)
      }
      setSelectedEvent(null)
      setEditing(false)
      await onRefresh()
    }
    try {
      await withPinPrompt(doSave)()
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
      setSelectedEvent(null)
      setPinError(null)
      sessionStorage.setItem('parentPin', pinVal)
      setPin(pinVal)
      await onRefresh()
    } catch (e) {
      setPinError(e.message)
    }
  }

  return (
    <>
      <div className={`fc-week fc-week--cols-${Math.min(days.length || windowSize, 7)}`}>
        {days.map((dayData) => {
          const dateStr = dayData.date
          if (!dateStr) return null
          const d = new Date(dateStr + 'T00:00:00')
          const isToday = dateStr === todayStr
          const isPast = dateStr < todayStr
          const dayNum = d.getDate()
          const monthShort = d.toLocaleDateString('en-AU', { month: 'short' })
          // JS getDay(): 0=Sun..6=Sat. Our WEEKDAYS_SHORT starts Mon.
          const jsDow = d.getDay()
          const dayName = WEEKDAYS_SHORT[jsDow === 0 ? 6 : jsDow - 1]

          return (
            <div key={dateStr} className={`fc-week-day ${isToday ? 'fc-week-day--today' : ''} ${isPast ? 'fc-week-day--past' : ''}`}>
              <div className="fc-week-day-header">
                <span className="fc-week-day-name">{dayName}</span>
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
                      className="fc-week-event fc-week-event--clickable"
                      style={{ borderLeftColor: ev.color }}
                      onClick={() => openEventDetail(ev)}
                    >
                      <div className="fc-week-event-title">{ev.title}</div>
                      {!ev.is_all_day && ev.start_time && (
                        <div className="fc-week-event-time">{ev.start_time}{ev.end_time ? ` - ${ev.end_time}` : ''}</div>
                      )}
                      {ev.is_all_day && <div className="fc-week-event-time">All day</div>}
                      {ev.assigned_children_names && ev.assigned_children_names.length > 0 && (
                        <div className="fc-week-event-assigned">
                          {ev.assigned_children_names.map(c => (
                            <span key={c.id} className="fc-week-event-avatar" title={c.name}>{getAvatarEmoji(c.avatar_value)}</span>
                          ))}
                        </div>
                      )}
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
                        onClick={() => navigate(`/child/${childData.child_id}`)}
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
            <AssignmentPicker assigned={eventAssigned} setAssigned={setEventAssigned} />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button className="btn btn-primary" onClick={handleAddEvent} disabled={eventSaving || !eventTitle.trim()}>
                {eventSaving ? 'Saving...' : 'Add Event'}
              </button>
              <button className="btn btn-outline" onClick={() => setShowAddEvent(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Event Detail / Edit Modal */}
      {selectedEvent && (
        <div className="fc-modal-overlay" onClick={() => { setSelectedEvent(null); setEditing(false) }}>
          <div className="fc-modal" onClick={e => e.stopPropagation()}>
            {!editing ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0 }}>{selectedEvent.title}</h3>
                  <button
                    className="fc-detail-close"
                    onClick={() => setSelectedEvent(null)}
                    style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--muted)', padding: '0 0.25rem' }}
                  >&times;</button>
                </div>
                <div className="fc-event-detail-body">
                  <div className="fc-event-detail-row">
                    <span className="fc-event-detail-icon">&#x1F4C5;</span>
                    <span>
                      {new Date(selectedEvent.start_date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="fc-event-detail-row">
                    <span className="fc-event-detail-icon">&#x1F552;</span>
                    <span>{selectedEvent.is_all_day ? 'All day' : `${selectedEvent.start_time || ''}${selectedEvent.end_time ? ' - ' + selectedEvent.end_time : ''}`}</span>
                  </div>
                  {selectedEvent.location && (
                    <div className="fc-event-detail-row">
                      <span className="fc-event-detail-icon">&#x1F4CD;</span>
                      <span>{selectedEvent.location}</span>
                    </div>
                  )}
                  {selectedEvent.description && (
                    <div className="fc-event-detail-row">
                      <span className="fc-event-detail-icon">&#x1F4DD;</span>
                      <span>{selectedEvent.description}</span>
                    </div>
                  )}
                  {selectedEvent.assigned_children_names && selectedEvent.assigned_children_names.length > 0 && (
                    <div className="fc-event-detail-row">
                      <span className="fc-event-detail-icon">&#x1F465;</span>
                      <span className="fc-event-assigned">
                        {selectedEvent.assigned_children_names.map(c => (
                          <span key={c.id} className="fc-event-assigned-child">
                            {getAvatarEmoji(c.avatar_value)} {c.name}
                          </span>
                        ))}
                      </span>
                    </div>
                  )}
                  <div className="fc-event-detail-row" style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                    <span className="fc-event-detail-icon" style={{ borderLeftColor: selectedEvent.color }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: selectedEvent.color, display: 'inline-block' }} />
                    </span>
                    <span>{selectedEvent.source}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button className="btn btn-primary btn-sm" onClick={startEditing}>
                    {selectedEvent.provider === 'google' ? 'Edit' : 'Assign'}
                  </button>
                  {selectedEvent.provider === 'google' && (
                    <button className="btn btn-danger btn-sm" onClick={() => { setDeleteTarget(selectedEvent) }}>Delete</button>
                  )}
                  <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setSelectedEvent(null)}>Close</button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ marginBottom: '0.75rem' }}>
                  {selectedEvent.provider === 'google' ? 'Edit Event' : `Assign: ${selectedEvent.title}`}
                </h3>
                {eventError && <div className="msg-error" style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>{eventError}</div>}
                {selectedEvent.provider === 'google' && (
                  <>
                    <div className="field">
                      <label>Title</label>
                      <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} autoFocus />
                    </div>
                    <div className="field">
                      <label>Location</label>
                      <input type="text" value={editLocation} onChange={e => setEditLocation(e.target.value)} placeholder="Optional" />
                    </div>
                    <div className="field">
                      <label>
                        <input type="checkbox" checked={editAllDay} onChange={e => setEditAllDay(e.target.checked)} style={{ marginRight: '0.5rem' }} />
                        All day
                      </label>
                    </div>
                    {!editAllDay && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <div className="field" style={{ flex: 1 }}>
                          <label>Start</label>
                          <input type="time" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} />
                        </div>
                        <div className="field" style={{ flex: 1 }}>
                          <label>End</label>
                          <input type="time" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} />
                        </div>
                      </div>
                    )}
                  </>
                )}
                <AssignmentPicker assigned={editAssigned} setAssigned={setEditAssigned} />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button className="btn btn-primary" onClick={handleSaveEdit} disabled={eventSaving || (selectedEvent.provider === 'google' && !editTitle.trim())}>
                    {eventSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </>
            )}
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

      {/* Inline PIN prompt (triggered when a PIN-required action is invoked without a stored PIN) */}
      {pendingPinAction && (
        <PinModal
          title="Enter Parent PIN"
          error={pinPromptError}
          onSubmit={handlePinSubmitted}
          onCancel={() => { setPendingPinAction(null); setPinPromptError(null) }}
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
              onClick={() => ch.child_id ? navigate(`/child/${ch.child_id}`) : null}
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
