import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { Menu, X, Sun, Moon } from 'lucide-react'
import './Navbar.css'

const navLinks = [
  { label: 'Services', href: '#services' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Testimonials', href: '#testimonials' },
]

export default function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [lastY, setLastY] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 80)
      setHidden(y > 200 && y > lastY)
      setLastY(y)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [lastY])

  const scrollTo = (href) => {
    setMobileOpen(false)
    const el = document.querySelector(href)
    el?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <nav className={`landing-nav ${scrolled ? 'nav-scrolled' : ''} ${hidden ? 'nav-hidden' : ''}`}>
        <div className="nav-inner">
          <Link to="/" className="nav-logo">
            <img src="/cleanzo Logo.png" alt="Cleanzo" className="nav-logo-img" />
            <span className="nav-logo-text">Cleanzo</span>
          </Link>

          <div className="nav-links hide-mobile">
            {navLinks.map(link => (
              <button key={link.href} className="nav-link" onClick={() => scrollTo(link.href)}>
                {link.label}
              </button>
            ))}
          </div>

          <div className="nav-actions">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link to="/customer" className="btn btn-primary btn-sm hide-mobile">Get Started</Link>
            <button className="nav-hamburger" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${mobileOpen ? 'mobile-menu-open' : ''}`}>
        <div className="mobile-menu-content">
          {navLinks.map((link, i) => (
            <button
              key={link.href}
              className="mobile-menu-link"
              onClick={() => scrollTo(link.href)}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {link.label}
            </button>
          ))}
          <div className="mobile-menu-divider" />
          <Link to="/customer" className="btn btn-primary btn-lg w-full" onClick={() => setMobileOpen(false)}>
            Get Started
          </Link>
          <Link to="/admin" className="btn btn-ghost btn-lg w-full" onClick={() => setMobileOpen(false)}>
            Admin Panel
          </Link>
        </div>
      </div>
    </>
  )
}
