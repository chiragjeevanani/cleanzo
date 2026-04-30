import { useState, useEffect, useRef, useCallback } from 'react'
import LoadingScreen from './LoadingScreen'
import Navbar from './Navbar'
import HeroSection from './HeroSection'
import StatsSection from './StatsSection'
import ServicesSection from './ServicesSection'
import HowItWorksSection from './HowItWorksSection'
import PricingSection from './PricingSection'
import TestimonialsSection from './TestimonialsSection'
import AppDownloadSection from './AppDownloadSection'
import Footer from './Footer'
import './LandingPage.css'

export default function LandingPage() {
  const [loading, setLoading] = useState(true)
  const mainRef = useRef(null)

  const handleLoadComplete = useCallback(() => setLoading(false), [])

  /* Scroll-reveal observer */
  useEffect(() => {
    if (loading) return
    
    // Slight delay to ensure DOM layout is completely settled after loading screen unmounts
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
      
      // Cleanup observer on unmount
      return () => observer.disconnect()
    }, 100)

    return () => clearTimeout(timer)
  }, [loading])

  /* Scroll progress bar */
  useEffect(() => {
    if (loading) return
    const bar = document.getElementById('scroll-progress')
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight
      if (bar && h > 0) bar.style.width = `${(window.scrollY / h) * 100}%`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [loading])

  return (
    <>
      {loading && <LoadingScreen onComplete={handleLoadComplete} />}
      <div className="scroll-progress-bar" id="scroll-progress" />
      <Navbar />
      <main ref={mainRef} className="landing-main">
        <HeroSection />
        <StatsSection />
        <ServicesSection />
        <HowItWorksSection />
        <PricingSection />
        <TestimonialsSection />
        <AppDownloadSection />
        <Footer />
      </main>
    </>
  )
}
