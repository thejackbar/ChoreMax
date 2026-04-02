import { useParams, useNavigate } from 'react-router-dom'
import { useChild } from '../context/ChildContext'
import { useAuth } from '../context/AuthContext'
import { getAvatarEmoji } from '../data/avatars'
import { formatTokens } from '../data/tokenIcons'
import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function MemberHub() {
  const { childId } = useParams()
  const { children, activeChild, setActiveChild } = useChild()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)

  const child = children.find(c => c.id === childId) || activeChild

  useEffect(() => {
    if (!childId) return
    api.dashboard.child(childId).then(d => setSummary(d)).catch(() => {})
  }, [childId])

  useEffect(() => {
    if (child && (!activeChild || activeChild.id !== child.id)) {
      setActiveChild(child)
    }
  }, [child])

  if (!child) return <div className="text-center mt-lg">Loading...</div>

  const tokenIcon = child.token_icon || summary?.token_icon || 'star'
  const balance = summary?.token_balance ?? 0

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
      </div>

      <button className="btn btn-outline btn-sm mt-lg" onClick={() => navigate('/')}>
        &larr; Back to Family
      </button>
    </div>
  )
}
