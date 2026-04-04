import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { getAvatarEmoji } from '../data/avatars'
import { formatTokens } from '../data/tokenIcons'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const getToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const getWeekStart = () => {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
}

const getDayName = () => {
  return new Date().toLocaleDateString('en-AU', { weekday: 'long' }).toLowerCase()
}

function CompletionRing({ pct, size = 56, strokeWidth = 5, color = 'var(--primary)' }) {
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fill="var(--text)" fontSize={size * 0.22} fontWeight="700"
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}>
        {Math.round(pct)}%
      </text>
    </svg>
  )
}

export default function ParentDashboard() {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [stats, setStats] = useState(null)
  const [period, setPeriod] = useState('weekly')
  const [loading, setLoading] = useState(true)
  const [meals, setMeals] = useState([])
  const [events, setEvents] = useState([])
  const [goals, setGoals] = useState([])
  const [todos, setTodos] = useState([])
  const pin = sessionStorage.getItem('parentPin')

  const fetchData = useCallback(async () => {
    try {
      const [d, s] = await Promise.all([
        api.dashboard.parent(pin),
        api.dashboard.stats({ period }, pin),
      ])
      setDashboard(d)
      setStats(s)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [pin, period])

  useEffect(() => { fetchData() }, [fetchData])

  // Fetch supplementary data
  useEffect(() => {
    const weekStart = getWeekStart()
    const dayName = getDayName()

    api.mealPlans.getWeek(weekStart).then(plan => {
      if (plan?.entries) {
        setMeals(plan.entries.filter(e => e.day_of_week === dayName))
      }
    }).catch(() => {})

    api.calendar.week(weekStart).then(week => {
      if (week?.days) {
        const today = week.days.find(d => d.date === getToday())
        setEvents(today?.events || [])
      }
    }).catch(() => {})

    api.goals.listAll(pin).then(setGoals).catch(() => {})
    api.todos.list().then(setTodos).catch(() => {})
  }, [pin])

  if (loading) return <div className="text-center mt-lg">Loading...</div>
  if (!dashboard) return <div className="text-center mt-lg">Could not load dashboard</div>

  const pendingTodos = todos.filter(t => !t.is_completed)
  const totalPct = dashboard.overall_completion_pct

  return (
    <div className="pdash">
      {/* Welcome header */}
      <div className="pdash-header">
        <div>
          <h1 className="pdash-title">Dashboard</h1>
          <p className="pdash-subtitle">
            {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* Top stats row */}
      <div className="pdash-stats">
        <div className="pdash-stat-card pdash-stat-ring">
          <CompletionRing pct={totalPct} size={64} color="var(--primary)" />
          <div>
            <div className="pdash-stat-value">{dashboard.total_completions}/{dashboard.total_chores}</div>
            <div className="pdash-stat-label">Chores Today</div>
          </div>
        </div>
        <div className="pdash-stat-card">
          <div className="pdash-stat-icon">&#x2B50;</div>
          <div>
            <div className="pdash-stat-value">{dashboard.total_tokens_earned}</div>
            <div className="pdash-stat-label">Tokens Earned</div>
          </div>
        </div>
        <div className="pdash-stat-card">
          <div className="pdash-stat-icon">&#x1F4C5;</div>
          <div>
            <div className="pdash-stat-value">{events.length}</div>
            <div className="pdash-stat-label">Events Today</div>
          </div>
        </div>
        <div className="pdash-stat-card">
          <div className="pdash-stat-icon">&#x1F4CB;</div>
          <div>
            <div className="pdash-stat-value">{pendingTodos.length}</div>
            <div className="pdash-stat-label">To-Do Items</div>
          </div>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="pdash-grid">
        {/* Left: Children progress */}
        <div className="pdash-section">
          <div className="pdash-section-header">
            <h2>Children</h2>
            <button className="pdash-section-link" onClick={() => navigate('/')}>View Family</button>
          </div>
          <div className="pdash-children">
            {dashboard.children_stats.map(child => {
              const dailyPct = child.daily_total > 0 ? Math.round((child.daily_completed / child.daily_total) * 100) : 0
              const weeklyPct = child.weekly_total > 0 ? Math.round((child.weekly_completed / child.weekly_total) * 100) : 0
              return (
                <div key={child.child_id} className="pdash-child">
                  <div className="pdash-child-header">
                    <span className="pdash-child-avatar">{getAvatarEmoji(child.avatar_value)}</span>
                    <div className="pdash-child-info">
                      <div className="pdash-child-name">{child.child_name}</div>
                      <div className="pdash-child-balance">{formatTokens(child.token_balance, child.token_icon)}</div>
                    </div>
                    <CompletionRing pct={child.completion_pct} size={44} strokeWidth={4} />
                  </div>
                  <div className="pdash-child-bars">
                    <div className="pdash-child-bar-row">
                      <span className="pdash-child-bar-label">Daily</span>
                      <div className="pdash-child-bar">
                        <div className="pdash-child-bar-fill" style={{ width: `${dailyPct}%` }} />
                      </div>
                      <span className="pdash-child-bar-count">{child.daily_completed}/{child.daily_total}</span>
                    </div>
                    <div className="pdash-child-bar-row">
                      <span className="pdash-child-bar-label">Weekly</span>
                      <div className="pdash-child-bar">
                        <div className="pdash-child-bar-fill pdash-child-bar-fill--weekly" style={{ width: `${weeklyPct}%` }} />
                      </div>
                      <span className="pdash-child-bar-count">{child.weekly_completed}/{child.weekly_total}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Quick glance panels */}
        <div className="pdash-section">
          {/* Today's meals */}
          <div className="pdash-panel" onClick={() => navigate('/meals/plan')}>
            <h3 className="pdash-panel-title">&#x1F37D;&#xFE0F; Today's Meals</h3>
            {meals.length > 0 ? (
              <div className="pdash-panel-items">
                {meals.map((m, i) => (
                  <div key={i} className="pdash-panel-item">
                    <span className="pdash-panel-item-label">{m.meal_type}</span>
                    <span className="pdash-panel-item-value">{m.meal_name || m.custom_text || 'Planned'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="pdash-panel-empty">No meals planned</p>
            )}
          </div>

          {/* Today's events */}
          <div className="pdash-panel" onClick={() => navigate('/calendar')}>
            <h3 className="pdash-panel-title">&#x1F4C5; Today's Events</h3>
            {events.length > 0 ? (
              <div className="pdash-panel-items">
                {events.slice(0, 4).map((ev, i) => (
                  <div key={i} className="pdash-panel-item">
                    <span className="pdash-panel-item-dot" style={{ background: ev.color || 'var(--primary)' }} />
                    <span className="pdash-panel-item-value">{ev.title}</span>
                    <span className="pdash-panel-item-meta">
                      {ev.is_all_day ? 'All day' : ev.start_time?.slice(0, 5) || ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="pdash-panel-empty">No events today</p>
            )}
          </div>

          {/* Goals snapshot */}
          {goals.length > 0 && (
            <div className="pdash-panel" onClick={() => navigate('/parent/goals')}>
              <h3 className="pdash-panel-title">&#x1F3AF; Active Goals</h3>
              <div className="pdash-panel-items">
                {goals.slice(0, 3).map(g => (
                  <div key={g.id} className="pdash-panel-item">
                    <span className="pdash-panel-item-value">{g.emoji || '🎯'} {g.name}</span>
                    <span className="pdash-panel-item-meta">{g.cost} tokens</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending to-dos */}
          {pendingTodos.length > 0 && (
            <div className="pdash-panel" onClick={() => navigate('/lists/todos')}>
              <h3 className="pdash-panel-title">&#x1F4CB; To-Do</h3>
              <div className="pdash-panel-items">
                {pendingTodos.slice(0, 4).map(t => (
                  <div key={t.id} className="pdash-panel-item">
                    <span className="pdash-panel-item-value">{t.title}</span>
                  </div>
                ))}
                {pendingTodos.length > 4 && (
                  <div className="pdash-panel-more">+{pendingTodos.length - 4} more</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Completions chart - full width */}
      <div className="pdash-section" style={{ marginTop: '1.5rem' }}>
        <div className="pdash-section-header">
          <h2>Completions Over Time</h2>
          <div className="pdash-period-btns">
            {['daily', 'weekly', 'monthly'].map(p => (
              <button
                key={p}
                className={`pdash-period-btn ${period === p ? 'active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {stats && stats.data_points.length > 0 && (
          <div className="pdash-chart">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.data_points}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--glass-bg-strong)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                  }}
                />
                <Bar dataKey="completed" fill="var(--primary)" name="Completed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
