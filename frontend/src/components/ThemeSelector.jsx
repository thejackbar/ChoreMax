import { useState } from 'react'

const THEMES = [
  { id: 'warm', label: 'Warm' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'forest', label: 'Forest' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'midnight', label: 'Midnight' },
  { id: 'custom', label: 'Custom' },
]

const FONT_OPTIONS = [
  { id: 'classic', heading: "'DM Serif Display', serif", body: "'Inter', sans-serif", label: 'Classic', sample: 'Aa' },
  { id: 'playful', heading: "'Fredoka', sans-serif", body: "'Nunito', sans-serif", label: 'Playful', sample: 'Aa' },
  { id: 'modern', heading: "'Outfit', sans-serif", body: "'Outfit', sans-serif", label: 'Modern', sample: 'Aa' },
  { id: 'rounded', heading: "'Quicksand', sans-serif", body: "'Quicksand', sans-serif", label: 'Rounded', sample: 'Aa' },
  { id: 'clean', heading: "'Poppins', sans-serif", body: "'Inter', sans-serif", label: 'Clean', sample: 'Aa' },
  { id: 'elegant', heading: "'Playfair Display', serif", body: "'Inter', sans-serif", label: 'Elegant', sample: 'Aa' },
]

// Preset background colors (left side of swatch)
const BG_COLORS = [
  { color: '#fdf6f0', label: 'Cream' },
  { color: '#e8eeff', label: 'Ice' },
  { color: '#f0f5ee', label: 'Sage' },
  { color: '#f5f0f8', label: 'Lavender' },
  { color: '#fef8ee', label: 'Peach' },
  { color: '#f0f4f4', label: 'Mist' },
  { color: '#f5f2ee', label: 'Linen' },
  { color: '#1a1b2e', label: 'Night' },
]

// Preset accent colors (right side of swatch)
const ACCENT_COLORS = [
  { color: '#e8654a', label: 'Coral' },
  { color: '#6366f1', label: 'Indigo' },
  { color: '#5a9e6f', label: 'Sage' },
  { color: '#9b6bc1', label: 'Violet' },
  { color: '#e6a040', label: 'Amber' },
  { color: '#3fadba', label: 'Teal' },
  { color: '#d97087', label: 'Rose' },
  { color: '#5882a8', label: 'Steel' },
]

const STORAGE_KEY = 'choremax-theme'
const CUSTOM_KEY = 'choremax-custom-theme'
const FONT_KEY = 'choremax-font'

function getCustomSettings() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY)) || { bg: '#fdf6f0', accent: '#e8654a' }
  } catch { return { bg: '#fdf6f0', accent: '#e8654a' } }
}

function isLightColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}

function lighten(hex, amount = 0.92) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lr = Math.round(r + (255 - r) * amount)
  const lg = Math.round(g + (255 - g) * amount)
  const lb = Math.round(b + (255 - b) * amount)
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`
}

function lightenMore(hex, amount = 0.7) {
  return lighten(hex, amount)
}

export function getStoredTheme() {
  return localStorage.getItem(STORAGE_KEY) || 'warm'
}

export function getStoredFont() {
  return localStorage.getItem(FONT_KEY) || 'classic'
}

export function applyTheme(themeId) {
  const root = document.documentElement

  // Clear custom properties first
  root.style.removeProperty('--bg')
  root.style.removeProperty('--bg-gradient')
  root.style.removeProperty('--bg-card')
  root.style.removeProperty('--bg-panel')
  root.style.removeProperty('--text')
  root.style.removeProperty('--text-secondary')
  root.style.removeProperty('--muted')
  root.style.removeProperty('--primary')
  root.style.removeProperty('--primary-light')
  root.style.removeProperty('--primary-bg')
  root.style.removeProperty('--border')
  root.style.removeProperty('--border2')
  root.style.removeProperty('--glass-bg')
  root.style.removeProperty('--glass-bg-strong')
  root.style.removeProperty('--glass-border')
  root.style.removeProperty('--glass-shadow')
  root.style.removeProperty('--glass-highlight')
  root.style.removeProperty('--shadow')
  root.style.removeProperty('--shadow-lg')

  if (themeId === 'custom') {
    const custom = getCustomSettings()
    const isDark = !isLightColor(custom.bg)
    if (isDark) {
      root.setAttribute('data-theme', 'midnight')
    } else {
      root.removeAttribute('data-theme')
    }
    applyCustomColors(custom.bg, custom.accent)
  } else if (themeId === 'warm') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', themeId)
  }
  localStorage.setItem(STORAGE_KEY, themeId)
}

export function applyCustomColors(bg, accent) {
  const root = document.documentElement
  const isDark = !isLightColor(bg)
  const accentLight = lightenMore(accent, 0.7)
  const accentBg = lighten(accent, 0.92)

  // Set dark mode data attribute so CSS dark overrides apply
  if (isDark) {
    root.setAttribute('data-theme', 'midnight')
  } else {
    root.removeAttribute('data-theme')
  }

  root.style.setProperty('--bg', bg)
  root.style.setProperty('--bg-gradient', `linear-gradient(135deg, ${bg} 0%, ${bg} 100%)`)
  root.style.setProperty('--bg-card', isDark ? '#242540' : '#ffffff')
  root.style.setProperty('--bg-panel', isDark ? '#1e1f35' : lighten(bg, 0.5))
  root.style.setProperty('--text', isDark ? '#e8e6f0' : '#2d2926')
  root.style.setProperty('--text-secondary', isDark ? '#a8a4b8' : '#5c5552')
  root.style.setProperty('--muted', isDark ? '#706c82' : '#9a918b')
  root.style.setProperty('--primary', accent)
  root.style.setProperty('--primary-light', accentLight)
  root.style.setProperty('--primary-bg', isDark ? `${accent}1f` : accentBg)
  root.style.setProperty('--border', isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')
  root.style.setProperty('--border2', isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)')
  root.style.setProperty('--glass-bg', isDark ? 'rgba(36,37,64,0.7)' : 'rgba(255,255,255,0.6)')
  root.style.setProperty('--glass-bg-strong', isDark ? 'rgba(36,37,64,0.85)' : 'rgba(255,255,255,0.82)')
  root.style.setProperty('--glass-border', isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.65)')
  root.style.setProperty('--glass-shadow', isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 4px 24px rgba(45,41,38,0.06)')
  root.style.setProperty('--glass-highlight', isDark ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : 'inset 0 1px 0 rgba(255,255,255,0.5)')
  root.style.setProperty('--shadow', isDark ? '0 2px 12px rgba(0,0,0,0.2)' : '0 2px 12px rgba(45,41,38,0.05)')
  root.style.setProperty('--shadow-lg', isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(45,41,38,0.1)')

  localStorage.setItem(CUSTOM_KEY, JSON.stringify({ bg, accent }))
}

export function applyFont(fontId) {
  const font = FONT_OPTIONS.find(f => f.id === fontId)
  if (!font) return
  document.documentElement.style.setProperty('--font-heading', font.heading)
  document.documentElement.style.setProperty('--font-body', font.body)
  localStorage.setItem(FONT_KEY, fontId)
}

export default function ThemeSelector({ current, onChange }) {
  const [customSettings, setCustomSettings] = useState(getCustomSettings)
  const [fontId, setFontId] = useState(getStoredFont)
  const isCustom = current === 'custom'

  const handleCustomColor = (key, value) => {
    const updated = { ...customSettings, [key]: value }
    setCustomSettings(updated)
    if (isCustom) {
      applyCustomColors(updated.bg, updated.accent)
    }
  }

  const handleFontChange = (id) => {
    setFontId(id)
    applyFont(id)
  }

  return (
    <div>
      {/* Preset themes */}
      <div className="theme-selector mb-md">
        {THEMES.map(theme => (
          <button
            key={theme.id}
            className={`theme-option ${current === theme.id ? 'selected' : ''}`}
            onClick={() => {
              onChange(theme.id)
              if (theme.id === 'custom') {
                applyCustomColors(customSettings.bg, customSettings.accent)
              }
            }}
          >
            {theme.id === 'custom' ? (
              <div
                className="theme-swatch"
                style={{ background: customSettings.bg }}
              >
                <span style={{
                  position: 'absolute', top: 0, right: 0, width: '50%', height: '100%',
                  background: customSettings.accent, display: 'block',
                }} />
              </div>
            ) : (
              <div className={`theme-swatch theme-swatch--${theme.id}`} />
            )}
            <span className="theme-label">{theme.label}</span>
          </button>
        ))}
      </div>

      {/* Custom color pickers (shown when Custom is selected) */}
      {isCustom && (
        <div className="custom-theme-editor">
          <div className="custom-color-section">
            <label className="custom-color-label">Background</label>
            <div className="custom-color-grid">
              {BG_COLORS.map(opt => (
                <button
                  key={opt.color}
                  className={`custom-color-btn ${customSettings.bg === opt.color ? 'selected' : ''}`}
                  style={{ background: opt.color, borderColor: opt.color === '#1a1b2e' ? 'rgba(255,255,255,0.2)' : undefined }}
                  onClick={() => handleCustomColor('bg', opt.color)}
                  title={opt.label}
                />
              ))}
            </div>
          </div>
          <div className="custom-color-section">
            <label className="custom-color-label">Accent</label>
            <div className="custom-color-grid">
              {ACCENT_COLORS.map(opt => (
                <button
                  key={opt.color}
                  className={`custom-color-btn ${customSettings.accent === opt.color ? 'selected' : ''}`}
                  style={{ background: opt.color }}
                  onClick={() => handleCustomColor('accent', opt.color)}
                  title={opt.label}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Font selector */}
      <div className="font-selector-section">
        <label className="custom-color-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Font Style</label>
        <div className="font-selector">
          {FONT_OPTIONS.map(font => (
            <button
              key={font.id}
              className={`font-option ${fontId === font.id ? 'selected' : ''}`}
              onClick={() => handleFontChange(font.id)}
            >
              <span className="font-sample" style={{ fontFamily: font.heading }}>{font.sample}</span>
              <span className="font-label">{font.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
