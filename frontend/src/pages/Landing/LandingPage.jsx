import { useState, useEffect, useRef, useCallback } from 'react'
import LoadingScreen from './LoadingScreen'
import Navbar from './Navbar'
import { useTheme } from '../../context/ThemeContext'
import HeroSection from './HeroSection'
import PrecisionSection from './PrecisionSection'
import ServicesSection from './ServicesSection'
import PricingSection from './PricingSection'
import ProcessSection from './ProcessSection'
import TestimonialsSection from './TestimonialsSection'
import AppDownloadSection from './AppDownloadSection'
import FAQSection from './FAQSection'
import Footer from './Footer'
import './LandingPage.css'

const HERO_IMAGE_URL = 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=2070&auto=format&fit=crop'

export default function LandingPage() {
  const { theme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [progressDone, setProgressDone] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const mainRef = useRef(null)

  const handleLoadComplete = useCallback(() => setProgressDone(true), [])

  // Preload hero image; dismiss loading screen only when both progress and image are ready
  useEffect(() => {
    const img = new Image()
    img.onload = () => setImageLoaded(true)
    img.onerror = () => setImageLoaded(true)
    img.src = HERO_IMAGE_URL
    const timeout = setTimeout(() => setImageLoaded(true), 5000)
    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (progressDone && imageLoaded) setLoading(false)
  }, [progressDone, imageLoaded])

  /* Scroll-reveal observer */
  useEffect(() => {
    if (loading) return
    
    const timer = setTimeout(() => {
      const reveals = document.querySelectorAll('.reveal')
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            observer.unobserve(entry.target)
          }
        })
      }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' })
      
      reveals.forEach(el => observer.observe(el))
      
      return () => observer.disconnect()
    }, 100)

    return () => clearTimeout(timer)
  }, [loading])

  return (
    <div className={`landing-page-root theme-${theme}`}>
      {loading && <LoadingScreen onComplete={handleLoadComplete} />}
      <div className="scroll-progress-bar" id="scroll-progress" />
      <Navbar />
      <main ref={mainRef} className="landing-main">
        <HeroSection bgImageUrl={HERO_IMAGE_URL} heroReady={!loading} />
        <PrecisionSection />
        <ServicesSection />
        <PricingSection />
        <ProcessSection />
        <TestimonialsSection />
        <AppDownloadSection />
        <FAQSection />
        <Footer />
      </main>
    </div>
  )
}
