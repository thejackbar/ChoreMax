import { AVATARS } from '../data/avatars'

export default function AvatarPicker({ selected, onSelect }) {
  return (
    <div className="avatar-picker">
      {AVATARS.map(a => (
        <button
          key={a.key}
          className={`avatar-option ${selected === a.key ? 'selected' : ''}`}
          onClick={() => onSelect(a.key)}
          type="button"
        >
          {a.emoji}
          <span>{a.label}</span>
        </button>
      ))}
    </div>
  )
}
