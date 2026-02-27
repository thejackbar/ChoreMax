export default function ProgressBar({ current, target, label, emoji = '' }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0

  return (
    <div className="progress-container">
      {label && (
        <div className="progress-label">
          <span>{emoji} {label}</span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
        <div className="progress-text">
          {current.toFixed ? Number(current).toFixed(2) : current} / {target.toFixed ? Number(target).toFixed(2) : target}
        </div>
      </div>
    </div>
  )
}
