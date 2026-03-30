export default function MealPicker({ meals, slot, getMealCount, onSelect, onClose }) {
  const filtered = meals.filter(m => m.categories.includes(slot))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="flex-between mb-md">
          <h3>Pick a {slot.charAt(0).toUpperCase() + slot.slice(1)}</h3>
          <button className="btn btn-sm btn-outline" onClick={onClose}>&times;</button>
        </div>
        {filtered.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>
            No meals tagged as {slot}. Add meals in Parent Settings &rarr; Manage Meals.
          </p>
        ) : (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {filtered.map(meal => {
              const count = getMealCount(meal.id)
              const atMax = meal.max_per_week != null && count >= meal.max_per_week
              return (
                <div
                  key={meal.id}
                  className={`manage-item ${atMax ? 'disabled' : ''}`}
                  style={{ cursor: atMax ? 'not-allowed' : 'pointer', opacity: atMax ? 0.5 : 1 }}
                  onClick={() => !atMax && onSelect(meal.id)}
                >
                  <div className="manage-item-info">
                    {meal.image_path ? (
                      <img
                        src={meal.image_path}
                        alt={meal.name}
                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '0.375rem', flexShrink: 0 }}
                      />
                    ) : (
                      <span className="item-emoji">&#x1F37D;&#xFE0F;</span>
                    )}
                    <div>
                      <div className="item-title">{meal.name}</div>
                      <div className="item-sub">
                        {meal.servings} servings
                        {meal.max_per_week != null && ` \u00b7 ${count}/${meal.max_per_week} this week`}
                        {atMax && ' (limit reached)'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
