import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChild } from '../context/ChildContext'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { getAvatarEmoji } from '../data/avatars'
import { formatTokens } from '../data/tokenIcons'
import EmptyState from '../components/EmptyState'

export default function Home() {
  const { children, fetchChildren, loadingChildren, setActiveChild } = useChild()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [summaries, setSummaries] = useState({})

  useEffect(() => {
    fetchChildren()
  }, [fetchChildren])

  // Fetch dashboard summary for each child
  useEffect(() => {
    if (children.length === 0) return
    children.forEach(async (child) => {
      try {
        const data = await api.dashboard.child(child.id)
        setSummaries(prev => ({ ...prev, [child.id]: data }))
      } catch {}
    })
  }, [children])

  const handleChildClick = (child) => {
    setActiveChild(child)
    navigate(`/child/${child.id}/daily`)
  }

  if (loadingChildren) {
    return <div className="text-center mt-lg"><h2>Loading...</h2></div>
  }

  return (
    <div>
      <div className="text-center mb-lg" style={{ marginTop: '2rem' }}>
        <h1>Who are you?</h1>
        <p className="text-muted" style={{ fontSize: '1.1rem', marginTop: '0.5rem' }}>Tap your picture to start!</p>
        {children.length > 0 && (
          <button
            className="btn btn-outline btn-sm"
            style={{ marginTop: '0.75rem' }}
            onClick={() => navigate('/family')}
          >
            &#x1F46A; Family View
          </button>
        )}
      </div>

      {children.length === 0 ? (
        <EmptyState
          icon="&#x1F46A;"
          title="No children added yet"
          message="Go to Settings to add your children"
          action={
            <button className="btn btn-primary" onClick={() => navigate('/parent/children')}>
              Add Children
            </button>
          }
        />
      ) : (
        <div className="avatar-grid">
          {children.map(child => {
            const s = summaries[child.id]
            const tokenIcon = child.token_icon || s?.token_icon || 'star'
            return (
              <button
                key={child.id}
                className="avatar-btn"
                onClick={() => handleChildClick(child)}
              >
                <span className="avatar-emoji">{getAvatarEmoji(child.avatar_value)}</span>
                <span className="avatar-name">{child.name}</span>
                {s && (
                  <div className="child-summary">
                    <div className="child-summary-item">
                      <span className="summary-value">{s.daily_completed}/{s.daily_total}</span>
                      <span>Daily</span>
                    </div>
                    <div className="child-summary-item">
                      <span className="summary-value">{s.weekly_completed}/{s.weekly_total}</span>
                      <span>Weekly</span>
                    </div>
                    <div className="child-summary-item">
                      <span className="summary-value">{formatTokens(s.token_balance, tokenIcon)}</span>
                      <span>Balance</span>
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
