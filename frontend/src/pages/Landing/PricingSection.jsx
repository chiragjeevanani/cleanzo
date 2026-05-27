import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { mockPackages } from '../../data/mockData'
import './PricingSection.css'

export default function PricingSection() {
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [trialPrice, setTrialPrice] = useState(null)

  useEffect(() => {
    let active = true;

    // Fetch packages and public settings in parallel
    Promise.all([
      apiClient.get('/public/packages'),
      apiClient.get('/public/settings'),
    ])
      .then(([pkgRes, settingsRes]) => {
        if (!active) return;
        if (pkgRes.success && pkgRes.packages && pkgRes.packages.length > 0) {
          setPackages(pkgRes.packages)
        } else {
          setPackages(mockPackages)
        }
        if (settingsRes.success) {
          setTrialPrice(settingsRes.trialPrice ?? 30)
        } else {
          setTrialPrice(30)
        }
      })
      .catch(err => {
        console.warn('Failed to fetch pricing data, using defaults:', err)
        if (active) {
          setPackages(mockPackages)
          setTrialPrice(30)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false; }
  }, [])

  return (
    <section className="landing-section pricing-section" id="pricing">
      <div className="container">
        <div className="section-header-premium reveal">
          <span className="section-label">MEMBERSHIP TIERS</span>
          <h2 className="section-title-premium">SUBSCRIPTION<br />PRICING.</h2>
        </div>

        <div className="pricing-grid-premium reveal">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="skeleton-card" style={{ border: '1px solid var(--border-glass)' }}>
                <div className="skeleton" style={{ height: 28, width: '60%', marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 16, width: '80%', marginBottom: 40 }} />
                <div className="skeleton" style={{ height: 64, width: '50%', marginBottom: 40 }} />
                <div className="skeleton" style={{ height: 48, width: '100%', borderRadius: 8, marginBottom: 48 }} />
                <div className="skeleton" style={{ height: 12, width: '30%', marginBottom: 24 }} />
                <div className="skeleton" style={{ height: 16, width: '90%', marginBottom: 16 }} />
                <div className="skeleton" style={{ height: 16, width: '75%', marginBottom: 16 }} />
                <div className="skeleton" style={{ height: 16, width: '85%', marginBottom: 16 }} />
              </div>
            ))
          ) : packages.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', background: 'var(--bg-glass)', borderRadius: '24px', border: '1px dashed var(--border-glass)' }}>
              <p className="text-secondary">No active subscription plans available at the moment. Please check back later.</p>
            </div>
          ) : packages.map((pkg) => (
            <div key={pkg._id || pkg.id} className={`pricing-card-premium ${pkg.popular ? 'featured' : ''}`}>
              {pkg.popular && <div className="popular-tag">MOST REQUESTED</div>}
              
              <div className="card-top">
                <h3 className="tier-name">{pkg.name}</h3>
                <p className="tier-desc" style={{ textTransform: 'capitalize' }}>Tier: {pkg.tier} • For {(pkg.category || 'vehicle').replace('_', ' ')}s</p>
              </div>

              <div className="tier-price">
                <span className="currency">₹</span>
                <span className="amount">{pkg.price}</span>
                <span className="period">/mo</span>
              </div>

              <Link to="/login" className={`btn btn-lg pricing-btn ${pkg.popular ? 'btn-primary' : 'btn-glass'}`}>
                {pkg.popular ? 'GET STARTED' : 'START SUBSCRIPTION'}
              </Link>

              <div className="features-list">
                <span className="features-title">INCLUSIONS</span>
                {pkg.features?.map((feature, idx) => (
                  <div key={idx} className="feature-item">
                    <Check size={14} className="feature-icon" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="pricing-note-container reveal">
          <span className="pricing-note-asterisk">*</span>
          <span>
            Pricing varies by vehicle category. One-day trial available for{' '}
            <strong className="highlight">
              ₹{trialPrice !== null ? trialPrice : '—'}
            </strong>
            . <strong className="highlight">Skip days</strong> extend subscription validity.
          </span>
        </div>
      </div>
    </section>
  )
}
