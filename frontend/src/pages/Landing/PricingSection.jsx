import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { mockPackages } from '../../data/mockData'
import './PricingSection.css'

export default function PricingSection() {
  return (
    <section className="landing-section pricing-section" id="pricing">
      <div className="container">
        <div className="section-header reveal">
          <h2 className="text-headline-lg">Daily Care for Daily Drives</h2>
          <p className="text-body-lg text-secondary" style={{ maxWidth: 480, margin: '8px auto 0' }}>
            Choose a prepaid daily doorstep exterior cleaning plan. Add-on interior deep cleaning anytime. 365 days, no leaves.
          </p>
        </div>

        <div className="pricing-grid-minimal reveal">
          {mockPackages.map((pkg, i) => (
            <div key={pkg.id} className={`pricing-card-minimal ${pkg.popular ? 'pricing-featured-minimal' : ''}`}>
              <div className="pricing-header-minimal">
                <div className="pricing-tier-row">
                  <h3 className="pricing-tier-name">{pkg.name}</h3>
                  {pkg.popular && <span className="pricing-popular-badge">Popular</span>}
                </div>
                <p className="pricing-desc-minimal text-secondary text-body-sm">
                  {pkg.id === 1 ? 'Daily doorstep exterior cleaning' : pkg.id === 2 ? 'Exterior care + paint protection' : 'Complete care with weekly interior cleaning'}
                </p>
              </div>

              <div className="pricing-price-minimal">
                <span className="pricing-currency">₹</span>
                <span className="pricing-amount">{pkg.price}</span>
              </div>
              <div className="pricing-period-minimal text-secondary text-body-sm">per month</div>

              <Link to="/customer" className={`btn w-full pricing-btn-minimal ${pkg.popular ? 'btn-primary' : 'btn-ghost'}`}>
                Get Started
              </Link>

              <ul className="pricing-features-minimal">
                {pkg.features.map((f, j) => (
                  <li key={j} className="pricing-feature-minimal">
                    <Check size={16} strokeWidth={3} className="pricing-check-icon" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
