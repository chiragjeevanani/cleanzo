import { useState, useEffect } from 'react'
import { Edit2, ToggleLeft, ToggleRight } from 'lucide-react'
import apiClient from '../../services/apiClient'

export default function AdminPackages() {
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await apiClient.get('/admin/packages')
        setPackages(res.packages || [])
      } catch (err) {
        console.error('Error fetching packages:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPackages()
  }, [])

  if (loading) return <div className="loader-overlay"><div className="loader"></div></div>

  const toggle = async (id, isActive) => {
    try {
      await apiClient.put(`/admin/packages/${id}`, { isActive: !isActive })
      setPackages(packages.map(p => p._id === id ? { ...p, isActive: !isActive } : p))
    } catch (err) {
      console.error('Error toggling package', err)
      alert('Failed to update package status')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>Packages</h1>
        <button className="btn btn-primary btn-sm">+ New Package</button>
      </div>
      <div className="grid-3" style={{ gap: 16 }}>
        {packages.length === 0 ? (
          <div className="text-secondary py-4">No packages found.</div>
        ) : packages.map(pkg => (
          <div key={pkg._id} className="glass" style={{ padding: 24, opacity: pkg.isActive ? 1 : 0.5 }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
              <span className="text-label" style={{ color: pkg.isPopular ? 'var(--accent-lime)' : 'var(--text-secondary)' }}>{pkg.tier || 'STANDARD'}</span>
              <button onClick={() => toggle(pkg._id, pkg.isActive)} style={{ color: pkg.isActive ? 'var(--success)' : 'var(--text-tertiary)' }}>
                {pkg.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
              </button>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{pkg.name}</div>
            <div className="flex gap-4 mb-16">
               <span className="chip chip-ghost" style={{ fontSize: 10, textTransform: 'uppercase' }}>{pkg.category}</span>
               {pkg.popular && <span className="chip chip-lime" style={{ fontSize: 10 }}>POPULAR</span>}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, marginBottom: 16 }}>
              ₹{pkg.price}<span className="text-body-sm text-secondary">/mo</span>
            </div>
            <div className="flex flex-col gap-8" style={{ marginBottom: 20 }}>
              {(pkg.features || []).map((f, i) => (
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
