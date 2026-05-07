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
          <div className="hero-glow-left" />
          <div className="hero-label animate-fade-in-up">
            <div className="flex items-center gap-8 glass" style={{ padding: '4px 12px', borderRadius: 100 }}>
              <span className="chip chip-lime" style={{ margin: 0 }}>Active</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>365 Days • Doorstep Cleaning</span>
            </div>
          </div>

          <h1 className="hero-headline">
            <span className="hero-line">
              {splitText('Pristine Car')}
            </span>
            <span className="hero-line" style={{ marginTop: -10 }}>
              <span className="hero-text-outline">{splitText('Every ')}</span>
            </span>
            <span className="hero-line" style={{ marginTop: -10 }}>
              <span className="hero-char-accent-glow">{splitText('Single', 'hero-char-accent')}</span>
            </span>
            <span className="hero-line" style={{ marginTop: -10 }}>
              {splitText('Morning', 'hero-char-blue')}
              <span className="hero-char hero-period">.</span>
            </span>
          </h1>

          <p className="hero-sub animate-fade-in-up delay-3">
            Dedicated daily exterior cleaning from 5 AM – 10 AM. No holidays, no leaves, just a sparkling car waiting for you every day. Prepaid subscription model.
          </p>

          <div className="hero-actions animate-fade-in-up delay-4">
            <Link to="/login" className="btn btn-primary btn-lg hero-main-cta">
              Get Daily Cleaning <ArrowRight size={18} />
              <div className="btn-glow" />
            </Link>
            <button className="btn btn-glass btn-lg hero-play-btn">
              <Play size={16} fill="currentColor" /> Watch Film
            </button>
          </div>

          <div className="hero-trust animate-fade-in-up delay-5 glass" style={{ padding: '12px 20px', borderRadius: 20, width: 'fit-content' }}>
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
              <strong>10k+</strong> owners trust Cleanzo
              <span className="hero-trust-rating">★ 4.9</span>
            </div>
          </div>
        </div>

        <div className="hero-visual animate-fade-in delay-2">
          <div className="hero-card glass">
            <div className="hero-card-header">
              <span className="text-label text-lime">LIVE STATUS</span>
              <div className="flex items-center gap-8">
                <span className="pulse-dot" style={{ background: 'var(--accent-lime)' }} />
                <span className="chip chip-lime">Active</span>
              </div>
            </div>
            <div className="hero-card-car" style={{ position: 'relative' }}>
              <div className="scan-line" />
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
                <span className="text-body-sm font-bold" style={{ color: 'var(--accent-lime)' }}>MH 02 AB 1234</span>
              </div>
              <div className="hero-card-row">
                <span className="text-body-sm text-secondary">Premium Detail</span>
                <span className="text-body-sm text-secondary">Day 18 of 30</span>
              </div>
              <div className="progress-track" style={{ marginTop: 12, height: 6 }}>
                <div className="progress-fill" style={{ width: '60%', background: 'linear-gradient(90deg, var(--primary-blue), var(--accent-lime))' }} />
              </div>
            </div>
          </div>
          {/* Floating badges */}
          <div className="hero-float-badge hero-float-1 glass">
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(var(--accent-lime-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 16 }}>🧼</span>
            </div>
            <div className="flex flex-col">
              <span style={{ fontSize: 10, opacity: 0.6, fontWeight: 700 }}>STATUS</span>
              <span className="text-body-sm">Cleaning Complete</span>
            </div>
          </div>
          <div className="hero-float-badge hero-float-2 glass">
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(var(--primary-blue-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 16 }}>⚡</span>
            </div>
            <div className="flex flex-col">
              <span style={{ fontSize: 10, opacity: 0.6, fontWeight: 700 }}>FLEXIBILITY</span>
              <span className="text-body-sm">Skip Anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
