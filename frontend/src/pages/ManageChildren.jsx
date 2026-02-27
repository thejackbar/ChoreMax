import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { getAvatarEmoji } from '../data/avatars'
import AvatarPicker from '../components/AvatarPicker'
import EmptyState from '../components/EmptyState'

export default function ManageChildren() {
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [avatarValue, setAvatarValue] = useState('bear')
  const [error, setError] = useState(null)
  const pin = sessionStorage.getItem('parentPin')

  const fetchChildren = useCallback(async () => {
    try {
      const data = await api.children.list()
      setChildren(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchChildren() }, [fetchChildren])

  const openAdd = () => {
    setEditing(null)
    setName('')
    setAvatarValue('bear')
    setShowForm(true)
    setError(null)
  }

  const openEdit = (child) => {
    setEditing(child)
    setName(child.name)
    setAvatarValue(child.avatar_value)
    setShowForm(true)
    setError(null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      if (editing) {
        await api.children.update(editing.id, { name, avatar_value: avatarValue, avatar_type: 'builtin' }, pin)
      } else {
        await api.children.create({ name, avatar_value: avatarValue, avatar_type: 'builtin' }, pin)
      }
      setShowForm(false)
      await fetchChildren()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleDelete = async (child) => {
    if (!confirm(`Remove ${child.name}? This will delete all their chore history and piggy bank.`)) return
    try {
      await api.children.delete(child.id, pin)
      await fetchChildren()
    } catch (e) {
      alert(e.message)
    }
  }

  if (loading) return <div className="text-center mt-lg">Loading...</div>

  return (
    <div>
      <div className="flex-between mb-lg">
        <h1>Manage Children</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Child</button>
      </div>

      {showForm && (
        <div className="card mb-lg">
          <h3 className="mb-md">{editing ? 'Edit Child' : 'Add Child'}</h3>
          {error && <div className="msg-error">{error}</div>}
          <form onSubmit={handleSave}>
            <div className="field">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Child's name"
                required
              />
            </div>
            <div className="field">
              <label>Avatar</label>
              <AvatarPicker selected={avatarValue} onSelect={setAvatarValue} />
            </div>
            <div className="flex gap-sm">
              <button className="btn btn-primary" type="submit">Save</button>
              <button className="btn btn-outline" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {children.length === 0 && !showForm ? (
        <EmptyState
          icon="&#x1F476;"
          title="No children yet"
          message="Add your first child to get started"
          action={<button className="btn btn-primary" onClick={openAdd}>+ Add Child</button>}
        />
      ) : (
        children.map(child => (
          <div key={child.id} className="manage-item">
            <div className="manage-item-info">
              <span className="item-emoji">{getAvatarEmoji(child.avatar_value)}</span>
              <div>
                <div className="item-title">{child.name}</div>
              </div>
            </div>
            <div className="manage-item-actions">
              <button className="btn btn-sm btn-outline" onClick={() => openEdit(child)}>Edit</button>
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(child)}>Delete</button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
