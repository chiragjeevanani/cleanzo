import { Star } from 'lucide-react'
import './TestimonialsSection.css'

const reviews = [
  {
    name: 'JULIAN MARKS',
    role: 'PORSCHE COLLECTOR',
    text: '“Cleanzo isn\'t just about cleaning. It\'s about engineering. My 911 interior looks better today than it did the day I collected it from Stuttgart.”',
  },
  {
    name: 'CLAIRE VERNON',
    role: 'HOSPITALITY EXECUTIVE',
    text: '“Cleanzo is the only team I trust with my heritage upholstery. They understand the science of restoration, not just cleaning.”',
  },
  {
    name: 'MARCUS CHEN',
    role: 'BENTLEY OWNER',
    text: '“Their molecular odor scan found bacteria that I thought was permanent. Truly remarkable technology.”',
  },
]

export default function TestimonialsSection() {
  return (
    <section className="landing-section reviews-section" id="testimonials">
      <div className="container">
        <div className="section-header-premium reveal">
          <span className="section-label">CLIENT FEEDBACK</span>
          <h2 className="section-title-premium">CLIENT<br />EXPERIENCES.</h2>
        </div>

        <div className="reviews-grid reveal">
          {reviews.map((review, i) => (
            <div key={i} className="review-card glass">
              <div className="review-stars">
                {[1,2,3,4,5].map(s => <Star key={s} size={16} fill="var(--accent-lime)" stroke="none" />)}
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
    </section>
  )
}
