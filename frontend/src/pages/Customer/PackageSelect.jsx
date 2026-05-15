import PageLoader from '../../components/PageLoader'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, ArrowRight, ChevronRight } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useCustomerData } from '../../context/CustomerDataContext'

export default function PackageSelect() {
  const { packages, subscriptions, loading: dataLoading } = useCustomerData()
  const activeSub = (subscriptions || []).find(s => s.status === 'Active') || null

  const loading = dataLoading.packages || dataLoading.subscriptions
  const error = '' // Handled by global context if needed

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
  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <Link to="/customer" className="flex items-center gap-8"><ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Subscription Plans</span></Link>
      </div>

      <div className="flex flex-col gap-12" style={{ paddingBottom: 100 }}>
        {activeSub && (
          <Link to="/customer/subscriptions" className="glass" style={{ padding: 20, border: '1px solid var(--accent-lime)', background: 'rgba(var(--accent-lime-rgb), 0.05)' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
              <span className="text-label text-lime">Active Subscription</span>
              <ChevronRight size={16} className="text-lime" />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>{activeSub.package?.name || 'Subscription'}</div>
            <div className="text-body-sm text-secondary" style={{ marginTop: 4 }}>Renews on {new Date(activeSub.endDate).toLocaleDateString()}</div>
          </Link>
        )}

        <div style={{ marginTop: 8, marginBottom: 16 }}>
          <h3 className="text-label text-secondary">All Available Plans</h3>
        </div>
        
        {packages.map(pkg => {
          const isElite = pkg.name.toLowerCase() === 'elite';
          
          return (
            <Link 
              key={pkg._id} 
              to={`/customer/plan/${pkg._id}`} 
              className="glass animate-fade-in"
              style={{ 
                padding: 24, 
                display: 'block', 
                marginBottom: 16,
                border: isElite ? '1px solid var(--accent-lime)' : '1px solid var(--border-glass)',
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
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--accent-lime)' }}>₹{pkg.price}</div>
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
