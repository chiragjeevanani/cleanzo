import { MapPin, Phone, Mail, ArrowRight } from 'lucide-react'
import './ContactSection.css'

export default function ContactSection() {
  return (
    <section className="landing-section contact-section" id="contact">
      <div className="container">
        <div className="contact-grid reveal">
          <div className="contact-form-side">
            <h2 className="section-title-premium">RESERVE YOUR<br />SLOT.</h2>
            <p className="contact-intro">Cleanzo operates on a subscription basis in selected residential societies. Secure your vehicle's daily care today and wake up to a clean car every morning.</p>

            <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
              <div className="form-row">
                <div className="form-group">
                  <label>VEHICLE MAKE / MODEL</label>
                  <input type="text" placeholder="e.g. Porsche 911 GT3" className="input-field" />
                </div>
                <div className="form-group">
                  <label>SERVICE PROTOCOL</label>
                  <select className="input-field">
                    <option>Level 3 Leather Treatment</option>
                    <option>Level 4 Detail</option>
                    <option>Full Restoration</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>SECURE EMAIL / PHONE</label>
                <input type="text" placeholder="contact@example.com" className="input-field" />
              </div>

              <button className="btn btn-primary btn-lg" style={{ marginTop: '24px', width: 'fit-content' }}>
                TRANSMIT REQUEST <ArrowRight size={18} />
              </button>
            </form>
          </div>

          <div className="contact-info-side">
            <div className="contact-info-card glass">
              <h3 className="info-title">CONTACT ANALYTICS</h3>
              <div className="info-items">
                <div className="info-item">
                  <MapPin size={18} color="var(--primary-blue)" />
                  <p>128 LUXURY WAY, SUITE 400<br />SILICON VALLEY, CA</p>
                </div>
                <div className="info-item">
                  <Phone size={18} color="var(--primary-blue)" />
                  <p>+1 (888) 000-CLEAN</p>
                </div>
                <div className="info-item">
                  <Mail size={18} color="var(--primary-blue)" />
                  <p>HQ@CLEANZO.PRO</p>
                </div>
              </div>

              <div className="contact-map-placeholder">
                {/* Visual representing a technical map or scan */}
                <div className="map-grid-overlay" />
                <img src="https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop" alt="Location" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
