import { useState } from 'react'
import { Edit2, ToggleLeft, ToggleRight } from 'lucide-react'
import { mockPackages } from '../../data/mockData'

export default function AdminPackages() {
  const [packages, setPackages] = useState(mockPackages.map(p => ({ ...p, active: true })))

  const toggle = (id) => setPackages(packages.map(p => p.id === id ? { ...p, active: !p.active } : p))

  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>Packages</h1>
        <button className="btn btn-primary btn-sm">+ New Package</button>
      </div>
      <div className="grid-3" style={{ gap: 16 }}>
        {packages.map(pkg => (
          <div key={pkg.id} className="glass" style={{ padding: 24, opacity: pkg.active ? 1 : 0.5 }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
              <span className="text-label" style={{ color: pkg.popular ? 'var(--accent-lime)' : 'var(--text-secondary)' }}>{pkg.tier}</span>
              <button onClick={() => toggle(pkg.id)} style={{ color: pkg.active ? 'var(--success)' : 'var(--text-tertiary)' }}>
                {pkg.active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
              </button>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{pkg.name}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, marginBottom: 16 }}>
              ₹{pkg.price}<span className="text-body-sm text-secondary">/mo</span>
            </div>
            <div className="flex flex-col gap-8" style={{ marginBottom: 20 }}>
              {pkg.features.map((f, i) => (
                <div key={i} className="text-body-sm text-secondary">• {f}</div>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm w-full"><Edit2 size={14} /> Edit Package</button>
          </div>
        ))}
      </div>
    </div>
  )
}
