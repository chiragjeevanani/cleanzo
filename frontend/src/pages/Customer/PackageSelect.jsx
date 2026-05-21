import PageLoader from '../../components/PageLoader'
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, ArrowRight, ChevronRight, Car } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useCustomerData } from '../../context/CustomerDataContext'

export default function PackageSelect() {
  const { packages, subscriptions, vehicles, loading: dataLoading } = useCustomerData()
  const navigate = useNavigate()
  const activeSub = (subscriptions || []).find(s => s.status === 'Active') || null

  const [selectedVehicleId, setSelectedVehicleId] = useState(null)

  const loading = dataLoading.packages || dataLoading.subscriptions
  const error = '' // Handled by global context if needed

  useEffect(() => {
    if (vehicles && vehicles.length > 0) {
      const exists = vehicles.some(v => v._id === selectedVehicleId)
      if (!exists) {
        setSelectedVehicleId(vehicles[0]._id)
      }
    } else {
      setSelectedVehicleId(null)
    }
  }, [vehicles, selectedVehicleId])

  if (loading) return (
    <div className="app-shell">
      <div className="app-header" style={{ padding: '16px var(--margin-side)', background: 'transparent' }}>
        <div className="skeleton" style={{ width: 150, height: 24, borderRadius: 8 }} />
      </div>
      <div className="container" style={{ padding: '0 20px' }}>
        <div className="flex flex-col gap-12 mt-12">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass" style={{ padding: 24, borderRadius: 28, marginBottom: 16 }}>
              <div className="flex justify-between items-start mb-20">
                <div>
                  <div className="skeleton" style={{ width: 120, height: 22, borderRadius: 6, marginBottom: 8 }} />
                  <div className="skeleton" style={{ width: 80, height: 12, borderRadius: 4 }} />
                </div>
                <div className="skeleton" style={{ width: 60, height: 24, borderRadius: 8 }} />
              </div>
              <div className="flex flex-col gap-10 mb-24">
                {[1, 2, 3].map(j => (
                  <div key={j} className="flex items-center gap-10">
                    <div className="skeleton" style={{ width: 16, height: 16, borderRadius: 4 }} />
                    <div className="skeleton" style={{ width: 180, height: 12, borderRadius: 4 }} />
                  </div>
                ))}
              </div>
              <div className="skeleton" style={{ height: 52, borderRadius: 18 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
  
  if (error) return <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--error)' }}>{error}</div>

  const selectedVehicle = vehicles?.find(v => v._id === selectedVehicleId) || null

  const isVehicleEligibleForPackage = (vehicle, pkg) => {
    if (!vehicle || !pkg) return false;
    // If the package has no restrictions, it applies to all vehicles.
    if (!pkg.applicableModels || pkg.applicableModels.length === 0) return true;

    const brandConfig = pkg.applicableModels.find(
      app => app.brand.toLowerCase() === vehicle.brand.toLowerCase()
    );
    if (!brandConfig) return false;
    // If the brand is found, check if models array is empty (all models covered) or includes the vehicle's model
    if (!brandConfig.models || brandConfig.models.length === 0) return true;
    return brandConfig.models.some(
      m => m.toLowerCase() === vehicle.model.toLowerCase()
    );
  };

  // Filter packages based on the selected vehicle
  const displayPackages = selectedVehicle
    ? packages.filter(pkg => isVehicleEligibleForPackage(selectedVehicle, pkg))
    : [];

  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-8 bg-transparent border-none text-[color:var(--text-primary)] cursor-pointer p-0">
          <ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Subscription Plans</span>
        </button>
      </div>

      <div className="flex flex-col gap-12" style={{ paddingBottom: 100 }}>
        {activeSub && (
          <Link to="/customer/subscriptions" className="glass" style={{ padding: 20, border: '1px solid var(--bg-accent)', background: 'rgba(var(--bg-accent-rgb), 0.05)' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
              <span className="text-label text-lime">Active Subscription</span>
              <ChevronRight size={16} className="text-lime" />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>{activeSub.package?.name || 'Subscription'}</div>
            <div className="text-body-sm text-secondary" style={{ marginTop: 4 }}>Renews on {new Date(activeSub.endDate).toLocaleDateString()}</div>
          </Link>
        )}

        {/* Vehicle Selection Header & Horizontal List */}
        {vehicles && vehicles.length > 0 && (
          <div style={{ marginTop: 8, marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Select Vehicle
            </div>
            <div 
              style={{ 
                display: 'flex', 
                gap: 12, 
                overflowX: 'auto', 
                paddingBottom: 12,
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch'
              }}
              className="no-scrollbar"
            >
              {vehicles.map(v => {
                const isSelected = v._id === selectedVehicleId;
                return (
                  <button
                    key={v._id}
                    onClick={() => setSelectedVehicleId(v._id)}
                    style={{
                      flex: '0 0 auto',
                      width: 150,
                      padding: '12px 14px',
                      borderRadius: 16,
                      border: isSelected ? '1.5px solid var(--accent-lime)' : '1px solid var(--border-glass)',
                      background: isSelected ? 'rgba(var(--bg-accent-rgb), 0.08)' : 'var(--bg-glass)',
                      boxShadow: isSelected ? 'var(--shadow-glow-lime)' : 'var(--shadow-sm)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <Car size={16} className={isSelected ? 'text-lime' : 'text-secondary'} />
                      {isSelected && (
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--accent-lime)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={10} color="black" strokeWidth={4} />
                        </div>
                      )}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, marginTop: 4, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
                      {v.brand} {v.model}
                    </div>
                    <div className="text-secondary" style={{ fontSize: 10, letterSpacing: '0.3px' }}>
                      {v.number}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: 4, marginBottom: 8 }}>
          <h3 className="text-label text-secondary">
            {(!vehicles || vehicles.length === 0) 
              ? 'No vehicles available' 
              : displayPackages.length > 0 
                ? `Plans compatible with ${selectedVehicle?.brand} ${selectedVehicle?.model}` 
                : 'No compatible plans available'
            }
          </h3>
        </div>
        
        {(!vehicles || vehicles.length === 0) && (
          <div className="glass flex flex-col items-center justify-center gap-12" style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Car size={28} className="text-secondary" />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Add a Vehicle</div>
              <p className="text-body-sm text-secondary">Please add a vehicle to your garage to see available subscription plans.</p>
            </div>
            <Link to="/customer/profile" className="btn btn-primary mt-8">Go to Profile</Link>
          </div>
        )}

        {vehicles && vehicles.length > 0 && displayPackages.length === 0 && (
          <div className="glass flex flex-col items-center justify-center gap-12" style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Car size={28} className="text-secondary" />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No Compatible Plans</div>
              <p className="text-body-sm text-secondary">There are no active packages matching your selected vehicle ({selectedVehicle?.brand} {selectedVehicle?.model}).</p>
            </div>
          </div>
        )}

        {displayPackages.map(pkg => {
          const isElite = pkg.name.toLowerCase() === 'elite';
          
          return (
            <Link 
              key={pkg._id} 
              to={`/customer/plan/${pkg._id}?vehicleId=${selectedVehicleId}`} 
              className="glass animate-fade-in"
              style={{ 
                padding: 24, 
                display: 'block', 
                marginBottom: 16,
                border: isElite ? '1px solid var(--bg-accent)' : '1px solid var(--border-glass)',
                boxShadow: isElite ? 'var(--shadow-glow-lime)' : 'var(--shadow-sm)'
              }}
            >
              <div className="flex justify-between items-start" style={{ marginBottom: 20 }}>
                <div>
                  <div className="flex items-center gap-8 mb-4">
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>{pkg.name}</h2>
                    {pkg.popular && <span className="chip chip-lime" style={{ fontSize: 9 }}>Popular</span>}
                  </div>
                  <div className="text-label text-tertiary" style={{ fontSize: 10 }}>{pkg.tier || 'Standard'} Tier</div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-accent)' }}>₹{pkg.price}</div>
                  <div className="text-body-sm text-secondary">/month</div>
                </div>
              </div>

              <div className="flex flex-col gap-10" style={{ marginBottom: 24 }}>
                {pkg.features.slice(0, 4).map((f, i) => (
                  <div key={i} className="flex items-center gap-10 text-body-sm">
                    <Check size={16} className="text-lime" strokeWidth={3} />
                    <span className="text-secondary">{f}</span>
                  </div>
                ))}
              </div>

              <div className="btn btn-primary w-full py-16 rounded-2xl shadow-lg shadow-primary/10">
                Get Started with {pkg.name}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  )
}
