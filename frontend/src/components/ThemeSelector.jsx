const THEMES = [
  { id: 'warm', label: 'Warm' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'forest', label: 'Forest' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'midnight', label: 'Midnight' },
]

export function getStoredTheme() {
  return localStorage.getItem('choremax-theme') || 'warm'
}

export function applyTheme(themeId) {
  if (themeId === 'warm') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', themeId)
  }
  localStorage.setItem('choremax-theme', themeId)
}

export default function ThemeSelector({ current, onChange }) {
  return (
    <div className="theme-selector">
      {THEMES.map(theme => (
        <button
          key={theme.id}
          className={`theme-option ${current === theme.id ? 'selected' : ''}`}
          onClick={() => onChange(theme.id)}
        >
          <div className={`theme-swatch theme-swatch--${theme.id}`} />
          <span className="theme-label">{theme.label}</span>
        </button>
      ))}
    </div>
  )
}
