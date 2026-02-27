import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { formatMoney } from '../data/currencies'
import ConfettiAnimation from '../components/ConfettiAnimation'
import ProgressBar from '../components/ProgressBar'
import EmptyState from '../components/EmptyState'

export default function ChildWeeklyChores() {
  const { childId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [chores, setChores] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [confettiTrigger, setConfettiTrigger] = useState(0)
  const [completing, setCompleting] = useState(null)

  const fetchChores = useCallback(async () => {
    try {
      const data = await api.chores.childWeekly(childId)
      setChores(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [childId])

  useEffect(() => { fetchChores() }, [fetchChores])

  const handleComplete = async (chore) => {
    if (chore.completed || completing) return
    setCompleting(chore.id)
    try {
      await api.completions.complete({ chore_id: chore.id, child_id: childId })
      setConfettiTrigger(t => t + 1)
      await fetchChores()
      setTimeout(() => navigate('/'), 1500)
    } catch (e) {
      alert(e.message)
    } finally {
      setCompleting(null)
    }
  }

  const filtered = chores.filter(c => {
    if (filter === 'completed') return c.completed
    if (filter === 'uncompleted') return !c.completed
    return true
  })

  const completedCount = chores.filter(c => c.completed).length

  if (loading) return <div className="text-center mt-lg">Loading...</div>

  return (
    <div>
      <ConfettiAnimation trigger={confettiTrigger} />

      <div className="chore-progress-header">
        <div className="chore-progress-top">
          <h2>Weekly Chores</h2>
          <span className="text-muted font-heading" style={{ fontSize: '1.1rem' }}>
            {completedCount}/{chores.length} done
          </span>
        </div>
        <ProgressBar
          current={completedCount}
          target={chores.length}
          showLabel={false}
        />
      </div>

      <div className="filter-bar">
        {['all', 'uncompleted', 'completed'].map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'completed' ? 'Done' : 'To Do'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={filter === 'uncompleted' ? '\u{1F389}' : '\u{1F4C5}'}
          title={filter === 'uncompleted' ? 'All done for the week!' : 'No weekly chores found'}
          message={filter === 'uncompleted' ? 'Amazing! All weekly chores are completed.' : null}
        />
      ) : (
        <div className="chore-grid">
          {filtered.map(chore => (
            <button
              key={chore.id}
              className={`chore-card ${chore.completed ? 'chore-card--done' : ''}`}
              onClick={() => handleComplete(chore)}
              disabled={chore.completed || completing === chore.id}
            >
              <span className="chore-emoji">{chore.emoji}</span>
              <span className="chore-title">{chore.title}</span>
              <span className="chore-value">{formatMoney(chore.value, user?.currency)}</span>
              {chore.completed && chore.completed_by_name && chore.assignment_type === 'standalone' && (
                <span className="chore-claimed">Done by {chore.completed_by_name}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
