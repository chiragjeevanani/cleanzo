import { Link } from 'react-router-dom'
import { Smartphone, Calendar, FastForward, BarChart3 } from 'lucide-react'
import './AppDownloadSection.css'

export default function AppDownloadSection() {
  return (
    <section className="landing-section app-section" id="app">
      <div className="container">
        <div className="app-content reveal">
          <div className="app-text">
            <span className="section-label">GET THE APP</span>
            <h2 className="section-title-premium" style={{ textAlign: 'left', marginBottom: '24px' }}>
              MANAGE EVERYTHING<br />FROM YOUR PHONE.
            </h2>
            <p className="app-description">
              Track your daily doorstep cleaning, skip days when you are away, and manage your prepaid subscription — all from the Cleanzo app.
            </p>
            
            <div className="app-badges">
              <Link to="/" className="app-badge">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                <div>
                  <div style={{ fontSize: 10, opacity: 0.6 }}>Download on the</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>App Store</div>
                </div>
              </Link>
              <Link to="/" className="app-badge">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M3.18 23.54c-.36-.17-.63-.48-.72-.87L13.4 12 2.46 1.33c.09-.39.36-.7.72-.87l12.35 11.54-12.35 11.54zm.96.46l10.55-9.85L17.54 17l-13.04 7.25c-.13.02-.25.02-.36-.25zm0-24l13.4 7.25-2.85 2.85L4.14 0c.11-.03.22-.03.36.0h-.36zM21.56 13.13L18.46 11.5l3.1-1.63c.59.34.94.96.94 1.63 0 .67-.35 1.29-.94 1.63z"/></svg>
                <div>
                  <div style={{ fontSize: 10, opacity: 0.6 }}>Get it on</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Google Play</div>
                </div>
              </Link>
            </div>
          </div>

          <div className="app-phone-wrap">
            <div className="app-phone">
              <div className="app-phone-notch" />
              <div className="app-phone-screen">
                <div className="app-screen-header">
                  <span className="app-brand">Cleanzo</span>
                  <div className="app-status-icon">
                    <Smartphone size={16} />
                  </div>
                </div>

                <div className="app-screen-body">
                  <div className="app-card-glass active-plan-card">
                    <span className="card-label">ACTIVE PLAN</span>
                    <h3 className="card-plan-name">Premium Exterior</h3>
                    <div className="app-progress-bar">
                      <div className="app-progress-fill" style={{ width: '65%' }} />
                    </div>
                    <span className="card-status">Day 19 of 30</span>
                  </div>

                  <div className="app-actions-grid">
                    <div className="app-action-card">
                      <div className="action-icon-wrap">
                        <Calendar size={20} />
                      </div>
                      <span className="action-label">Book</span>
                    </div>
                    <div className="app-action-card">
                      <div className="action-icon-wrap">
                        <FastForward size={20} />
                      </div>
                      <span className="action-label">Skip</span>
                    </div>
                    <div className="app-action-card">
                      <div className="action-icon-wrap">
                        <BarChart3 size={20} />
                      </div>
                      <span className="action-label">History</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
