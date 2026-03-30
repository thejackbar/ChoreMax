import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import EmptyState from '../components/EmptyState'

const UNITS = ['g', 'kg', 'ml', 'L', 'cup', 'tbsp', 'tsp', 'piece', 'bunch', 'can', 'packet', 'slice', 'clove', 'pinch']
const INGREDIENT_CATEGORIES = ['produce', 'dairy', 'meat', 'seafood', 'pantry', 'frozen', 'bakery', 'beverages', 'condiments', 'other']
const MEAL_CATEGORIES = ['breakfast', 'lunch', 'dinner']

const emptyIngredient = () => ({ name: '', quantity: '1', unit: 'piece', category: 'pantry' })

export default function ManageMeals() {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')
  const pin = sessionStorage.getItem('parentPin')

  // Form state
  const [name, setName] = useState('')
  const [categories, setCategories] = useState([])
  const [servings, setServings] = useState(4)
  const [maxPerWeek, setMaxPerWeek] = useState('')
  const [ingredients, setIngredients] = useState([emptyIngredient()])
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  const fetchMeals = useCallback(async () => {
    try {
      const params = filter ? { category: filter } : undefined
      const data = await api.meals.list(params)
      setMeals(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchMeals() }, [fetchMeals])

  const toggleCategory = (cat) => {
    setCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  }

  const updateIngredient = (index, field, value) => {
    setIngredients(prev => prev.map((ing, i) => i === index ? { ...ing, [field]: value } : ing))
  }

  const addIngredient = () => setIngredients(prev => [...prev, emptyIngredient()])

  const removeIngredient = (index) => {
    setIngredients(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev)
  }

  const openAdd = () => {
    setEditing(null)
    setName('')
    setCategories([])
    setServings(4)
    setMaxPerWeek('')
    setIngredients([emptyIngredient()])
    setImageFile(null)
    setImagePreview(null)
    setShowForm(true)
    setError(null)
  }

  const openEdit = (meal) => {
    setEditing(meal)
    setName(meal.name)
    setCategories([...meal.categories])
    setServings(meal.servings)
    setMaxPerWeek(meal.max_per_week != null ? String(meal.max_per_week) : '')
    setIngredients(
      meal.ingredients.length > 0
        ? meal.ingredients.map(i => ({ name: i.name, quantity: String(i.quantity), unit: i.unit, category: i.category }))
        : [emptyIngredient()]
    )
    setImageFile(null)
    setImagePreview(meal.image_path)
    setShowForm(true)
    setError(null)
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError(null)

    if (categories.length === 0) {
      setError('Select at least one meal category')
      return
    }

    const validIngredients = ingredients.filter(i => i.name.trim())
    if (validIngredients.length === 0) {
      setError('Add at least one ingredient')
      return
    }

    const data = {
      name,
      categories,
      servings,
      max_per_week: maxPerWeek ? Number(maxPerWeek) : null,
      ingredients: validIngredients.map(i => ({
        name: i.name.trim(),
        quantity: Number(i.quantity) || 1,
        unit: i.unit,
        category: i.category,
      })),
    }

    try {
      let meal
      if (editing) {
        meal = await api.meals.update(editing.id, data, pin)
      } else {
        meal = await api.meals.create(data, pin)
      }

      if (imageFile) {
        await api.meals.uploadImage(meal.id, imageFile, pin)
      }

      setShowForm(false)
      await fetchMeals()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleDelete = async (meal) => {
    if (!confirm(`Delete "${meal.name}"?`)) return
    try {
      await api.meals.delete(meal.id, pin)
      await fetchMeals()
    } catch (e) {
      alert(e.message)
    }
  }

  if (loading) return <div className="text-center mt-lg">Loading...</div>

  return (
    <div>
      <div className="flex-between mb-lg">
        <h1>Manage Meals</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Meal</button>
      </div>

      {/* Category filter */}
      <div className="flex gap-sm mb-lg" style={{ flexWrap: 'wrap' }}>
        <button
          className={`btn btn-sm ${!filter ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setFilter('')}
        >All</button>
        {MEAL_CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`btn btn-sm ${filter === cat ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter(filter === cat ? '' : cat)}
          >{cat.charAt(0).toUpperCase() + cat.slice(1)}</button>
        ))}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="card mb-lg">
          <h3 className="mb-md">{editing ? 'Edit Meal' : 'Add Meal'}</h3>
          {error && <div className="msg-error">{error}</div>}
          <form onSubmit={handleSave}>
            <div className="field">
              <label>Meal Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Spaghetti Bolognese" required />
            </div>

            <div className="field">
              <label>Categories</label>
              <div className="flex gap-sm">
                {MEAL_CATEGORIES.map(cat => (
                  <label key={cat} className="flex gap-sm" style={{ alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={categories.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                    />
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-md">
              <div className="field" style={{ flex: 1 }}>
                <label>Servings</label>
                <input type="number" min="1" value={servings} onChange={e => setServings(Number(e.target.value))} required />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>Max per week (optional)</label>
                <input type="number" min="1" value={maxPerWeek} onChange={e => setMaxPerWeek(e.target.value)} placeholder="Unlimited" />
              </div>
            </div>

            <div className="field">
              <label>Photo (optional)</label>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} />
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '0.5rem', marginTop: '0.5rem' }}
                />
              )}
            </div>

            {/* Ingredients */}
            <div className="field">
              <label>Ingredients</label>
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex gap-sm mb-sm" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={ing.name}
                    onChange={e => updateIngredient(idx, 'name', e.target.value)}
                    placeholder="Ingredient name"
                    style={{ flex: 2, minWidth: '120px' }}
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={ing.quantity}
                    onChange={e => updateIngredient(idx, 'quantity', e.target.value)}
                    style={{ width: '80px' }}
                  />
                  <select
                    value={ing.unit}
                    onChange={e => updateIngredient(idx, 'unit', e.target.value)}
                    style={{ width: '100px' }}
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <select
                    value={ing.category}
                    onChange={e => updateIngredient(idx, 'category', e.target.value)}
                    style={{ width: '120px' }}
                  >
                    {INGREDIENT_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => removeIngredient(idx)}
                    style={{ padding: '0.35rem 0.5rem' }}
                  >X</button>
                </div>
              ))}
              <button type="button" className="btn btn-sm btn-outline" onClick={addIngredient}>
                + Add Ingredient
              </button>
            </div>

            <div className="flex gap-sm">
              <button className="btn btn-primary" type="submit">Save</button>
              <button className="btn btn-outline" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Meal list */}
      {meals.length === 0 && !showForm ? (
        <EmptyState
          icon="&#x1F35D;"
          title="No meals yet"
          message="Add meals to start planning your family's week"
          action={<button className="btn btn-primary" onClick={openAdd}>+ Add Meal</button>}
        />
      ) : (
        meals.map(meal => (
          <div key={meal.id} className="manage-item">
            <div className="manage-item-info">
              {meal.image_path ? (
                <img
                  src={meal.image_path}
                  alt={meal.name}
                  style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '0.5rem', flexShrink: 0 }}
                />
              ) : (
                <span className="item-emoji">&#x1F37D;&#xFE0F;</span>
              )}
              <div>
                <div className="item-title">{meal.name}</div>
                <div className="item-sub">
                  {meal.categories.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}
                  {' '}&middot; {meal.servings} servings
                  {meal.max_per_week && ` \u00b7 Max ${meal.max_per_week}/week`}
                  {' '}&middot; {meal.ingredients.length} ingredients
                </div>
              </div>
            </div>
            <div className="manage-item-actions">
              <button className="btn btn-sm btn-outline" onClick={() => openEdit(meal)}>Edit</button>
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(meal)}>Delete</button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
