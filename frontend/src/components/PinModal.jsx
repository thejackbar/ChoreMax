import { useState } from 'react'

export default function PinModal({ onSubmit, onCancel, title = 'Enter PIN', error = null, maxLength = 6 }) {
  const [digits, setDigits] = useState('')

  const handleKey = (num) => {
    if (digits.length < maxLength) {
      const next = digits + num
      setDigits(next)
      if (next.length >= 4) {
        // Auto-submit when 4+ digits entered
        // User can continue to 6 if they want
      }
    }
  }

  const handleDelete = () => {
    setDigits(d => d.slice(0, -1))
  }

  const handleSubmit = () => {
    if (digits.length >= 4) {
      onSubmit(digits)
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{title}</h2>
        {error && <div className="msg-error">{error}</div>}

        <div className="pin-display">
          {[...Array(maxLength)].map((_, i) => (
            <div key={i} className={`pin-dot ${i < digits.length ? 'filled' : ''}`} />
          ))}
        </div>

        <div className="pin-keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button key={n} className="pin-key" onClick={() => handleKey(String(n))}>
              {n}
            </button>
          ))}
          <button className="pin-key" onClick={handleDelete}>&#x232B;</button>
          <button className="pin-key" onClick={() => handleKey('0')}>0</button>
          <button
            className="pin-key"
            onClick={handleSubmit}
            style={digits.length >= 4 ? { background: 'var(--primary)', color: 'white' } : {}}
          >
            &#x2713;
          </button>
        </div>

        {onCancel && (
          <button className="btn btn-outline btn-block mt-lg" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
