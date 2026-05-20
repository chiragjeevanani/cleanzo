import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Star, X, Loader2, Check } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useToast } from '../../context/ToastContext'

const EMPTY = { name: '', role: '', text: '', rating: 5, isActive: true, sortOrder: 0 }

export default function TestimonialsManager() {
  const { showToast } = useToast()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const fetch = async () => {
    try {
      const res = await apiClient.get('/admin/testimonials')
      setList(res.testimonials || [])
    } catch { showToast('Failed to load testimonials', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const openAdd = () => { setForm(EMPTY); setEditId(null); setShowForm(true) }
  const openEdit = (t) => { setForm({ name: t.name, role: t.role, text: t.text, rating: t.rating ?? 5, isActive: t.isActive, sortOrder: t.sortOrder ?? 0 }); setEditId(t._id); setShowForm(true) }

  const handleSave = async () => {
    if (!form.name || !form.role || !form.text) { showToast('Name, role and review text are required', 'error'); return }
    setSaving(true)
    try {
      if (editId) {
        await apiClient.put(`/admin/testimonials/${editId}`, form)
        showToast('Testimonial updated', 'success')
      } else {
        await apiClient.post('/admin/testimonials', form)
        showToast('Testimonial added', 'success')
      }
      setShowForm(false)
      fetch()
    } catch (e) { showToast(e?.message || 'Failed to save', 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this testimonial?')) return
    try {
      await apiClient.delete(`/admin/testimonials/${id}`)
      showToast('Deleted', 'success')
      fetch()
    } catch { showToast('Failed to delete', 'error') }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>Client Testimonials</h3>
        <button className="btn btn-primary btn-sm" onClick={openAdd}><Plus size={14} /> Add Testimonial</button>
      </div>

      {showForm && (
        <div className="glass" style={{ padding: 24, borderRadius: 20, marginBottom: 20 }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
            <span style={{ fontWeight: 600 }}>{editId ? 'Edit' : 'Add'} Testimonial</span>
            <button onClick={() => setShowForm(false)}><X size={16} /></button>
          </div>
          <div className="flex flex-col gap-12">
            <input className="input-field" placeholder="Client Name (e.g. JULIAN MARKS)" value={form.name} onChange={e => set('name', e.target.value)} />
            <input className="input-field" placeholder="Role / Title (e.g. PORSCHE COLLECTOR)" value={form.role} onChange={e => set('role', e.target.value)} />
            <textarea className="input-field" rows={3} placeholder="Review text..." style={{ resize: 'none' }} value={form.text} onChange={e => set('text', e.target.value)} />
            <div className="flex items-center gap-16">
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>STAR RATING</label>
                <div className="flex gap-6">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => set('rating', s)}>
                      <Star size={20} fill={s <= form.rating ? 'var(--text-accent)' : 'none'} stroke="var(--text-accent)" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>SORT ORDER</label>
                <input className="input-field" type="number" style={{ width: 80 }} value={form.sortOrder} onChange={e => set('sortOrder', +e.target.value)} />
              </div>
              <div className="flex items-center gap-8" style={{ marginTop: 20 }}>
                <label style={{ fontSize: 13 }}>Active</label>
                <button onClick={() => set('isActive', !form.isActive)} style={{ width: 40, height: 22, borderRadius: 11, background: form.isActive ? 'var(--accent-lime)' : 'var(--border-glass)', position: 'relative', padding: 2 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 9, background: form.isActive ? '#0A0A0A' : 'var(--text-tertiary)', transform: form.isActive ? 'translateX(18px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
                </button>
              </div>
            </div>
            <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {editId ? 'Update' : 'Save'} Testimonial
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center" style={{ padding: 40 }}><Loader2 className="animate-spin" /></div>
      ) : list.length === 0 ? (
        <div className="text-center text-secondary" style={{ padding: 40 }}>No testimonials yet. Add your first one above.</div>
      ) : (
        <div className="flex flex-col gap-12">
          {list.map(t => (
            <div key={t._id} className="glass" style={{ padding: 16, borderRadius: 16, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</span>
                  <span className="chip chip-ghost" style={{ fontSize: 10 }}>{t.role}</span>
                  {!t.isActive && <span className="chip" style={{ fontSize: 10, background: 'rgba(255,80,80,0.1)', color: '#ff5555' }}>INACTIVE</span>}
                </div>
                <div className="flex gap-2" style={{ marginBottom: 6 }}>
                  {Array.from({ length: t.rating ?? 5 }).map((_, i) => <Star key={i} size={12} fill="var(--text-accent)" stroke="none" />)}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{t.text}</p>
              </div>
              <div className="flex gap-8">
                <button className="btn btn-glass btn-sm" onClick={() => openEdit(t)}><Pencil size={13} /></button>
                <button className="btn btn-sm" style={{ background: 'rgba(255,80,80,0.1)', color: '#ff5555' }} onClick={() => handleDelete(t._id)}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
