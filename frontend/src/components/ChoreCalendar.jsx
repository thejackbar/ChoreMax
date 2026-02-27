import { useState, useEffect } from 'react'
import { api } from '../api/client'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function ChoreCalendar({ childId }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [days, setDays] = useState([])
  const [dailyTotal, setDailyTotal] = useState(0)

  useEffect(() => {
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
    api.dashboard.calendar(childId, monthStr).then(data => {
      setDays(data.days || [])
      setDailyTotal(data.daily_total || 0)
    }).catch(() => {})
  }, [childId, year, month])

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = today.toISOString().split('T')[0]

  const dayMap = {}
  days.forEach(d => { dayMap[d.date] = d })

  const cells = []
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    cells.push({ empty: true, key: `e${i}` })
  }
  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const data = dayMap[dateStr]
    const isFuture = dateStr > todayStr
    const isToday = dateStr === todayStr
    const completed = data?.completed || 0
    const total = data?.total || dailyTotal
    const allDone = !isFuture && total > 0 && completed >= total
    const someDone = !isFuture && completed > 0 && completed < total
    const noneDone = !isFuture && total > 0 && completed === 0

    cells.push({
      empty: false,
      key: dateStr,
      day: d,
      isFuture,
      isToday,
      allDone,
      someDone,
      noneDone,
    })
  }

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button className="calendar-nav" onClick={prevMonth}>&lsaquo;</button>
        <h3>{MONTHS[month]} {year}</h3>
        <button className="calendar-nav" onClick={nextMonth}>&rsaquo;</button>
      </div>

      <div className="calendar-weekdays">
        {WEEKDAYS.map(w => <div key={w} className="calendar-weekday">{w}</div>)}
      </div>

      <div className="calendar-days">
        {cells.map(cell => (
          <div
            key={cell.key}
            className={[
              'calendar-day',
              cell.empty && 'empty',
              cell.isFuture && 'future',
              cell.isToday && 'today',
              cell.allDone && 'all-done',
              cell.someDone && 'some-done',
            ].filter(Boolean).join(' ')}
          >
            {!cell.empty && (
              <>
                <span className="day-num">{cell.day}</span>
                {!cell.isFuture && (
                  <span className={`day-dot ${cell.allDone ? 'green' : cell.someDone ? 'orange' : cell.noneDone ? 'red' : ''}`} />
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
