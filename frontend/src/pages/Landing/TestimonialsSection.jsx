import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import apiClient from '../../services/apiClient'
import './TestimonialsSection.css'

const FALLBACK_REVIEWS = [
  {
    name: 'JULIAN MARKS',
    role: 'PORSCHE COLLECTOR',
    text: '"Cleanzo isn\'t just about cleaning. It\'s about engineering. My 911 interior looks better today than it did the day I collected it from Stuttgart."',
    rating: 5,
  },
  {
    name: 'CLAIRE VERNON',
    role: 'HOSPITALITY EXECUTIVE',
    text: '"Cleanzo is the only team I trust with my heritage upholstery. They understand the science of restoration, not just cleaning."',
    rating: 5,
  },
  {
    name: 'MARCUS CHEN',
    role: 'BENTLEY OWNER',
    text: '"Their molecular odor scan found bacteria that I thought was permanent. Truly remarkable technology."',
    rating: 5,
  },
]

export default function TestimonialsSection() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    apiClient.get('/public/testimonials')
      .then(res => {
        if (active && res.success && res.testimonials && res.testimonials.length > 0) {
          setReviews(res.testimonials)
        } else {
          setReviews(FALLBACK_REVIEWS)
        }
      })
      .catch(() => {
        if (active) setReviews(FALLBACK_REVIEWS)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  // Duplicate for seamless infinite loop
  const doubled = [...reviews, ...reviews]

  return (
    <section className="landing-section reviews-section" id="testimonials">
      <div className="container">
        <div className="section-header-premium reveal">
          <span className="section-label">CLIENT FEEDBACK</span>
          <h2 className="section-title-premium">CLIENT<br />EXPERIENCES.</h2>
        </div>
      </div>

      {loading ? (
        <div className="container reveal" style={{ marginTop: 40 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="review-card glass" style={{ height: 200, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 24, borderRadius: 20 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map(s => <div key={s} className="skeleton" style={{ width: 14, height: 14, borderRadius: '50%' }} />)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                  <div className="skeleton" style={{ height: 14, width: '90%', borderRadius: 4 }} />
                  <div className="skeleton" style={{ height: 14, width: '80%', borderRadius: 4 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 20 }}>
                  <div className="skeleton" style={{ height: 12, width: '50%', borderRadius: 3 }} />
                  <div className="skeleton" style={{ height: 10, width: '30%', borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="reviews-marquee-wrapper" aria-label="Client testimonials">
          <div className="reviews-marquee-track">
            {doubled.map((review, i) => (
              <div key={i} className="review-card glass">
                <div className="review-stars">
                  {Array.from({ length: review.rating ?? 5 }).map((_, s) => (
                    <Star key={s} size={16} fill="var(--text-accent)" stroke="none" />
                  ))}
                </div>
                <p className="review-text">{review.text}</p>
                <div className="review-footer">
                  <span className="review-name">{review.name}</span>
                  <span className="review-role">{review.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
