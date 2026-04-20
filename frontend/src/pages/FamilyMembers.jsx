import { useNavigate } from 'react-router-dom'
import { useChild } from '../context/ChildContext'
import { useAuth } from '../context/AuthContext'
import { getAvatarEmoji } from '../data/avatars'
import { formatTokens } from '../data/tokenIcons'
import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function FamilyMembers() {
  const { children, fetchChildren } = useChild()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [summaries, setSummaries] = useState({})

  // Ensure children are loaded (needed on iOS fresh load)
  useEffect(() => {
    if (children.length === 0) fetchChildren()
  }, [])

  // Load a quick summary (balance + chore progress) for each person
  useEffect(() => {
    children.forEach(child => {
      api.dashboard.child(child.id)
        .then(d => setSummaries(prev => ({ ...prev, [child.id]: d })))
        .catch(() => {})
    })
  }, [children])

  return (
    <div className="family-members-page">
      <div className="family-members-header">
        <h1 className="family-members-title">
          {user?.display_name ? `${user.display_name}'s Family` : 'Our Family'}
        </h1>
      </div>

      <div className="family-members-grid">
        {children.map(child => {
          const summary = summaries[child.id]
          const tokenIcon = child.token_icon || 'star'
          const balance = summary?.token_balance ?? null
          const dailyDone = summary?.daily_completed ?? 0
          const dailyTotal = summary?.daily_total ?? 0

          return (
            <button
              key={child.id}
              className="family-member-card"
              onClick={() => navigate(`/child/${child.id}`)}
            >
              <span className="family-member-avatar">
                {getAvatarEmoji(child.avatar_value)}
              </span>
              <span className="family-member-name">{child.name}</span>
              {dailyTotal > 0 && (
                <span className="family-member-chores">
                  {dailyDone}/{dailyTotal} chores
                </span>
              )}
              {balance !== null && (
                <span className="family-member-balance">
                  {formatTokens(balance, tokenIcon)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Quick-access family links */}
      <div className="family-members-actions">
        <button className="btn btn-outline" onClick={() => navigate('/family')}>
          &#x1F4CB; Family Chores
        </button>
      </div>
    </div>
  )
}
