import { Droplets, Wind, Shield, Sparkles, ArrowRight } from 'lucide-react'
import './ServicesSection.css'

export default function ServicesSection() {
  return (
    <section className="landing-section services-section" id="services">
      <div className="container">
        <div className="section-header-premium reveal">
          <span className="section-label">SERVICE CATEGORIES</span>
          <h2 className="section-title-premium">SUBSCRIPTION PLANS.</h2>
        </div>

        <div className="services-grid-premium">
          {/* Basic Plan - Large */}
          <div className="service-card-premium service-card-large reveal">
            <div className="service-card-bg" style={{ backgroundImage: 'url("/image3.png")' }} />
            <div className="service-card-overlay" />
            <div className="service-card-content">
              <h3 className="service-card-title">BASIC<br />PLAN</h3>
              <p className="service-card-desc">Entry-level daily exterior cleaning using microfiber technology. Included: Exterior body, roof, and mirror cleaning.</p>
              <button className="service-card-link" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>CHOOSE PLAN <ArrowRight size={16} /></button>
            </div>
            <div className="service-card-badge">FROM ₹399/MO</div>
          </div>

          {/* Standard Plan - Small */}
          <div className="service-card-premium service-card-small reveal">
            <div className="service-card-content">
              <div className="service-card-icon">
                <Shield size={24} color="var(--primary-blue)" />
              </div>
              <h3 className="service-card-title">STANDARD<br />PLAN</h3>
              <p className="service-card-desc">Enhanced exterior maintenance with tire surface and number plate cleaning.</p>
              <ul className="service-card-list">
                <li>TIRE SURFACE CARE</li>
                <li>MIRROR POLISHING</li>
              </ul>
            </div>
          </div>

          {/* Premium Plan - Small */}
          <div className="service-card-premium service-card-small reveal">
            <div className="service-card-content">
              <div className="service-card-icon">
                <Sparkles size={24} color="var(--primary-blue)" />
              </div>
              <h3 className="service-card-title">PREMIUM<br />PLAN</h3>
              <p className="service-card-desc">Advanced premium exterior care. Complete surface protection and detailing.</p>
              <ul className="service-card-list">
                <li>BONNET SURFACE CARE</li>
                <li>FULL BODY GLOSS</li>
              </ul>
            </div>
          </div>

          {/* Microfiber Method - Large */}
          <div className="service-card-premium service-card-large reveal">
             <div className="service-card-bg" style={{ backgroundImage: 'url("/image1.png")', backgroundPosition: 'center' }} />
            <div className="service-card-overlay" />
            <div className="service-card-content">
              <h3 className="service-card-title">MICROFIBER<br />METHOD</h3>
              <p className="service-card-desc">Water-efficient spray cleaning. We strictly exclude pressure washing and foam washing to protect your vehicle's finish.</p>
              <button className="service-card-link">OUR PROTOCOL <ArrowRight size={16} /></button>
            </div>
            <div className="service-card-tag">WATER-EFFICIENT</div>
          </div>
        </div>
      </div>
    </section>
  )
}
