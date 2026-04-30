import { Star } from 'lucide-react'
import { testimonials } from '../../data/mockData'
import './TestimonialsSection.css'

const TestimonialCard = ({ t, i }) => (
  <div className="testimonial-card glass">
    <div className="testimonial-stars">
      {[...Array(t.rating)].map((_, j) => <Star key={j} size={14} fill="var(--accent-lime)" stroke="none" />)}
    </div>
    <p className="testimonial-text">"{t.text}"</p>
    <div className="testimonial-author">
      <div className="testimonial-avatar" style={{ background: i % 2 === 0 ? 'var(--primary-blue)' : 'var(--accent-lime)' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: i % 2 === 0 ? '#fff' : '#000' }}>{t.name[0]}</span>
      </div>
      <div>
        <div className="testimonial-name">{t.name}</div>
        <div className="text-body-sm text-secondary">{t.role}</div>
      </div>
    </div>
  </div>
)

export default function TestimonialsSection() {
  // Duplicate array for seamless infinite scrolling
  const row1 = [...testimonials, ...testimonials, ...testimonials]
  const row2 = [...testimonials].reverse()
  const row2Duplicated = [...row2, ...row2, ...row2]

  return (
    <section className="landing-section testimonials-section" id="testimonials">
      <div className="container">
        <div className="section-header reveal" style={{ marginBottom: '48px' }}>
          <h2 className="text-headline-lg">Trusted by car owners everywhere</h2>
          <p className="text-body-lg text-secondary" style={{ maxWidth: 480, margin: '8px auto 0' }}>
            Everyone loves driving a clean car, except for those who don't care about their cars.
          </p>
        </div>
      </div>
      
      <div className="marquee-container reveal">
        {/* Row 1: Scrolling Left */}
        <div className="marquee-row">
          <div className="marquee-content scroll-left">
            {row1.map((t, i) => <TestimonialCard key={`r1a-${i}`} t={t} i={i} />)}
          </div>
          <div className="marquee-content scroll-left" aria-hidden="true">
            {row1.map((t, i) => <TestimonialCard key={`r1b-${i}`} t={t} i={i} />)}
          </div>
        </div>

        {/* Row 2: Scrolling Right */}
        <div className="marquee-row">
          <div className="marquee-content scroll-right">
            {row2Duplicated.map((t, i) => <TestimonialCard key={`r2a-${i}`} t={t} i={i} />)}
          </div>
          <div className="marquee-content scroll-right" aria-hidden="true">
            {row2Duplicated.map((t, i) => <TestimonialCard key={`r2b-${i}`} t={t} i={i} />)}
          </div>
        </div>
      </div>
    </section>
  )
}
