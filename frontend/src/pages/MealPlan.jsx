import { useState, useEffect, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { api } from '../api/client'
import MealPicker from '../components/MealPicker'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SLOTS = ['breakfast', 'lunch', 'dinner']

function getMonday(d = new Date()) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  return date.toISOString().split('T')[0]
}

function addWeeks(dateStr, weeks) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().split('T')[0]
}

function formatWeekLabel(weekStart) {
  const start = new Date(weekStart + 'T00:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const opts = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString(undefined, opts)} - ${end.toLocaleDateString(undefined, opts)}`
}

export default function MealPlan() {
  const [weekStart, setWeekStart] = useState(getMonday())
  const [entries, setEntries] = useState([])
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [pickerSlot, setPickerSlot] = useState(null) // { dayOfWeek, slot }
  const [mealFilter, setMealFilter] = useState('')
  const [showSidePanel, setShowSidePanel] = useState(false)
  const pin = sessionStorage.getItem('parentPin')

  const fetchData = useCallback(async () => {
    try {
      const [planData, mealsData] = await Promise.all([
        api.mealPlans.getWeek(weekStart),
        api.meals.list(),
      ])
      setEntries(planData.entries)
      setMeals(mealsData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => { fetchData() }, [fetchData])

  const getEntry = (dayOfWeek, slot) => {
    return entries.find(e => e.day_of_week === dayOfWeek && e.slot === slot)
  }

  const getMealCount = (mealId) => {
    return entries.filter(e => e.meal.id === mealId).length
  }

  const handleAddMeal = async (dayOfWeek, slot, mealId) => {
    try {
      await api.mealPlans.addEntry({
        week_start: weekStart,
        day_of_week: dayOfWeek,
        slot,
        meal_id: mealId,
      }, pin)
      await fetchData()
      setPickerSlot(null)
    } catch (e) {
      alert(e.message)
    }
  }

  const handleRemoveMeal = async (entryId) => {
    try {
      await api.mealPlans.removeEntry(entryId, pin)
      await fetchData()
    } catch (e) {
      alert(e.message)
    }
  }

  const handleDragEnd = async (result) => {
    if (!result.destination) return

    const { droppableId } = result.destination
    const [dayStr, slot] = droppableId.split('-')
    const dayOfWeek = parseInt(dayStr, 10)
    const mealId = result.draggableId

    await handleAddMeal(dayOfWeek, slot, mealId)
  }

  const isToday = weekStart === getMonday()

  if (loading) return <div className="text-center mt-lg">Loading...</div>

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div>
        <div className="flex-between mb-lg" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <h1>Meal Plan</h1>
          <div className="flex gap-sm" style={{ alignItems: 'center' }}>
            <button className="btn btn-sm btn-outline" onClick={() => setWeekStart(addWeeks(weekStart, -1))}>&larr;</button>
            <button
              className={`btn btn-sm ${isToday ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setWeekStart(getMonday())}
            >Today</button>
            <span style={{ fontWeight: 600, minWidth: '160px', textAlign: 'center' }}>{formatWeekLabel(weekStart)}</span>
            <button className="btn btn-sm btn-outline" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>&rarr;</button>
          </div>
          <button
            className={`btn btn-sm ${showSidePanel ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setShowSidePanel(!showSidePanel)}
          >
            {showSidePanel ? 'Hide Meals' : 'Show Meals'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          {/* Calendar grid */}
          <div style={{ flex: 1, overflowX: 'auto' }}>
            <div className="meal-plan-grid">
              {/* Header row */}
              <div className="meal-plan-header">
                <div className="meal-plan-slot-label"></div>
                {DAYS.map((day, i) => (
                  <div key={i} className="meal-plan-day-header">
                    <span className="meal-plan-day-full">{day}</span>
                    <span className="meal-plan-day-short">{DAYS_SHORT[i]}</span>
                  </div>
                ))}
              </div>

              {/* Slot rows */}
              {SLOTS.map(slot => (
                <div key={slot} className="meal-plan-row">
                  <div className="meal-plan-slot-label">
                    {slot.charAt(0).toUpperCase() + slot.slice(1)}
                  </div>
                  {DAYS.map((_, dayIdx) => {
                    const entry = getEntry(dayIdx, slot)
                    const droppableId = `${dayIdx}-${slot}`
                    return (
                      <Droppable key={droppableId} droppableId={droppableId}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`meal-plan-cell ${snapshot.isDraggingOver ? 'drag-over' : ''} ${entry ? 'has-meal' : ''}`}
                            onClick={() => !entry && setPickerSlot({ dayOfWeek: dayIdx, slot })}
                          >
                            {entry ? (
                              <div className="meal-plan-meal">
                                {entry.meal.image_path ? (
                                  <img src={entry.meal.image_path} alt="" className="meal-plan-meal-img" />
                                ) : (
                                  <span className="meal-plan-meal-icon">&#x1F37D;&#xFE0F;</span>
                                )}
                                <span className="meal-plan-meal-name">{entry.meal.name}</span>
                                <button
                                  className="meal-plan-remove"
                                  onClick={(e) => { e.stopPropagation(); handleRemoveMeal(entry.id) }}
                                  title="Remove"
                                >&times;</button>
                              </div>
                            ) : (
                              <span className="meal-plan-add">+</span>
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Side panel with draggable meals */}
          {showSidePanel && (
            <div className="meal-side-panel">
              <h3 className="mb-sm">Meals</h3>
              <div className="flex gap-sm mb-sm" style={{ flexWrap: 'wrap' }}>
                <button
                  className={`btn btn-xs ${!mealFilter ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setMealFilter('')}
                >All</button>
                {SLOTS.map(s => (
                  <button
                    key={s}
                    className={`btn btn-xs ${mealFilter === s ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setMealFilter(mealFilter === s ? '' : s)}
                  >{s.charAt(0).toUpperCase() + s.slice(1)}</button>
                ))}
              </div>
              <Droppable droppableId="meal-source" isDropDisabled>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="meal-side-list">
                    {meals
                      .filter(m => !mealFilter || m.categories.includes(mealFilter))
                      .map((meal, index) => {
                        const count = getMealCount(meal.id)
                        const atMax = meal.max_per_week != null && count >= meal.max_per_week
                        return (
                          <Draggable
                            key={meal.id}
                            draggableId={meal.id}
                            index={index}
                            isDragDisabled={atMax}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`meal-side-item ${atMax ? 'at-max' : ''} ${snapshot.isDragging ? 'dragging' : ''}`}
                              >
                                {meal.image_path ? (
                                  <img src={meal.image_path} alt="" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '0.25rem' }} />
                                ) : (
                                  <span>&#x1F37D;&#xFE0F;</span>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meal.name}</div>
                                  {meal.max_per_week != null && (
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                      {count}/{meal.max_per_week} this week
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        )
                      })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          )}
        </div>

        {/* Meal picker modal */}
        {pickerSlot && (
          <MealPicker
            meals={meals}
            slot={pickerSlot.slot}
            getMealCount={getMealCount}
            onSelect={(mealId) => handleAddMeal(pickerSlot.dayOfWeek, pickerSlot.slot, mealId)}
            onClose={() => setPickerSlot(null)}
          />
        )}
      </div>
    </DragDropContext>
  )
}
