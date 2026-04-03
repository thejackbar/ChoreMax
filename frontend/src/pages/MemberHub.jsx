import { useParams, useNavigate } from 'react-router-dom'
import { useChild } from '../context/ChildContext'
import { useAuth } from '../context/AuthContext'
import { getAvatarEmoji } from '../data/avatars'
import { formatTokens } from '../data/tokenIcons'
import { useEffect, useState } from 'react'
import { api } from '../api/client'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function MemberHub() {
  const { childId } = useParams()
  const { children, activeChild, setActiveChild } = useChild()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [weekDays, setWeekDays] = useState([])

  const child = children.find(c => c.id === childId) || activeChild

  useEffect(() => {
    if (!childId) return
    api.dashboard.child(childId).then(d => setSummary(d)).catch(() => {})
    // Fetch this week's calendar for the hub preview
    api.calendar.week().then(data => setWeekDays(data.days || [])).catch(() => {})
  }, [childId])

  useEffect(() => {
    if (child && (!activeChild || activeChild.id !== child.id)) {
      setActiveChild(child)
    }
  }, [child])

  if (!child) return <div className="text-center mt-lg">Loading...</div>

  const tokenIcon = child.token_icon || summary?.token_icon || 'star'
  const balance = summary?.token_balance ?? 0
  const todayStr = getToday()

  return (
    <div className="hub-page">
      {/* Member header */}
      <div className="hub-header">
        <span className="hub-avatar">{getAvatarEmoji(child.avatar_value)}</span>
        <h1 className="hub-name">{child.name}</h1>
        {summary && (
          <div className="hub-balance">{formatTokens(balance, tokenIcon)}</div>
        )}
      </div>

      {/* Navigation cards */}
      <div className="hub-grid">
        <button className="hub-card" onClick={() => navigate(`/child/${childId}/daily`)}>
          <span className="hub-card-icon">&#x2705;</span>
          <span className="hub-card-title">Daily Chores</span>
          {summary && (
            <span className="hub-card-meta">{summary.daily_completed}/{summary.daily_total} done</span>
          )}
        </button>

        <button className="hub-card" onClick={() => navigate(`/child/${childId}/weekly`)}>
          <span className="hub-card-icon">&#x1F4C5;</span>
          <span className="hub-card-title">Weekly Chores</span>
          {summary && (
            <span className="hub-card-meta">{summary.weekly_completed}/{summary.weekly_total} done</span>
          )}
        </button>

        <button className="hub-card" onClick={() => navigate(`/child/${childId}/dashboard`)}>
          <span className="hub-card-icon">&#x1F3C6;</span>
          <span className="hub-card-title">My Rewards</span>
          {summary && (
            <span className="hub-card-meta">{formatTokens(balance, tokenIcon)}</span>
          )}
        </button>

        <button className="hub-card" onClick={() => navigate('/meals/plan')}>
          <span className="hub-card-icon">&#x1F37D;&#xFE0F;</span>
          <span className="hub-card-title">Meal Plan</span>
          <span className="hub-card-meta">This week's meals</span>
        </button>

        <button className="hub-card" onClick={() => navigate('/lists/wishlist')}>
          <span className="hub-card-icon">&#x1F381;</span>
          <span className="hub-card-title">Wishlist</span>
          <span className="hub-card-meta">Things I want</span>
        </button>

        <button className="hub-card" onClick={() => navigate('/calendar')}>
          <span className="hub-card-icon">&#x1F4C5;</span>
          <span className="hub-card-title">Calendar</span>
          <span className="hub-card-meta">Family schedule</span>
        </button>
      </div>

      {/* This Week Preview */}
      {weekDays.length > 0 && (
        <div className="hub-week">
          <h3 className="hub-week-title">This Week</h3>
          <div className="hub-week-grid">
            {weekDays.map((day, i) => {
              const isToday = day.date === todayStr
              const isPast = day.date < todayStr
              const d = new Date(day.date + 'T00:00:00')
              const hasContent = day.events.length > 0 || day.meals.length > 0
              // Find this child's chore data
              const myChores = day.chores.find(c => c.child_name === child.name)

              return (
                <div
                  key={day.date}
                  className={`hub-week-day ${isToday ? 'hub-week-day--today' : ''} ${isPast ? 'hub-week-day--past' : ''}`}
                  onClick={() => navigate('/calendar')}
                >
                  <div className="hub-week-day-label">
                    <span className="hub-week-day-name">{WEEKDAYS[i]}</span>
                    <span className="hub-week-day-num">{d.getDate()}</span>
                  </div>
                  <div className="hub-week-day-items">
                    {myChores && (
                      <div className={`hub-week-chore ${myChores.completed >= myChores.total ? 'done' : ''}`}>
                        {myChores.completed >= myChores.total ? '\u2705' : '\u2B55'} {myChores.completed}/{myChores.total}
                      </div>
                    )}
                    {day.events.slice(0, 2).map((ev, j) => (
                      <div key={j} className="hub-week-event" style={{ borderLeftColor: ev.color }}>
                        {ev.title}
                      </div>
                    ))}
                    {day.events.length > 2 && (
                      <div className="hub-week-more">+{day.events.length - 2} more</div>
                    )}
                    {day.meals.slice(0, 1).map((m, j) => (
                      <div key={j} className="hub-week-meal">
                        &#x1F37D;&#xFE0F; {m.meal_name}
                      </div>
                    ))}
                    {day.meals.length > 1 && (
                      <div className="hub-week-more">+{day.meals.length - 1} meal{day.meals.length > 2 ? 's' : ''}</div>
                    )}
                    {!hasContent && !myChores && !isPast && (
                      <div className="hub-week-empty">-</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <button className="btn btn-outline btn-sm mt-lg" onClick={() => navigate('/')}>
        &larr; Back to Family
      </button>
    </div>
  )
}
