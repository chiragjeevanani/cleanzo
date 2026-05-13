import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown } from 'lucide-react'
import './HeroSection.css'

export default function HeroSection({ bgImageUrl, heroReady }) {
  const sectionRef = useRef(null)

  useEffect(() => {
    if (!heroReady) return
    const chars = sectionRef.current?.querySelectorAll('.hero-char') ?? []
    chars.forEach((char, i) => {
      char.style.animationDelay = `${i * 30}ms`
    })
  }, [heroReady])

  const splitText = (text, className = '') => {
    let globalCharIndex = 0;
    return text.split(' ').map((word, wIdx, arr) => (
      <span key={wIdx} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
        {word.split('').map((char) => {
          const charIndex = globalCharIndex++;
          return (
            <span key={charIndex} className={`hero-char ${className}`}>
              {char}
            </span>
          );
        })}
        {wIdx < arr.length - 1 && (
          <span className={`hero-char ${className}`}>
            {(() => { globalCharIndex++; return '\u00A0'; })()}
          </span>
        )}
      </span>
    ))
  }

  return (
    <section ref={sectionRef} className={`hero-section${heroReady ? ' hero-ready' : ''}`} id="hero">
      {/* Background Image with Overlay */}
      <div className="hero-bg-image" style={{ backgroundImage: `url("${bgImageUrl}")` }}>
        <div className="hero-overlay-gradient" />
      </div>

      <div className="container hero-container">
        <div className="hero-content">
          <div className="hero-label-premium animate-fade-in-up">
            <span className="text-label" style={{ color: 'var(--accent-lime)' }}>INDIA'S FIRST DEDICATED CAR EXTERIOR CLEANING</span>
          </div>

          <h1 className="hero-headline-premium">
            <span className="hero-line">
              {splitText('DAILY EXTERIOR')}
            </span>
            <span className="hero-line hero-line-accent">
              {splitText('CARE FOR YOUR CAR.')}
            </span>
          </h1>

          <p className="hero-sub-premium animate-fade-in-up delay-2">
            Scheduled daily doorstep cleaning at your residential society. Reliability and convenience delivered directly to your parking slot between 5:00 AM to 12:00 PM.
          </p>

          <div className="hero-actions-premium animate-fade-in-up delay-3">
            <Link to="/login" className="btn btn-primary btn-lg">
              START SUBSCRIPTION
            </Link>
            <button className="btn btn-glass btn-lg" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
              EXPLORE PLANS
            </button>
          </div>

          <div className="society-check-widget animate-fade-in-up delay-4">
            <div className="widget-inner">
              <span className="widget-label">CHECK AVAILABILITY</span>
              <div className="search-group">
                <input type="text" placeholder="Enter your society name..." className="society-input" />
                <button className="btn-check">CHECK</button>
              </div>
              <p className="widget-helper">Serving 50+ premium societies in Delhi-NCR</p>
            </div>
          </div>

          {/* Social Proof: Trust Bar */}
          <div className="hero-trust-bar animate-fade-in-up delay-5">
            <span className="trust-label">TRUSTED BY RESIDENTS OF</span>
            <div className="trust-logos">
              <span className="trust-logo">DLF THE CAMELLIAS</span>
              <span className="trust-logo">M3M GOLF ESTATE</span>
              <span className="trust-logo">IREO VICTORY VALLEY</span>
              <span className="trust-logo">THE MAGNOLIAS</span>
            </div>
          </div>
        </div>

        <div className="hero-scroll-indicator animate-bounce">
          <span className="text-label" style={{ fontSize: 10, opacity: 0.6 }}>SCROLL</span>
          <div className="scroll-line" />
          <ChevronDown size={16} opacity={0.6} />
        </div>
      </div>
    </section>
  )
}
