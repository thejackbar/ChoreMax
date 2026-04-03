import { useState, useEffect } from 'react'
import { api } from '../api/client'

const SECTION_LABELS = {
  hero: 'Hero Section',
  proof: 'Social Proof Bar',
  features: 'Features Section',
  mid_cta: 'Mid-Page CTA',
  steps: 'How It Works',
  testimonials: 'Testimonials',
  waitlist: 'Waitlist Form',
  hero_cards: 'Hero Preview Cards',
}

const FIELD_LABELS = {
  eyebrow: 'Eyebrow text',
  title_line1: 'Title line 1',
  title_line2: 'Title line 2',
  subtitle: 'Subtitle',
  cta_primary: 'Primary button',
  cta_secondary: 'Secondary button',
  title: 'Title',
  button: 'Button text',
  success_icon: 'Success icon',
  success_title: 'Success title',
  success_message: 'Success message',
  fine_print: 'Fine print',
  value: 'Value',
  label: 'Label',
  icon: 'Icon',
  desc: 'Description',
  name: 'Name',
  quote: 'Quote',
  role: 'Role',
  num: 'Step number',
  stat: 'Stat text',
  avatar: 'Avatar',
  type: 'Type',
  percent: 'Percent',
}

function fieldLabel(key) {
  return FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function SimpleField({ label, value, onChange, multiline }) {
  return (
    <div className="field" style={{ marginBottom: '0.75rem' }}>
      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} />
      ) : (
        <input type="text" value={value} onChange={e => onChange(e.target.value)} />
      )}
    </div>
  )
}

function ObjectEditor({ data, onChange }) {
  if (!data || typeof data !== 'object') return null
  const keys = Object.keys(data)
  return (
    <div>
      {keys.map(key => {
        if (key === 'items' || key === 'feature_options') return null
        const val = data[key]
        if (typeof val === 'string') {
          const isLong = val.length > 80
          return (
            <SimpleField
              key={key}
              label={fieldLabel(key)}
              value={val}
              onChange={v => onChange({ ...data, [key]: v })}
              multiline={isLong}
            />
          )
        }
        if (typeof val === 'number') {
          return (
            <div className="field" key={key} style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{fieldLabel(key)}</label>
              <input type="number" value={val} onChange={e => onChange({ ...data, [key]: Number(e.target.value) })} />
            </div>
          )
        }
        return null
      })}
    </div>
  )
}

function ArrayItemEditor({ items, onChange, itemLabel = 'Item' }) {
  const updateItem = (index, newItem) => {
    const updated = [...items]
    updated[index] = newItem
    onChange(updated)
  }

  const removeItem = (index) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const addItem = () => {
    if (items.length === 0) return
    const template = { ...items[0] }
    Object.keys(template).forEach(k => {
      if (typeof template[k] === 'string') template[k] = ''
      if (typeof template[k] === 'number') template[k] = 0
    })
    onChange([...items, template])
  }

  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{
          background: 'var(--bg-secondary, #f5f5f5)',
          borderRadius: '0.75rem',
          padding: '1rem',
          marginBottom: '0.75rem',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <strong style={{ fontSize: '0.85rem' }}>{itemLabel} {i + 1}</strong>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(i)}
                style={{ background: 'none', border: 'none', color: 'var(--danger, #e53e3e)', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Remove
              </button>
            )}
          </div>
          {typeof item === 'string' ? (
            <input
              type="text"
              value={item}
              onChange={e => {
                const updated = [...items]
                updated[i] = e.target.value
                onChange(updated)
              }}
            />
          ) : (
            <ObjectEditor data={item} onChange={newItem => updateItem(i, newItem)} />
          )}
        </div>
      ))}
      <button type="button" className="btn btn-outline" onClick={addItem} style={{ fontSize: '0.85rem' }}>
        + Add {itemLabel}
      </button>
    </div>
  )
}

function SectionEditor({ sectionKey, data, onSave, saving }) {
  const [edited, setEdited] = useState(data)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setEdited(data)
    setDirty(false)
  }, [data])

  const handleChange = (newData) => {
    setEdited(newData)
    setDirty(true)
  }

  const handleSave = () => {
    onSave(sectionKey, edited)
    setDirty(false)
  }

  // Array sections (proof, hero_cards)
  if (Array.isArray(edited)) {
    const itemLabel = sectionKey === 'proof' ? 'Stat' : sectionKey === 'hero_cards' ? 'Card' : 'Item'
    return (
      <div>
        <ArrayItemEditor items={edited} onChange={handleChange} itemLabel={itemLabel} />
        {dirty && (
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ marginTop: '1rem' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>
    )
  }

  // Object sections with nested items arrays
  const hasItems = edited.items && Array.isArray(edited.items)
  const hasFeatureOptions = edited.feature_options && Array.isArray(edited.feature_options)
  const itemLabel = sectionKey === 'features' ? 'Feature' : sectionKey === 'steps' ? 'Step' : sectionKey === 'testimonials' ? 'Testimonial' : 'Item'

  return (
    <div>
      <ObjectEditor data={edited} onChange={handleChange} />

      {hasItems && (
        <div style={{ marginTop: '1rem' }}>
          <h4 style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>{itemLabel}s</h4>
          <ArrayItemEditor
            items={edited.items}
            onChange={items => handleChange({ ...edited, items })}
            itemLabel={itemLabel}
          />
        </div>
      )}

      {hasFeatureOptions && (
        <div style={{ marginTop: '1rem' }}>
          <h4 style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>Feature Options (dropdown)</h4>
          <ArrayItemEditor
            items={edited.feature_options}
            onChange={opts => handleChange({ ...edited, feature_options: opts })}
            itemLabel="Option"
          />
        </div>
      )}

      {dirty && (
        <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ marginTop: '1rem' }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      )}
    </div>
  )
}

export default function ManageSite() {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [openSection, setOpenSection] = useState(null)

  useEffect(() => {
    api.cms.getAll()
      .then(data => setContent(data))
      .catch(() => setMsg('Failed to load site content'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (key, data) => {
    setSaving(true)
    setMsg(null)
    try {
      const pin = sessionStorage.getItem('parentPin')
      await api.cms.update(key, data, pin)
      setContent(prev => ({ ...prev, [key]: data }))
      setMsg('Saved!')
      setTimeout(() => setMsg(null), 2000)
    } catch (e) {
      setMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex-center" style={{ padding: '2rem' }}>Loading...</div>

  const sectionOrder = ['hero', 'hero_cards', 'proof', 'features', 'mid_cta', 'steps', 'testimonials', 'waitlist']
  const sections = sectionOrder.filter(k => content?.[k])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Manage Landing Page</h2>
        <a href="/welcome" target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: '0.85rem' }}>
          View Landing Page
        </a>
      </div>

      {msg && (
        <div className={`flash ${msg.includes('Saved') ? 'flash-success' : 'flash-error'}`} style={{ marginBottom: '1rem' }}>
          {msg}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {sections.map(key => (
          <div key={key} style={{
            background: 'var(--glass-bg, rgba(255,255,255,0.7))',
            borderRadius: '1rem',
            border: '1px solid var(--glass-border, rgba(0,0,0,0.08))',
            overflow: 'hidden',
          }}>
            <button
              onClick={() => setOpenSection(openSection === key ? null : key)}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.25rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              <span>{SECTION_LABELS[key] || key}</span>
              <span style={{ transform: openSection === key ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                &#9660;
              </span>
            </button>
            {openSection === key && (
              <div style={{ padding: '0 1.25rem 1.25rem' }}>
                <SectionEditor
                  sectionKey={key}
                  data={content[key]}
                  onSave={handleSave}
                  saving={saving}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
