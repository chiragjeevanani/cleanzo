import { Link } from 'react-router-dom'
import { Share2, Globe } from 'lucide-react'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <h2 className="footer-logo-text">CLEANZO</h2>
            <p className="text-body-sm text-secondary" style={{ maxWidth: 320, marginTop: 16 }}>
              The global benchmark in technical automotive interior restoration and high-performance protection systems.
            </p>
            <div className="footer-social-premium" style={{ marginTop: 24, display: 'flex', gap: 24 }}>
              <Share2 size={18} color="var(--text-tertiary)" />
              <Globe size={18} color="var(--text-tertiary)" />
            </div>
          </div>

          <div className="footer-links-group">
            <h4 className="text-label" style={{ marginBottom: 24, color: 'var(--primary-blue)' }}>QUICK LINKS</h4>
            <Link to="/" className="footer-link">RESERVE PILOT</Link>
            <Link to="/" className="footer-link">TERMS OF SERVICE</Link>
            <Link to="/" className="footer-link">WARRANTY</Link>
            <Link to="/" className="footer-link">NETWORK STATUS</Link>
          </div>

          <div className="footer-links-group">
            <h4 className="text-label" style={{ marginBottom: 24, color: 'var(--primary-blue)' }}>PORTAL</h4>
            <Link to="/customer" className="footer-link">CLIENT LOGIN</Link>
            <Link to="/admin" className="footer-link">ADMINISTRATIVE HQ</Link>
          </div>
        </div>

        <div className="footer-bottom-premium">
           <span className="text-body-sm text-tertiary">© 2024 CLEANZO ARTIFACT DEVICES INC. ENGINEERED FOR THE ELITE.</span>
        </div>
      </div>
    </footer>
  )
}
