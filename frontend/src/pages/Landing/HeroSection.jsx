import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Play } from 'lucide-react'
import './HeroSection.css'

export default function HeroSection() {
  const sectionRef = useRef(null)

  useEffect(() => {
    const chars = document.querySelectorAll('.hero-char')
    chars.forEach((char, i) => {
      char.style.animationDelay = `${600 + i * 40}ms`
    })
  }, [])

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
    <section ref={sectionRef} className="hero-section" id="hero">
      {/* Background effects */}
      <div className="hero-bg">
        <div className="hero-gradient-orb hero-orb-blue" />
        <div className="hero-gradient-orb hero-orb-lime" />
        <div className="hero-grid-overlay" />
      </div>

      <div className="container hero-container">
        <div className="hero-content">
          <div className="hero-label animate-fade-in-up">
            <span className="chip chip-lime">New</span>
            <span>Subscription-based car care</span>
          </div>

          <h1 className="hero-headline">
            <span className="hero-line">
              {splitText('Your Car')}
            </span>
            <span className="hero-line">
              {splitText('Deserves ')}
              {splitText('Premium', 'hero-char-accent')}
            </span>
            <span className="hero-line">
              {splitText('Care', 'hero-char-blue')}
              <span className="hero-char hero-period">.</span>
            </span>
          </h1>

          <p className="hero-sub animate-fade-in-up delay-3">
            Daily car cleaning, managed by subscription. Skip anytime, track every wash, 
            and never worry about a dirty car again.
          </p>

          <div className="hero-actions animate-fade-in-up delay-4">
            <Link to="/customer" className="btn btn-primary btn-lg">
              Start Your Plan <ArrowRight size={18} />
            </Link>
            <button className="btn btn-glass btn-lg hero-play-btn">
              <Play size={16} fill="currentColor" /> See How It Works
            </button>
          </div>

          <div className="hero-trust animate-fade-in-up delay-5">
            <div className="hero-trust-avatars">
              {[1,2,3,4].map(i => (
                <div key={i} className="hero-trust-avatar" style={{ backgroundColor: i % 2 === 0 ? 'var(--primary-blue)' : 'var(--accent-lime)' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: i % 2 === 0 ? '#fff' : '#000' }}>
                    {['A','P','R','S'][i-1]}
                  </span>
                </div>
              ))}
            </div>
            <div className="hero-trust-text">
              <strong>10,000+</strong> happy car owners
              <span className="hero-trust-rating">★ 4.9</span>
            </div>
          </div>
        </div>

        <div className="hero-visual animate-fade-in delay-2">
          <div className="hero-card glass">
            <div className="hero-card-header">
              <span className="text-label text-lime">LIVE STATUS</span>
              <span className="chip chip-lime">Active</span>
            </div>
            <div className="hero-card-car">
              <svg viewBox="0 0 280 120" fill="none" className="hero-car-svg">
                <path d="M40 80 L65 45 L110 30 L190 30 L220 45 L245 80" stroke="var(--accent-lime)" strokeWidth="2" fill="none" />
                <path d="M30 80 L250 80" stroke="var(--text-secondary)" strokeWidth="1" />
                <circle cx="85" cy="84" r="12" stroke="var(--primary-blue)" strokeWidth="2" fill="none" />
                <circle cx="205" cy="84" r="12" stroke="var(--primary-blue)" strokeWidth="2" fill="none" />
                <path d="M120 30 L120 45 M165 30 L165 45" stroke="var(--accent-lime)" strokeWidth="1" opacity="0.4" />
              </svg>
            </div>
            <div className="hero-card-details">
              <div className="hero-card-row">
                <span className="text-body-sm text-secondary">BMW 3 Series</span>
                <span className="text-body-sm" style={{ color: 'var(--accent-lime)' }}>MH 02 AB 1234</span>
              </div>
              <div className="hero-card-row">
                <span className="text-body-sm text-secondary">Premium Detail</span>
                <span className="text-body-sm text-secondary">Day 18 of 30</span>
              </div>
              <div className="progress-track" style={{ marginTop: 8 }}>
                <div className="progress-fill" style={{ width: '60%' }} />
              </div>
            </div>
          </div>
          {/* Floating badges */}
          <div className="hero-float-badge hero-float-1 glass">
            <span style={{ fontSize: 20 }}>🧼</span>
            <span className="text-body-sm">Wash Complete</span>
          </div>
          <div className="hero-float-badge hero-float-2 glass">
            <span style={{ fontSize: 20 }}>⚡</span>
            <span className="text-body-sm">Skip Anytime</span>
          </div>
        </div>
      </div>
    </section>
  )
}
