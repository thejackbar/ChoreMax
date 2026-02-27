import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { formatMoney } from '../data/currencies'
import { getAvatarEmoji } from '../data/avatars'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function ParentDashboard() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [stats, setStats] = useState(null)
  const [period, setPeriod] = useState('weekly')
  const [loading, setLoading] = useState(true)
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

  if (loading) return <div className="text-center mt-lg">Loading...</div>
  if (!dashboard) return <div className="text-center mt-lg">Could not load dashboard</div>

  const currency = user?.currency || 'AUD'

  return (
    <div>
      <h1 className="mb-lg">Parent Dashboard</h1>

      {/* Overview stats */}
      <div className="stat-grid mb-lg">
        <div className="stat-card">
          <div className="stat-value">{dashboard.total_completions}</div>
          <div className="stat-label">Completed Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{dashboard.total_chores}</div>
          <div className="stat-label">Total Chores</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{dashboard.overall_completion_pct}%</div>
          <div className="stat-label">Completion Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatMoney(dashboard.total_earnings, currency)}</div>
          <div className="stat-label">Total Earned</div>
        </div>
      </div>

      {/* Per-child cards */}
      <h2 className="mb-md">Children</h2>
      {dashboard.children_stats.map(child => (
        <div key={child.child_id} className="card mb-md">
          <div className="flex-between mb-sm">
            <div className="flex gap-sm" style={{ alignItems: 'center' }}>
              <span style={{ fontSize: '1.5rem' }}>{getAvatarEmoji(child.avatar_value)}</span>
              <h3>{child.child_name}</h3>
            </div>
            <span className="font-heading" style={{ color: 'var(--secondary)', fontWeight: 700 }}>
              {formatMoney(child.piggy_bank_balance, currency)}
            </span>
          </div>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-value">{child.daily_completed}/{child.daily_total}</div>
              <div className="stat-label">Daily</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{child.weekly_completed}/{child.weekly_total}</div>
              <div className="stat-label">Weekly</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{child.completion_pct}%</div>
              <div className="stat-label">Completion</div>
            </div>
          </div>
        </div>
      ))}

      {/* Earnings chart */}
      <h2 className="mb-md mt-lg">Earnings Over Time</h2>
      <div className="filter-bar mb-md">
        {['daily', 'weekly', 'monthly', 'yearly'].map(p => (
          <button
            key={p}
            className={`filter-btn ${period === p ? 'active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {stats && stats.data_points.length > 0 && (
        <div className="chart-container card">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.data_points}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="completed" fill="var(--primary)" name="Completed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
