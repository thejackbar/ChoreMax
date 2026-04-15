import { useState, useEffect, useCallback } from 'react'

export default function PinModal({ onSubmit, onCancel, title = 'Enter PIN', error = null, maxLength = 6 }) {
  const [digits, setDigits] = useState('')

  const handleKey = useCallback((num) => {
    setDigits(prev => (prev.length < maxLength ? prev + num : prev))
  }, [maxLength])

  const handleDelete = useCallback(() => {
    setDigits(d => d.slice(0, -1))
  }, [])

  const handleSubmit = useCallback((pinToUse) => {
    const value = pinToUse ?? digits
    if (value.length >= 4) {
      onSubmit(value)
    }
  }, [digits, onSubmit])

  // Physical keyboard support (desktop/laptop users)
  useEffect(() => {
    const onKeyDown = (e) => {
      // Don't hijack typing in inputs (e.g. screen-readers, nested inputs)
      const tag = (e.target?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault()
        setDigits(prev => (prev.length < maxLength ? prev + e.key : prev))
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        setDigits(d => d.slice(0, -1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        setDigits(prev => {
          if (prev.length >= 4) onSubmit(prev)
          return prev
        })
      } else if (e.key === 'Escape' && onCancel) {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [maxLength, onSubmit, onCancel])

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-label={title}>
        <h2>{title}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '-0.25rem', marginBottom: '0.5rem' }}>
          Tip: type your PIN on your keyboard, or use the keypad.
        </p>
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
          <button className="pin-key" onClick={handleDelete} aria-label="Delete">&#x232B;</button>
          <button className="pin-key" onClick={() => handleKey('0')}>0</button>
          <button
            className="pin-key"
            onClick={() => handleSubmit()}
            aria-label="Submit"
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
