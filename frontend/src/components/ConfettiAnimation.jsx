import { useEffect, useState } from 'react'

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#f97316', '#06b6d4', '#ef4444']

function randomBetween(min, max) {
  return Math.random() * (max - min) + min
}

export default function ConfettiAnimation({ trigger }) {
  const [pieces, setPieces] = useState([])

  useEffect(() => {
    if (!trigger) return
    const newPieces = Array.from({ length: 30 }, (_, i) => ({
      id: Date.now() + i,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      left: randomBetween(20, 80),
      startTop: randomBetween(30, 50),
      delay: randomBetween(0, 0.3),
      rotation: randomBetween(0, 360),
      size: randomBetween(6, 14),
    }))
    setPieces(newPieces)

    const timer = setTimeout(() => setPieces([]), 1500)
    return () => clearTimeout(timer)
  }, [trigger])

  if (pieces.length === 0) return null

  return (
    <div className="confetti-container">
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            top: `${p.startTop}%`,
            backgroundColor: p.color,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  )
}
