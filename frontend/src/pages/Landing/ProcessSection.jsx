import { useState } from 'react'
import './ProcessSection.css'

const steps = [
  { id: '01', title: 'SOCIETY SIGNUP', desc: 'Select your residential society and allocated time slot (5 AM - 12 PM) for daily cleaning.' },
  { id: '02', title: 'MICROFIBER CARE', desc: 'Our trained crew performs a water-efficient exterior cleaning using premium microfiber technology.' },
  { id: '03', title: 'DAILY CONSISTENCY', desc: 'Wake up to a clean car every morning. Track service history and manage skips via your dashboard.' },
]

export default function ProcessSection() {
  const [activeStep, setActiveStep] = useState(0)

  return (
    <section className="landing-section process-section" id="process">
      <div className="container process-container">
        <div className="process-info reveal">
          <span className="section-label">OPERATIONAL FLOW</span>
          <h2 className="section-title-premium">SOCIETY-WISE<br />RELIABILITY.</h2>
          <p className="process-intro">Trained crew members allocated society-wise to ensure daily consistent cleaning between 5:00 AM to 12:00 PM.</p>

          <div className="process-steps">
            {steps.map((step, i) => (
              <div 
                key={step.id} 
                className={`process-step ${activeStep === i ? 'active' : ''}`}
                onMouseEnter={() => setActiveStep(i)}
              >
                <div className="step-number">STEP {step.id}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="process-visual reveal">
          <div className="process-image-container">
            <img src="/image1.png" alt="Cleanzo Process" className="process-image" />
            <div className="process-stats">
              <div className="process-stat">
                <span className="stat-value">365</span>
                <span className="stat-label">RELIABILITY</span>
              </div>
              <div className="process-stat">
                <span className="stat-value">5AM-12PM</span>
                <span className="stat-label">SERVICE WINDOW</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
