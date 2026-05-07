import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Car } from 'lucide-react'
import apiClient from '../../services/apiClient'

export default function VehicleManager() {
  const [vehicles, setVehicles] = useState([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ model: '', number: '', parking: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVehicles()
  }, [])

  const fetchVehicles = async () => {
    try {
      const res = await apiClient.get('/customer/vehicles')
      setVehicles(res.vehicles || [])
    } catch (err) {
      console.error('Failed to fetch vehicles', err)
    } finally {
      setLoading(false)
    }
  }

  const addVehicle = async () => {
    if (!form.model || !form.number) return
    try {
      await apiClient.post('/customer/vehicles', { ...form, type: 'sedan', color: '#007AFF' })
      setForm({ model: '', number: '', parking: '' })
      setAdding(false)
      fetchVehicles()
    } catch (err) {
      console.error('Failed to add vehicle', err)
    }
  }

  const deleteVehicle = async (id) => {
    try {
      await apiClient.delete(`/customer/vehicles/${id}`)
      fetchVehicles()
    } catch (err) {
      console.error('Failed to delete vehicle', err)
    }
  }

  if (loading) return <div className="loader-overlay"><div className="loader"></div></div>

  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <Link to="/customer" className="flex items-center gap-8"><ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>My Vehicles</span></Link>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(!adding)}><Plus size={16} /> Add</button>
      </div>

      {adding && (
        <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
          <div className="flex flex-col gap-12">
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Car Model</label>
              <input className="input-field" placeholder="e.g. BMW 3 Series" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
            </div>
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Number Plate</label>
              <input className="input-field" placeholder="e.g. MH 02 AB 1234" value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} />
            </div>
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Parking Location</label>
              <input className="input-field" placeholder="e.g. Tower A, Slot 42" value={form.parking} onChange={e => setForm({ ...form, parking: e.target.value })} />
            </div>
            <button className="btn btn-blue w-full" onClick={addVehicle}>Save Vehicle</button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-8" style={{ paddingBottom: 100 }}>
        {vehicles.length === 0 && !adding && (
          <div className="text-center text-secondary py-8">No vehicles added yet.</div>
        )}
        {vehicles.map(v => (
          <div key={v._id} className="glass" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius)', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-glass)' }}>
              <Car size={22} style={{ color: v.color || 'var(--primary-blue)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{v.model}</div>
              <div className="text-body-sm text-secondary">{v.number} · {v.parking}</div>
            </div>
            <button onClick={() => deleteVehicle(v._id)} style={{ color: 'var(--error)', padding: 8 }}>
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
