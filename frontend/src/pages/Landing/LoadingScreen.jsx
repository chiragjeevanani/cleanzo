import { useState, useEffect } from 'react'
import './LoadingScreen.css'

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('loading') // loading, reveal, done

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setPhase('reveal')
          setTimeout(() => {
            setPhase('done')
            onComplete?.()
          }, 800)
          return 100
        }
        return prev + Math.random() * 8 + 2
      })
    }, 60)
    return () => clearInterval(interval)
  }, [onComplete])

  if (phase === 'done') return null

  return (
    <div className={`loading-screen ${phase === 'reveal' ? 'loading-exit' : ''}`}>
      <div className="loading-content">
        {/* Car SVG Silhouette with wash animation */}
        <div className="loading-car-wrap">
          <svg className="loading-car" viewBox="0 0 200 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M30 55 L45 35 L75 25 L130 25 L155 35 L170 55" stroke="var(--accent-lime)" strokeWidth="2" fill="none" className="car-body" />
            <path d="M20 55 L180 55" stroke="var(--accent-lime)" strokeWidth="2" className="car-base" />
            <circle cx="55" cy="58" r="8" stroke="var(--accent-lime)" strokeWidth="2" fill="none" className="wheel-l" />
            <circle cx="145" cy="58" r="8" stroke="var(--accent-lime)" strokeWidth="2" fill="none" className="wheel-r" />
            <path d="M80 25 L80 35 M110 25 L110 35" stroke="var(--accent-lime)" strokeWidth="1.5" opacity="0.5" />
          </svg>
          {/* Water drops */}
          <div className="water-particles">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="water-drop" style={{
                left: `${15 + Math.random() * 70}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 1.5}s`
              }} />
            ))}
          </div>
          {/* Foam bubbles */}
          <div className="foam-particles">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="foam-bubble" style={{
                left: `${20 + Math.random() * 60}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }} />
            ))}
          </div>
        </div>

        {/* Brand Text */}
        <div className="loading-brand">
          {'CLEANZO'.split('').map((char, i) => (
            <span key={i} className="loading-char" style={{ animationDelay: `${i * 0.08}s` }}>
              {char}
            </span>
          ))}
        </div>

        {/* Progress */}
        <div className="loading-progress-wrap">
          <div className="loading-progress-track">
            <div className="loading-progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
          <span className="loading-percent">{Math.round(Math.min(progress, 100))}%</span>
        </div>
      </div>
    </div>
  )
}
