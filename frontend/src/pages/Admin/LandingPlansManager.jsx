import { useState, useEffect } from 'react'
import { Search, Loader2, Check, ToggleLeft, ToggleRight, PackageOpen } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useToast } from '../../context/ToastContext'

export default function LandingPlansManager() {
  const { showToast } = useToast()
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [togglingId, setTogglingId] = useState(null)

  const fetchPackages = async () => {
    try {
      const res = await apiClient.get('/admin/packages')
      setPackages(res.packages || [])
    } catch (err) {
      showToast('Failed to load subscription plans', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPackages()
  }, [])

  const handleToggleLandingVisibility = async (pkg) => {
    setTogglingId(pkg._id)
    try {
      const updatedValue = !pkg.showOnLanding
      const payload = {
        ...pkg,
        showOnLanding: updatedValue
      }
      
      // Update via PUT request
      await apiClient.put(`/admin/packages/${pkg._id}`, payload)
      
      // Sync local state
      setPackages(prev => prev.map(p => p._id === pkg._id ? { ...p, showOnLanding: updatedValue } : p))
      showToast(updatedValue ? 'Plan will be shown on Landing page' : 'Plan hidden from Landing page', 'success')
    } catch (err) {
      showToast(err?.message || 'Failed to update plan landing visibility.', 'error')
    } finally {
      setTogglingId(null)
    }
  }

  const filteredPackages = packages.filter(pkg => {
    const term = searchTerm.toLowerCase()
    return (
      pkg.name.toLowerCase().includes(term) ||
      (pkg.tier || 'BASIC').toLowerCase().includes(term)
    )
  })

  // Grouped counts for stats banner
  const totalCount = packages.length
  const featuredCount = packages.filter(p => p.showOnLanding && p.isActive).length
  const hiddenCount = packages.filter(p => !p.showOnLanding && p.isActive).length

  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: 20 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>Landing Page Plans Selector</h3>
          <p className="text-secondary" style={{ fontSize: 13, marginTop: 4 }}>
            Control which active subscription packages are displayed on the public landing page. Recommended to select 3-6 plans.
          </p>
        </div>
        
        {/* Search bar */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 280 }}>
          <Search size={14} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
          <input
            className="input-field"
            placeholder="Filter plans..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: 40, height: 40, fontSize: 13, borderRadius: 12 }}
          />
        </div>
      </div>

      {/* Stats Summary Banner */}
      <div className="grid-3" style={{ gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Available Packages', val: totalCount, color: 'var(--text-secondary)' },
          { label: 'Featured on Landing Page', val: featuredCount, color: 'var(--accent-lime)' },
          { label: 'Hidden from Landing Page', val: hiddenCount, color: 'var(--text-muted)' }
        ].map((stat, idx) => (
          <div key={idx} className="glass" style={{ padding: '16px 20px', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</span>
            <span style={{ fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.val}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center" style={{ padding: 48 }}>
          <Loader2 className="animate-spin" style={{ color: 'var(--accent-lime)' }} />
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center gap-12" style={{ padding: 48, borderRadius: 20, textAlign: 'center' }}>
          <PackageOpen size={36} style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-secondary" style={{ fontSize: 14 }}>
            {searchTerm ? 'No plans match your search query.' : 'No service packages configured yet. Create some in the Packages tab first.'}
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          {filteredPackages.map((pkg) => {
            const isToggling = togglingId === pkg._id
            return (
              <div
                key={pkg._id}
                className="glass"
                style={{
                  padding: '20px 24px',
                  borderRadius: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 20,
                  opacity: pkg.isActive ? 1 : 0.5,
                  border: pkg.showOnLanding && pkg.isActive ? '1px solid rgba(223, 255, 0, 0.15)' : '1px solid var(--border-glass)',
                  background: pkg.showOnLanding && pkg.isActive ? 'rgba(223, 255, 0, 0.01)' : 'rgba(255,255,255,0.01)'
                }}
              >
                {/* Package Basic info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span className="chip chip-ghost" style={{ fontSize: 10, background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 8 }}>{pkg.tier}</span>
                    {!pkg.isActive && <span className="chip" style={{ fontSize: 10, background: 'rgba(255,80,80,0.1)', color: '#ff5555' }}>INACTIVE</span>}
                    {pkg.popular && <span className="chip chip-lime" style={{ fontSize: 10 }}>POPULAR</span>}
                  </div>
                  
                  <span style={{ fontWeight: 700, fontSize: 15, display: 'block', color: 'var(--text-primary)' }}>{pkg.name}</span>
                  
                  {/* Model Mapping preview */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {pkg.applicableModels && pkg.applicableModels.length > 0 ? (
                      pkg.applicableModels.map((app, idx) => (
                        <span key={idx} style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                          • {app.brand} ({app.models && app.models.length > 0 ? app.models.join(', ') : 'All models'})
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>No model mapping</span>
                    )}
                  </div>
                </div>

                {/* Price Display */}
                <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 100 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>₹{pkg.price}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block' }}>/ month</span>
                </div>

                {/* Toggle Action */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: pkg.showOnLanding ? 'var(--accent-lime)' : 'var(--text-muted)' }}>
                    {pkg.showOnLanding ? 'Show on Landing' : 'Hidden'}
                  </span>
                  <button
                    disabled={isToggling || !pkg.isActive}
                    onClick={() => handleToggleLandingVisibility(pkg)}
                    style={{
                      color: pkg.showOnLanding && pkg.isActive ? 'var(--accent-lime)' : 'var(--text-tertiary)',
                      cursor: isToggling || !pkg.isActive ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {isToggling ? (
                      <Loader2 size={24} className="animate-spin" />
                    ) : pkg.showOnLanding && pkg.isActive ? (
                      <ToggleRight size={28} />
                    ) : (
                      <ToggleLeft size={28} />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
