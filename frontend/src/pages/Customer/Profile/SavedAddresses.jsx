import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, MapPin, Home, Briefcase } from 'lucide-react'

export default function SavedAddresses() {
  const [addresses, setAddresses] = useState([
    { id: 1, type: 'Home', address: '123 Luxury Lane, Beverly Hills, CA', icon: Home, color: 'var(--primary-blue)' },
    { id: 2, type: 'Office', address: 'Suite 400, Tech Tower, Silicon Valley, CA', icon: Briefcase, color: 'var(--accent-lime)' },
  ])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ type: 'Home', address: '' })

  const addAddress = () => {
    if (!form.address) return
    const Icon = form.type === 'Office' ? Briefcase : (form.type === 'Home' ? Home : MapPin)
    setAddresses([...addresses, { id: Date.now(), ...form, icon: Icon, color: 'var(--primary-blue)' }])
    setForm({ type: 'Home', address: '' })
    setAdding(false)
  }

  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <Link to="/customer/profile" className="flex items-center gap-8">
          <ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Saved Addresses</span>
        </Link>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(!adding)}><Plus size={16} /> Add</button>
      </div>

      {adding && (
        <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius)', marginBottom: 100 }}>
          <div className="flex flex-col gap-12">
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Address Type</label>
              <select className="input-field" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ width: '100%' }}>
                <option value="Home">Home</option>
                <option value="Office">Office</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Full Address</label>
              <textarea 
                className="input-field" 
                placeholder="e.g. 123 Main St, Apt 4B..." 
                value={form.address} 
                onChange={e => setForm({ ...form, address: e.target.value })} 
                style={{ width: '100%', minHeight: 80, resize: 'none' }}
              />
            </div>
            <button className="btn btn-blue w-full" onClick={addAddress}>Save Address</button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-8" style={{ paddingBottom: 100 }}>
        {addresses.map(a => (
          <div key={a.id} className="glass" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius)', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-glass)' }}>
              <a.icon size={20} style={{ color: a.color }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{a.type}</div>
              <div className="text-body-sm text-secondary" style={{ marginTop: 2 }}>{a.address}</div>
            </div>
            <button onClick={() => setAddresses(addresses.filter(x => x.id !== a.id))} style={{ color: 'var(--error)', padding: 8 }}>
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
