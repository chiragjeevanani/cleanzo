import { UserPlus, CreditCard, CalendarCheck } from 'lucide-react'
import './HowItWorksSection.css'

const steps = [
  { icon: UserPlus, num: '01', title: 'Sign Up & Add Your Car', desc: 'Create your account, add your vehicle details, and set your parking location. Takes under 2 minutes.' },
  { icon: CreditCard, num: '02', title: 'Choose Your Plan & Pay', desc: 'Pick from Basic, Premium, or Elite plans. Flexible weekly or monthly subscriptions with secure payments.' },
  { icon: CalendarCheck, num: '03', title: 'Sit Back, We Handle It', desc: 'Your car gets cleaned daily at your parking spot. Track every wash, skip days when you want.' },
]

export default function HowItWorksSection() {
  return (
    <section className="landing-section how-section" id="how-it-works">
      <div className="container">
        <div className="section-header reveal">
          <span className="text-label text-blue">Simple Process</span>
          <h2 className="text-headline-lg">How Cleanzo Works</h2>
          <p className="text-body-lg text-secondary" style={{ maxWidth: 480, margin: '0 auto' }}>
            Three steps to a spotless car, every single day.
          </p>
        </div>

        <div className="how-steps">
          {steps.map((s, i) => (
            <div key={i} className="how-step reveal" style={{ transitionDelay: `${i * 150}ms` }}>
              <div className="how-step-left">
                <span className="how-step-num">{s.num}</span>
                {i < steps.length - 1 && <div className="how-step-line" />}
              </div>
              <div className="how-step-content glass">
                <div className="how-step-icon">
                  <s.icon size={24} strokeWidth={1.5} />
                </div>
                <h3 className="text-headline-sm">{s.title}</h3>
                <p className="text-body-md text-secondary">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
