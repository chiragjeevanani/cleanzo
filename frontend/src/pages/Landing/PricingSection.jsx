import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Check, Loader2 } from 'lucide-react'
import apiClient from '../../services/apiClient'
import './PricingSection.css'

export default function PricingSection() {
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/public/packages')
      .then(res => {
        if (res.success) setPackages(res.packages)
      })
      .catch(err => console.error('Failed to fetch packages:', err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="landing-section pricing-section" id="pricing">
      <div className="container">
        <div className="section-header-premium reveal">
          <span className="section-label">MEMBERSHIP TIERS</span>
          <h2 className="section-title-premium">SUBSCRIPTION<br />PRICING.</h2>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
            <Loader2 className="animate-spin" size={48} color="var(--accent-lime)" />
          </div>
        ) : (
            <div className="pricing-grid-premium reveal">
              {packages.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', background: 'var(--bg-glass)', borderRadius: '24px', border: '1px dashed var(--border-glass)' }}>
                  <p className="text-secondary">No active subscription plans available at the moment. Please check back later.</p>
                </div>
              ) : packages.map((pkg) => (
                <div key={pkg._id} className={`pricing-card-premium ${pkg.popular ? 'featured' : ''}`}>
                  {pkg.popular && <div className="popular-tag">MOST REQUESTED</div>}
                  
                  <div className="card-top">
                    <h3 className="tier-name">{pkg.name}</h3>
                    <p className="tier-desc" style={{ textTransform: 'capitalize' }}>Tier: {pkg.tier} • For {pkg.category.replace('_', ' ')}s</p>
                  </div>
  
                  <div className="tier-price">
                    <span className="currency">₹</span>
                    <span className="amount">{pkg.price}</span>
                    <span className="period">/mo</span>
                  </div>
  
                  <Link to="/login" className={`btn btn-lg pricing-btn ${pkg.popular ? 'btn-primary' : 'btn-glass'}`}>
                    {pkg.popular ? 'START ₹30 TRIAL' : 'START SUBSCRIPTION'}
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
        )}
        
        <div className="pricing-note reveal" style={{ marginTop: '40px', textAlign: 'center', opacity: 0.6, fontSize: '12px' }}>
          *Pricing varies by vehicle category. One-day trial available for ₹30. Skip days extend subscription validity.
        </div>
      </div>
    </section>
  )
}
