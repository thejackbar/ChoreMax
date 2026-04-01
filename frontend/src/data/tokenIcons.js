export const TOKEN_ICONS = {
  star: { emoji: '⭐', label: 'Stars' },
  soccer: { emoji: '⚽', label: 'Soccer Balls' },
  heart: { emoji: '❤️', label: 'Hearts' },
  lightning: { emoji: '⚡', label: 'Lightning Bolts' },
  diamond: { emoji: '💎', label: 'Diamonds' },
  flame: { emoji: '🔥', label: 'Flames' },
  music: { emoji: '🎵', label: 'Music Notes' },
  rocket: { emoji: '🚀', label: 'Rockets' },
  rainbow: { emoji: '🌈', label: 'Rainbows' },
  paw: { emoji: '🐾', label: 'Paw Prints' },
}

export function getTokenEmoji(icon) {
  return TOKEN_ICONS[icon]?.emoji || '⭐'
}

export function getTokenLabel(icon) {
  return TOKEN_ICONS[icon]?.label || 'Stars'
}

export function formatTokens(amount, icon = 'star') {
  const emoji = getTokenEmoji(icon)
  return `${amount} ${emoji}`
}
