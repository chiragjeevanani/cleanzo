import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import './FAQSection.css'

const faqs = [
  {
    question: "Which societies do you currently serve?",
    answer: "We currently serve 50+ premium residential societies across Delhi-NCR. You can use the search widget in the hero section to check if your society is covered."
  },
  {
    question: "What time is the cleaning performed?",
    answer: "Our crew operates between 5:00 AM and 12:00 PM daily. This ensures your car is clean and ready before you leave for work."
  },
  {
    question: "Is this a waterless wash?",
    answer: "We use a water-efficient cleaning protocol with premium microfiber cloths and specialized cleaning agents to ensure a scratch-free, high-gloss finish while being environmentally conscious."
  },
  {
    question: "Do I need to be present during cleaning?",
    answer: "No. Since we only clean the exterior, you don't need to be present. Our crew has pre-allocated access to your society's parking area."
  },
  {
    question: "Can I skip a day or pause my subscription?",
    answer: "Yes! You can manage your subscription, skip days, or pause service directly through our mobile app."
  }
]

export default function FAQSection() {
  const [openIdx, setOpenIdx] = useState(0)

  return (
    <section className="faq-section" id="faq">
      <div className="container">
        <div className="faq-header">
          <span className="section-label">HAVE QUESTIONS?</span>
          <h2 className="section-title-premium">FREQUENTLY ASKED</h2>
        </div>

        <div className="faq-grid">
          {faqs.map((faq, i) => (
            <div 
              key={i} 
              className={`faq-item ${openIdx === i ? 'faq-open' : ''}`}
              onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
            >
              <div className="faq-question">
                <span>{faq.question}</span>
                <div className="faq-toggle">
                  {openIdx === i ? <Minus size={18} /> : <Plus size={18} />}
                </div>
              </div>
              <div className="faq-answer">
                <div className="answer-content">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
