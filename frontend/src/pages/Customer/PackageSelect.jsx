import { Link } from 'react-router-dom'
import { ArrowLeft, Check, ArrowRight, ChevronRight } from 'lucide-react'
import { mockPackages, mockSubscription } from '../../data/mockData'

export default function PackageSelect() {
  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <Link to="/customer" className="flex items-center gap-8"><ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Subscription Plans</span></Link>
      </div>

      <div className="flex flex-col gap-12" style={{ paddingBottom: 100 }}>
        {mockSubscription && (
          <Link to="/customer/subscriptions" className="glass" style={{ padding: 20, border: '1px solid var(--accent-lime)', background: 'rgba(var(--accent-lime-rgb), 0.05)' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
              <span className="text-label text-lime">Active Subscription</span>
              <ChevronRight size={16} className="text-lime" />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>{mockSubscription.package.name}</div>
            <div className="text-body-sm text-secondary" style={{ marginTop: 4 }}>Renews on {mockSubscription.endDate}</div>
          </Link>
        )}

        <div style={{ marginTop: 8, marginBottom: 4 }}>
          <h3 className="text-label text-secondary">All Available Plans</h3>
        </div>
        {mockPackages.map(pkg => (
          <Link key={pkg.id} to={`/customer/plan/${pkg.id}`} className="glass" style={{ padding: 20, display: 'block' }}>
            {pkg.popular && <div className="chip chip-lime" style={{ marginBottom: 12 }}>Most Popular</div>}
            <div className="flex justify-between items-start" style={{ marginBottom: 12 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>{pkg.name}</div>
                <div className="chip chip-ghost" style={{ marginTop: 4, fontSize: 10 }}>{pkg.tier}</div>
              </div>
              <div className="flex flex-col items-end">
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--accent-lime)' }}>₹{pkg.price}</div>
                <div className="text-body-sm text-secondary">/month</div>
              </div>
            </div>
            
            <div className="flex flex-col gap-6" style={{ marginBottom: 16 }}>
              {pkg.features.slice(0, 3).map((f, i) => (
                <div key={i} className="flex items-center gap-8 text-body-sm">
                  <Check size={14} className="text-lime" />
                  <span className="text-secondary">{f}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-body-sm" style={{ borderTop: '1px solid var(--divider)', paddingTop: 12 }}>
              <span className="text-blue" style={{ fontWeight: 600 }}>View Details</span>
              <ChevronRight size={16} className="text-secondary" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
