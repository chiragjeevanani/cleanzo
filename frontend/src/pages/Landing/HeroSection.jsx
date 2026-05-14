import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown, MapPin, Search, CheckCircle2, X } from 'lucide-react'
import apiClient from '../../services/apiClient'
import './HeroSection.css'

export default function HeroSection({ bgImageUrl, heroReady }) {
  const sectionRef = useRef(null)
  const [searchMode, setSearchMode] = useState('name') // name | pincode
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null) // null | []
  const [loading, setLoading] = useState(false)
  const [showStatus, setShowStatus] = useState(null) // 'success' | 'fail'
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const widgetRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!heroReady) return
    const chars = sectionRef.current?.querySelectorAll('.hero-char') ?? []
    chars.forEach((char, i) => {
      char.style.animationDelay = `${i * 30}ms`
    })
  }, [heroReady])

  // Fetch suggestions as user types
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length < 2 || searchMode !== 'name') {
        setSuggestions([]);
        return;
      }
      try {
        const res = await apiClient.get('/public/societies/search', { q: query });
        setSuggestions(res.societies || []);
      } catch (err) {
        console.error(err);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [query, searchMode]);

  const handleCheck = async (e) => {
    if (e) e.preventDefault()
    if (!query) return
    setLoading(true)
    setShowStatus(null)
    setShowSuggestions(false)
    try {
      const params = searchMode === 'pincode' ? { pincode: query } : { q: query }
      const res = await apiClient.get('/public/societies/search', params)
      if (res.societies && res.societies.length > 0) {
        setResults(res.societies)
        setShowStatus('success')
      } else {
        setResults([])
        setShowStatus('fail')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const selectSuggestion = (s) => {
    setQuery(s.name);
    setResults([s]);
    setShowStatus('success');
    setShowSuggestions(false);
  }

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

          <div ref={widgetRef} className="society-check-widget animate-fade-in-up delay-4">
            <div className="widget-inner">
              <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
                <span className="widget-label">CHECK AVAILABILITY</span>
                <div className="search-toggle">
                  <button onClick={() => setSearchMode('name')} className={searchMode === 'name' ? 'active' : ''}>SOCIETY</button>
                  <button onClick={() => setSearchMode('pincode')} className={searchMode === 'pincode' ? 'active' : ''}>PINCODE</button>
                </div>
              </div>

              <form onSubmit={handleCheck} className="search-group">
                <div style={{ position: 'relative', flex: 1 }}>
                  {searchMode === 'name' ? <Search size={18} className="search-icon" /> : <MapPin size={18} className="search-icon" />}
                    <input 
                      type="text" 
                      placeholder={searchMode === 'name' ? "Enter your society name..." : "Enter your 6-digit pincode..."} 
                      className="society-input"
                      value={query}
                      onChange={(e) => { setQuery(e.target.value); setShowStatus(null); setShowSuggestions(true); }}
                      onFocus={() => setShowSuggestions(true)}
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="search-suggestions glass animate-fade-in">
                        {suggestions.map(s => (
                          <div key={s._id} className="suggestion-item" onClick={() => selectSuggestion(s)}>
                            <MapPin size={12} color="var(--accent-lime)" />
                            <div>
                              <div className="s-name">{s.name}</div>
                              <div className="s-area">{s.area}, {s.city}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                <button type="submit" disabled={loading} className="btn-check">
                  {loading ? '...' : 'CHECK'}
                </button>
              </form>

              {showStatus === 'success' && (
                <div className="status-message success animate-fade-in">
                  <CheckCircle2 size={16} /> 
                  <span>Great! We serve <strong>{results[0]?.name}</strong>.</span>
                  <Link to="/login" className="status-link">Subscribe Now <ArrowRight size={14}/></Link>
                </div>
              )}

              {showStatus === 'fail' && (
                <div className="status-message fail animate-fade-in">
                  <X size={16} />
                  <span>Not serving here yet.</span>
                  <Link to="/login" className="status-link">Request Your Area</Link>
                </div>
              )}

              {!showStatus && <p className="widget-helper">Serving 50+ premium societies in Delhi-NCR</p>}
            </div>
          </div>

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
