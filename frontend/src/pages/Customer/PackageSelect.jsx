import { Link } from 'react-router-dom'
import { ArrowLeft, Check, ArrowRight } from 'lucide-react'
import { mockPackages } from '../../data/mockData'

export default function PackageSelect() {
  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <Link to="/customer" className="flex items-center gap-8"><ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Choose Package</span></Link>
      </div>
      <div className="flex flex-col gap-12" style={{ paddingBottom: 100 }}>
        {mockPackages.map(pkg => (
          <div key={pkg.id} className={`glass ${pkg.popular ? '' : ''}`} style={{ padding: 24, borderColor: pkg.popular ? 'rgba(223,255,0,0.2)' : undefined, boxShadow: pkg.popular ? 'var(--shadow-glow-lime)' : undefined }}>
            {pkg.popular && <div className="chip chip-lime" style={{ marginBottom: 12 }}>Most Popular</div>}
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{pkg.name}</div>
            <div className="flex items-center gap-4" style={{ marginBottom: 16 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800 }}>₹{pkg.price}</span>
              <span className="text-body-sm text-secondary">/month</span>
            </div>
            <div className="flex flex-col gap-8" style={{ marginBottom: 20 }}>
              {pkg.features.map((f, i) => (
                <div key={i} className="flex items-center gap-8 text-body-sm">
                  <Check size={14} style={{ color: pkg.popular ? 'var(--accent-lime)' : 'var(--primary-blue)', flexShrink: 0 }} />
                  <span className="text-secondary">{f}</span>
                </div>
              ))}
            </div>
            <Link to="/customer/booking" className={`btn ${pkg.popular ? 'btn-primary' : 'btn-ghost'} w-full`}>
              Select <ArrowRight size={16} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
