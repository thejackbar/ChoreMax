import { useNavigate } from 'react-router-dom'

export default function ParentSettings() {
  const navigate = useNavigate()

  const items = [
    { icon: '\u{2705}', label: 'Manage Chores', description: 'Add, edit and delete chores', path: '/parent/chores' },
    { icon: '\u{1F476}', label: 'Manage Children', description: 'Add or remove children', path: '/parent/children' },
    { icon: '\u{2699}\u{FE0F}', label: 'Account Settings', description: 'Currency, timezone, PIN, password', path: '/parent/settings' },
    { icon: '\u{1F4CA}', label: 'Dashboard', description: 'View stats and progress', path: '/parent' },
  ]

  return (
    <div>
      <h1 className="mb-lg">Settings</h1>
      {items.map(item => (
        <div
          key={item.path}
          className="manage-item"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(item.path)}
        >
          <div className="manage-item-info">
            <span className="item-emoji">{item.icon}</span>
            <div>
              <div className="item-title">{item.label}</div>
              <div className="item-sub">{item.description}</div>
            </div>
          </div>
          <span style={{ fontSize: '1.25rem', color: 'var(--muted)' }}>&rsaquo;</span>
        </div>
      ))}
    </div>
  )
}
