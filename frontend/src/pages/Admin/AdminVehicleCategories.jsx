import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Save, X, GripVertical } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useToast } from '../../context/ToastContext'

export default function AdminVehicleCategories() {
  const { showToast } = useToast()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', slug: '', description: '', sortOrder: 0 })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/admin/vehicle-categories')
      setCategories(res.categories || [])
    } catch (err) {
      showToast('Failed to load categories', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!form.name || !form.slug) return showToast('Name and slug are required', 'error')
    setSaving(true)
    try {
      if (editingId) {
        await apiClient.put(`/admin/vehicle-categories/${editingId}`, form)
        showToast('Category updated')
      } else {
        await apiClient.post('/admin/vehicle-categories', form)
        showToast('Category created')
      }
      setEditingId(null)
      setForm({ name: '', slug: '', description: '', sortOrder: 0 })
      fetchCategories()
    } catch (err) {
      showToast(err.message || 'Failed to save category', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return
    try {
      await apiClient.delete(`/admin/vehicle-categories/${id}`)
      showToast('Category deleted')
      fetchCategories()
    } catch (err) {
      showToast('Failed to delete category', 'error')
    }
  }

  const startEdit = (cat) => {
    setEditingId(cat._id)
    setForm({ name: cat.name, slug: cat.slug, description: cat.description || '', sortOrder: cat.sortOrder || 0 })
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-24">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>Vehicle Types</h1>
          <p className="text-secondary">Manage vehicle categories for plans and user profiles</p>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
        {/* Category List */}
        <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--divider)', fontWeight: 600 }}>Active Categories</div>
          <div className="flex flex-col">
            {categories.length === 0 ? (
              <div className="p-24 text-center text-secondary">No categories found</div>
            ) : categories.map((cat) => (
              <div key={cat._id} style={{ padding: '16px 24px', borderBottom: '1px solid var(--divider)', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{cat.name}</div>
                  <div className="text-body-sm text-tertiary">slug: {cat.slug}</div>
                </div>
                <div className="flex gap-8">
                  <button onClick={() => startEdit(cat)} className="btn-icon btn-glass" style={{ width: 32, height: 32 }}><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(cat._id)} className="btn-icon btn-glass" style={{ width: 32, height: 32, color: 'var(--error)' }}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add/Edit Form */}
        <div className="glass" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 20 }}>{editingId ? 'Edit Category' : 'Add New Category'}</h3>
          <div className="flex flex-col gap-16">
            <div>
              <label className="text-label text-secondary block mb-6">Category Name</label>
              <input 
                className="input-field" 
                placeholder="e.g. Small Car" 
                value={form.name} 
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-label text-secondary block mb-6">Slug (System ID)</label>
              <input 
                className="input-field" 
                placeholder="e.g. small_car" 
                value={form.slug} 
                onChange={e => setForm({ ...form, slug: e.target.value })}
              />
            </div>
            <div>
              <label className="text-label text-secondary block mb-6">Description</label>
              <textarea 
                className="input-field" 
                style={{ height: 80, resize: 'none' }}
                placeholder="Brief description..." 
                value={form.description} 
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className="text-label text-secondary block mb-6">Sort Order</label>
              <input 
                type="number"
                className="input-field" 
                value={form.sortOrder} 
                onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex gap-12 mt-8">
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
                <Save size={16} /> {saving ? 'Saving...' : (editingId ? 'Update' : 'Create')}
              </button>
              {editingId && (
                <button className="btn btn-ghost" onClick={() => { setEditingId(null); setForm({ name: '', slug: '', description: '', sortOrder: 0 }) }}>
                  <X size={16} /> Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
