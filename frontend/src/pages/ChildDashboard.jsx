import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { formatMoney } from '../data/currencies'
import ProgressBar from '../components/ProgressBar'

export default function ChildDashboard() {
  const { childId } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const d = await api.dashboard.child(childId)
        setData(d)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [childId])

  if (loading) return <div className="text-center mt-lg">Loading...</div>
  if (!data) return <div className="text-center mt-lg">Could not load dashboard</div>

  const currency = user?.currency || 'AUD'

  return (
    <div>
      {/* Piggy Bank */}
      <div className="piggy-bank mb-lg">
        <div className="piggy-icon">&#x1F416;</div>
        <div className="piggy-amount">{formatMoney(data.piggy_bank_balance, currency)}</div>
        <div className="piggy-label">My Piggy Bank</div>
      </div>

      {/* Target Progress */}
      {data.target && (
        <div className="card mb-lg">
          <h3>{data.target.emoji} {data.target.title}</h3>
          <ProgressBar
            current={Number(data.target.progress_amount)}
            target={Number(data.target.target_value)}
            label={`${formatMoney(data.target.progress_amount, currency)} of ${formatMoney(data.target.target_value, currency)}`}
          />
          {data.target.progress_pct >= 1 && (
            <div className="msg-success mt-md">You reached your goal! Ask your parent to check.</div>
          )}
        </div>
      )}

      {/* Today's Progress */}
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
          label="Today's Progress"
          emoji="&#x2600;&#xFE0F;"
        />
      )}
      {data.weekly_total > 0 && (
        <ProgressBar
          current={data.weekly_completed}
          target={data.weekly_total}
          label="This Week's Progress"
          emoji="&#x1F4C5;"
        />
      )}
    </div>
  )
}
