import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useChild } from '../context/ChildContext'
import { getTokenEmoji, formatTokens } from '../data/tokenIcons'
import ProgressBar from '../components/ProgressBar'
import ChoreCalendar from '../components/ChoreCalendar'

const getToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatSelectedDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ChildDashboard() {
  const { childId } = useParams()
  const { activeChild } = useChild()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)

  const tokenIcon = activeChild?.token_icon || data?.token_icon || 'star'

  useEffect(() => {
    async function load() {
      try {
        const d = await api.dashboard.child(childId, selectedDate || undefined)
        setData(d)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [childId, selectedDate])

  const handleDayClick = (dateStr) => {
    const today = getToday()
    if (dateStr === today || dateStr === selectedDate) {
      setSelectedDate(null)
    } else {
      setSelectedDate(dateStr)
    }
  }

  if (loading) return <div className="text-center mt-lg">Loading...</div>
  if (!data) return <div className="text-center mt-lg">Could not load dashboard</div>

  const viewingPast = selectedDate && selectedDate !== getToday()

  return (
    <div>
      {/* Token Balance */}
      <div className="token-balance mb-lg">
        <div className="token-icon" style={{ fontSize: '3rem' }}>{getTokenEmoji(tokenIcon)}</div>
        <div className="token-amount">{data.token_balance}</div>
        <div className="token-label">My {getTokenEmoji(tokenIcon)} Balance</div>
      </div>

      {/* Goal Store */}
      {data.goals && data.goals.length > 0 && (
        <div className="card mb-lg">
          <h3 className="mb-md">Goal Store</h3>
          <div className="goal-store-grid">
            {data.goals.map(goal => {
              const canAfford = data.token_balance >= goal.token_cost
              const progressPct = Math.min((data.token_balance / goal.token_cost) * 100, 100)
              return (
                <div key={goal.id} className={`goal-card ${canAfford ? 'goal-card--affordable' : ''}`}>
                  <span className="goal-emoji">{goal.emoji}</span>
                  <span className="goal-title">{goal.title}</span>
                  <span className="goal-cost">{formatTokens(goal.token_cost, tokenIcon)}</span>
                  <div className="goal-progress-bar">
                    <div
                      className="goal-progress-fill"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  {canAfford && (
                    <span className="goal-ready-badge">Ready!</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Date viewing banner */}
      {viewingPast && (
        <div className="date-viewing-banner mb-lg">
          <span>Viewing: {formatSelectedDate(selectedDate)}</span>
          <button onClick={() => setSelectedDate(null)} className="date-viewing-reset">
            Show Today
          </button>
        </div>
      )}

      {/* Progress Stats */}
      <div className="stat-grid mb-lg">
        <div className="stat-card">
          <div className="stat-value">{data.daily_completed}/{data.daily_total}</div>
          <div className="stat-label">Daily Chores</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.weekly_completed}/{data.weekly_total}</div>
          <div className="stat-label">Weekly Chores</div>
        </div>
      </div>

      {/* Completion bars */}
      {data.daily_total > 0 && (
        <ProgressBar
          current={data.daily_completed}
          target={data.daily_total}
          label={viewingPast ? `Daily Progress` : "Today's Progress"}
          emoji="&#x2600;&#xFE0F;"
          green
        />
      )}
      {data.weekly_total > 0 && (
        <ProgressBar
          current={data.weekly_completed}
          target={data.weekly_total}
          label={viewingPast ? `Weekly Progress` : "This Week's Progress"}
          emoji="&#x1F4C5;"
        />
      )}

      {/* Calendar */}
      <div className="mt-lg">
        <h3 className="mb-md">Chore Calendar</h3>
        <ChoreCalendar
          childId={childId}
          onDayClick={handleDayClick}
          selectedDate={selectedDate}
        />
      </div>
    </div>
  )
}
