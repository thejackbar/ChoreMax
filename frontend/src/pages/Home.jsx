import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChild } from '../context/ChildContext'
import { useAuth } from '../context/AuthContext'
import { getAvatarEmoji } from '../data/avatars'
import EmptyState from '../components/EmptyState'

export default function Home() {
  const { children, fetchChildren, loadingChildren, setActiveChild } = useChild()
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetchChildren()
  }, [fetchChildren])

  const handleChildClick = (child) => {
    setActiveChild(child)
    navigate(`/child/${child.id}/daily`)
  }

  if (loadingChildren) {
    return <div className="text-center mt-lg"><h2>Loading...</h2></div>
  }

  return (
    <div>
      <div className="text-center mb-lg">
        <h1>Who are you?</h1>
        <p className="text-muted">Tap your picture to start!</p>
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
          {children.map(child => (
            <button
              key={child.id}
              className="avatar-btn"
              onClick={() => handleChildClick(child)}
            >
              <span className="avatar-emoji">{getAvatarEmoji(child.avatar_value)}</span>
              <span className="avatar-name">{child.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
