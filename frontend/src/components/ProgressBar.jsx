export default function ProgressBar({ current, target, label, emoji = '', showLabel = true, green = false }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0

  return (
    <div className="progress-container">
      {showLabel && label && (
        <div className="progress-label">
          <span>{emoji} {label}</span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div className="progress-bar">
        <div className={`progress-fill ${green || pct >= 100 ? 'green' : ''}`} style={{ width: `${pct}%` }} />
        <div className="progress-text">
          {typeof current === 'number' && current % 1 !== 0
            ? Number(current).toFixed(2)
            : current} / {typeof target === 'number' && target % 1 !== 0
            ? Number(target).toFixed(2)
            : target}
        </div>
      </div>
    </div>
  )
}
