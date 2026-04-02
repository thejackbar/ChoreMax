import { useState, useEffect, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { api } from '../api/client'
import MealPicker from '../components/MealPicker'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SLOTS = ['breakfast', 'lunch', 'dinner']
const SLOT_EMOJI = { breakfast: '\u2615', lunch: '\uD83C\uDF5C', dinner: '\uD83C\uDF7D\uFE0F' }

function toLocalDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMonday(d = new Date()) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  return toLocalDateStr(date)
}

function addWeeks(dateStr, weeks) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + weeks * 7)
  return toLocalDateStr(d)
}

function formatWeekLabel(weekStart) {
  const start = new Date(weekStart + 'T00:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const opts = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString(undefined, opts)} \u2013 ${end.toLocaleDateString(undefined, opts)}`
}

function getDayDate(weekStart, dayIdx) {
  const d = new Date(weekStart + 'T00:00:00')
  d.setDate(d.getDate() + dayIdx)
  return d.getDate()
}

function getTodayDayIndex(weekStart) {
  const today = new Date()
  const todayStr = toLocalDateStr(today)
  const start = new Date(weekStart + 'T00:00:00')
  for (let i = 0; i <= 6; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    if (toLocalDateStr(d) === todayStr) return i
  }
  return -1
}

export default function MealPlan() {
  const [weekStart, setWeekStart] = useState(getMonday())
  const [entries, setEntries] = useState([])
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [pickerSlot, setPickerSlot] = useState(null)
  const [mealFilter, setMealFilter] = useState('')
  const [showSidePanel, setShowSidePanel] = useState(false)
  const pin = sessionStorage.getItem('parentPin')

  const todayIdx = getTodayDayIndex(weekStart)

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

  const isThisWeek = weekStart === getMonday()
  const filledCount = entries.length
  const totalSlots = 21

  if (loading) return <div className="text-center mt-lg">Loading...</div>

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="mp-page">
        {/* Header */}
        <div className="mp-header">
          <div className="mp-header-top">
            <h1>Meal Plan</h1>
            <div className="mp-stats">
              <span className="mp-stat">{filledCount}/{totalSlots} planned</span>
            </div>
          </div>
          <div className="mp-week-nav">
            <button className="mp-nav-btn" onClick={() => setWeekStart(addWeeks(weekStart, -1))}>
              &#x2039;
            </button>
            <div className="mp-week-center">
              <span className="mp-week-label">{formatWeekLabel(weekStart)}</span>
              {!isThisWeek && (
                <button className="mp-today-btn" onClick={() => setWeekStart(getMonday())}>
                  This Week
                </button>
              )}
            </div>
            <button className="mp-nav-btn" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
              &#x203A;
            </button>
          </div>
        </div>

        <div className="mp-layout">
          {/* Main calendar */}
          <div className="mp-calendar">
            {/* Day headers */}
            <div className="mp-day-headers">
              <div className="mp-slot-spacer" />
              {DAYS.map((day, i) => (
                <div key={i} className={`mp-day-header ${i === todayIdx ? 'mp-day-today' : ''}`}>
                  <span className="mp-day-full">{day} {getDayDate(weekStart, i)}</span>
                  <span className="mp-day-short">{DAYS_SHORT[i]} {getDayDate(weekStart, i)}</span>
                </div>
              ))}
            </div>

            {/* Slot rows */}
            {SLOTS.map(slot => (
              <div key={slot} className="mp-row">
                <div className="mp-slot-label">
                  <span className="mp-slot-emoji">{SLOT_EMOJI[slot]}</span>
                  <span className="mp-slot-text">{slot.charAt(0).toUpperCase() + slot.slice(1)}</span>
                </div>
                {DAYS.map((_, dayIdx) => {
                  const entry = getEntry(dayIdx, slot)
                  const droppableId = `${dayIdx}-${slot}`
                  const isToday = dayIdx === todayIdx
                  return (
                    <Droppable key={droppableId} droppableId={droppableId}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`mp-cell ${snapshot.isDraggingOver ? 'mp-cell--dragover' : ''} ${entry ? 'mp-cell--filled' : ''} ${isToday ? 'mp-cell--today' : ''}`}
                          onClick={() => !entry && setPickerSlot({ dayOfWeek: dayIdx, slot })}
                        >
                          {entry ? (
                            <div className="mp-meal-card">
                              {entry.meal.image_path ? (
                                <img src={entry.meal.image_path} alt="" className="mp-meal-img" />
                              ) : (
                                <div className="mp-meal-placeholder">
                                  &#x1F37D;&#xFE0F;
                                </div>
                              )}
                              <span className="mp-meal-name">{entry.meal.name}</span>
                              <button
                                className="mp-meal-remove"
                                onClick={(e) => { e.stopPropagation(); handleRemoveMeal(entry.id) }}
                                title="Remove"
                              >&times;</button>
                            </div>
                          ) : (
                            <div className="mp-cell-empty">
                              <span className="mp-cell-plus">+</span>
                            </div>
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

          {/* Side panel */}
          <div className={`mp-sidebar ${showSidePanel ? 'mp-sidebar--open' : ''}`}>
            <div className="mp-sidebar-header">
              <h3>Meals</h3>
              <button className="mp-sidebar-close" onClick={() => setShowSidePanel(false)}>&times;</button>
            </div>
            <div className="mp-sidebar-filters">
              <button
                className={`mp-filter ${!mealFilter ? 'active' : ''}`}
                onClick={() => setMealFilter('')}
              >All</button>
              {SLOTS.map(s => (
                <button
                  key={s}
                  className={`mp-filter ${mealFilter === s ? 'active' : ''}`}
                  onClick={() => setMealFilter(mealFilter === s ? '' : s)}
                >{s.charAt(0).toUpperCase() + s.slice(1)}</button>
              ))}
            </div>
            <Droppable droppableId="meal-source" isDropDisabled>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="mp-sidebar-list">
                  {meals
                    .filter(m => !mealFilter || m.categories.includes(mealFilter))
                    .map((meal, index) => {
                      const count = getMealCount(meal.id)
                      const atMax = meal.max_per_week != null && count >= meal.max_per_week
                      return (
                        <Draggable key={meal.id} draggableId={meal.id} index={index} isDragDisabled={atMax}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`mp-sidebar-meal ${atMax ? 'mp-sidebar-meal--max' : ''} ${snapshot.isDragging ? 'mp-sidebar-meal--drag' : ''}`}
                            >
                              {meal.image_path ? (
                                <img src={meal.image_path} alt="" className="mp-sidebar-meal-img" />
                              ) : (
                                <span className="mp-sidebar-meal-icon">&#x1F37D;&#xFE0F;</span>
                              )}
                              <div className="mp-sidebar-meal-info">
                                <span className="mp-sidebar-meal-name">{meal.name}</span>
                                {meal.max_per_week != null && (
                                  <span className="mp-sidebar-meal-count">{count}/{meal.max_per_week} this week</span>
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
        </div>

        {/* Toggle side panel button (floating) */}
        <button
          className={`mp-toggle-btn ${showSidePanel ? 'mp-toggle-btn--active' : ''}`}
          onClick={() => setShowSidePanel(!showSidePanel)}
          title={showSidePanel ? 'Hide meals' : 'Show meals'}
        >
          &#x1F37D;&#xFE0F;
        </button>

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
