import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Car } from 'lucide-react'
import { mockUser } from '../../data/mockData'

export default function VehicleManager() {
  const [vehicles, setVehicles] = useState(mockUser.vehicles)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ model: '', number: '', parking: '' })

  const addVehicle = () => {
    if (!form.model || !form.number) return
    setVehicles([...vehicles, { id: Date.now(), ...form, color: 'var(--primary-blue)' }])
    setForm({ model: '', number: '', parking: '' })
    setAdding(false)
  }

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
        {vehicles.map(v => (
          <div key={v.id} className="glass" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius)', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-glass)' }}>
              <Car size={22} style={{ color: v.color }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{v.model}</div>
              <div className="text-body-sm text-secondary">{v.number} · {v.parking}</div>
            </div>
            <button onClick={() => setVehicles(vehicles.filter(x => x.id !== v.id))} style={{ color: 'var(--error)', padding: 8 }}>
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
