import { Link } from 'react-router-dom'
import { Check, ArrowRight } from 'lucide-react'
import './PricingSection.css'

const protocols = [
  {
    id: 1,
    name: 'BASIC PLAN',
    price: '399',
    desc: 'Daily doorstep exterior cleaning for small cars and hatchbacks.',
    features: ['Exterior Body Cleaning', 'Roof Cleaning', 'Mirror Cleaning', 'Number Plate Cleaning'],
    popular: false
  },
  {
    id: 2,
    name: 'STANDARD PLAN',
    price: '499',
    desc: 'Daily care + tire polish for sedans and compact SUVs.',
    features: ['All Basic Features', 'Tire Surface Cleaning', 'Microfiber Spray Wash', 'Daily Reliability'],
    popular: true
  },
  {
    id: 3,
    name: 'PREMIUM PLAN',
    price: '899',
    desc: 'Advanced exterior care for premium and luxury vehicles.',
    features: ['All Standard Features', 'Bonnet Surface Care', 'ORVM Cleaning', 'Priority Support'],
    popular: false
  }
]

export default function PricingSection() {
  return (
    <section className="landing-section pricing-section" id="pricing">
      <div className="container">
        <div className="section-header-premium reveal">
          <span className="section-label">MEMBERSHIP TIERS</span>
          <h2 className="section-title-premium">SUBSCRIPTION<br />PRICING.</h2>
        </div>

        <div className="pricing-grid-premium reveal">
          {protocols.map((pkg) => (
            <div key={pkg.id} className={`pricing-card-premium ${pkg.popular ? 'featured' : ''}`}>
              {pkg.popular && <div className="popular-tag">MOST REQUESTED</div>}
              
              <div className="card-top">
                <h3 className="tier-name">{pkg.name}</h3>
                <p className="tier-desc">{pkg.desc}</p>
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
                {pkg.features.map((feature, idx) => (
                  <div key={idx} className="feature-item">
                    <Check size={14} className="feature-icon" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="pricing-note reveal" style={{ marginTop: '40px', textAlign: 'center', opacity: 0.6, fontSize: '12px' }}>
          *Pricing varies by vehicle category. One-day trial available for ₹30. Skip days extend subscription validity.
        </div>
      </div>
    </section>
  )
}
