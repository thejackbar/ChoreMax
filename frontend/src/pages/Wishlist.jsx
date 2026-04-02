import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useChild } from '../context/ChildContext'
import { getAvatarEmoji } from '../data/avatars'
import PinModal from '../components/PinModal'

const EMOJIS = ['\u2B50', '\uD83C\uDFAE', '\uD83D\uDCF1', '\uD83D\uDC5F', '\uD83D\uDCDA', '\uD83C\uDFA8', '\uD83C\uDFC0', '\uD83C\uDFB5', '\uD83D\uDE80', '\uD83C\uDF81', '\uD83E\uDDF8', '\uD83D\uDC57']

export default function Wishlist() {
  const { children, fetchChildren, activeChild } = useChild()
  const [selectedChild, setSelectedChild] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [pinAction, setPinAction] = useState(null) // { type: 'toggle'|'delete', item }
  const [pinError, setPinError] = useState(null)

  // Form state
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('\u2B50')
  const [url, setUrl] = useState('')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => { fetchChildren() }, [fetchChildren])

  useEffect(() => {
    if (children.length > 0 && !selectedChild) {
      setSelectedChild(activeChild?.id || children[0].id)
    }
  }, [children, activeChild])

  const fetchItems = useCallback(async () => {
    if (!selectedChild) return
    setLoading(true)
    try {
      const data = await api.wishlists.list(selectedChild)
      setItems(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [selectedChild])

  useEffect(() => { fetchItems() }, [fetchItems])

  const resetForm = () => {
    setTitle('')
    setEmoji('\u2B50')
    setUrl('')
    setPrice('')
    setNotes('')
    setEditItem(null)
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = {
      child_id: selectedChild,
      title,
      emoji,
      url: url || null,
      price: price ? parseInt(price) : null,
      notes: notes || null,
    }
    try {
      if (editItem) {
        await api.wishlists.update(editItem.id, data)
      } else {
        await api.wishlists.create(data)
      }
      resetForm()
      await fetchItems()
    } catch (e) {
      alert(e.message)
    }
  }

  const handlePinAction = async (pinVal) => {
    try {
      if (pinAction.type === 'toggle') {
        await api.wishlists.toggle(pinAction.item.id, pinVal)
      } else {
        await api.wishlists.delete(pinAction.item.id, pinVal)
      }
      setPinAction(null)
      setPinError(null)
      await fetchItems()
    } catch (e) {
      setPinError(e.message)
    }
  }

  const startEdit = (item) => {
    setTitle(item.title)
    setEmoji(item.emoji)
    setUrl(item.url || '')
    setPrice(item.price ? String(item.price) : '')
    setNotes(item.notes || '')
    setEditItem(item)
    setShowForm(true)
  }

  const activeItems = items.filter(i => !i.is_purchased)
  const purchasedItems = items.filter(i => i.is_purchased)
  const currentChild = children.find(c => c.id === selectedChild)

  return (
    <div>
      <div className="flex-between mb-lg" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <h1>Wishlists</h1>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true) }}>
          + Add Wish
        </button>
      </div>

      {/* Child selector tabs */}
      {children.length > 0 && (
        <div className="wish-child-tabs mb-lg">
          {children.map(child => (
            <button
              key={child.id}
              className={`wish-child-tab ${selectedChild === child.id ? 'active' : ''}`}
              onClick={() => setSelectedChild(child.id)}
            >
              <span className="wish-tab-avatar">{getAvatarEmoji(child.avatar_value)}</span>
              <span className="wish-tab-name">{child.name}</span>
              {selectedChild === child.id && (
                <span className="wish-tab-count">{activeItems.length}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center mt-lg">Loading...</div>
      ) : (
        <>
          {activeItems.length === 0 && purchasedItems.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>&#x1F381;</div>
              <h3>{currentChild?.name}'s Wishlist</h3>
              <p className="text-muted">No wishes yet. Add something!</p>
            </div>
          )}

          {/* Active wishes */}
          <div className="wish-grid">
            {activeItems.map(item => (
              <div key={item.id} className="wish-card">
                <div className="wish-card-top" onClick={() => startEdit(item)}>
                  <span className="wish-emoji">{item.emoji}</span>
                  <span className="wish-title">{item.title}</span>
                  {item.price != null && (
                    <span className="wish-price">${item.price}</span>
                  )}
                </div>
                {item.notes && <p className="wish-notes">{item.notes}</p>}
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="wish-link">
                    &#x1F517; Link
                  </a>
                )}
                <div className="wish-actions">
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => { setPinAction({ type: 'toggle', item }); setPinError(null) }}
                  >&#x2705; Got it!</button>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => { setPinAction({ type: 'delete', item }); setPinError(null) }}
                  >&times;</button>
                </div>
              </div>
            ))}
          </div>

          {/* Purchased */}
          {purchasedItems.length > 0 && (
            <div style={{ marginTop: '1.5rem', opacity: 0.6 }}>
              <h3 className="mb-sm">&#x2705; Purchased</h3>
              <div className="wish-grid">
                {purchasedItems.map(item => (
                  <div key={item.id} className="wish-card wish-card--purchased">
                    <div className="wish-card-top">
                      <span className="wish-emoji">{item.emoji}</span>
                      <span className="wish-title" style={{ textDecoration: 'line-through' }}>{item.title}</span>
                    </div>
                    <button
                      className="btn btn-sm btn-outline"
                      style={{ marginTop: '0.5rem' }}
                      onClick={() => { setPinAction({ type: 'toggle', item }); setPinError(null) }}
                    >Undo</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add/Edit form modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => resetForm()}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h2>{editItem ? 'Edit Wish' : 'Add a Wish'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>What do they want?</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} required autoFocus placeholder="e.g. LEGO Star Wars set" />
              </div>
              <div className="field">
                <label>Icon</label>
                <div className="wish-emoji-picker">
                  {EMOJIS.map(e => (
                    <button
                      key={e}
                      type="button"
                      className={`wish-emoji-btn ${emoji === e ? 'selected' : ''}`}
                      onClick={() => setEmoji(e)}
                    >{e}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="field">
                  <label>Price (optional)</label>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} min="0" placeholder="$" />
                </div>
                <div className="field">
                  <label>Link (optional)</label>
                  <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
                </div>
              </div>
              <div className="field">
                <label>Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Size, colour, etc." />
              </div>
              <div className="flex gap-sm">
                <button className="btn btn-primary" type="submit">{editItem ? 'Save' : 'Add'}</button>
                <button className="btn btn-outline" type="button" onClick={resetForm}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pinAction && (
        <PinModal
          title={pinAction.type === 'delete' ? `Delete "${pinAction.item.title}"?` : `Mark "${pinAction.item.title}" as ${pinAction.item.is_purchased ? 'not purchased' : 'purchased'}?`}
          error={pinError}
          onSubmit={handlePinAction}
          onCancel={() => { setPinAction(null); setPinError(null) }}
        />
      )}
    </div>
  )
}
