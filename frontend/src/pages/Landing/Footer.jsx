import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-accent-line" />
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src="/logo.png" alt="Cleanzo" style={{ height: 28 }} />
              <span className="nav-logo-text">Cleanzo</span>
            </div>
            <p className="text-body-sm text-secondary" style={{ maxWidth: 280 }}>
              Premium subscription-based car cleaning. Your car deserves the best, every single day.
            </p>
          </div>
          <div className="footer-links-group">
            <h4 className="text-label" style={{ marginBottom: 16 }}>Company</h4>
            <Link to="/" className="footer-link">About Us</Link>
            <Link to="/join-crew" className="footer-link" style={{ color: 'var(--accent-lime)', fontWeight: 700 }}>Join as Cleaner</Link>
            <Link to="/" className="footer-link">Careers</Link>
            <Link to="/" className="footer-link">Contact</Link>
            <Link to="/" className="footer-link">Blog</Link>
          </div>
          <div className="footer-links-group">
            <h4 className="text-label" style={{ marginBottom: 16 }}>Product</h4>
            <Link to="/customer" className="footer-link">Customer App</Link>
            <Link to="/cleaner" className="footer-link">Cleaner App</Link>
            <Link to="/admin" className="footer-link">Admin Panel</Link>
            <Link to="/" className="footer-link">Pricing</Link>
          </div>
          <div className="footer-links-group">
            <h4 className="text-label" style={{ marginBottom: 16 }}>Legal</h4>
            <Link to="/" className="footer-link">Privacy Policy</Link>
            <Link to="/" className="footer-link">Terms of Service</Link>
            <Link to="/" className="footer-link">Refund Policy</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span className="text-body-sm text-tertiary">© 2025 Cleanzo. All rights reserved.</span>
          <div className="footer-social">
            {['Twitter', 'Instagram', 'LinkedIn'].map(s => (
              <a key={s} href="/" className="footer-social-link">{s}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
