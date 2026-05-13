import { Shield, Sparkles } from 'lucide-react'
import './PrecisionSection.css'

export default function PrecisionSection() {
  return (
    <section className="landing-section precision-section" id="precision">
      <div className="container precision-container">
        <div className="precision-content reveal">
          <span className="section-label">THE WATER-EFFICIENT METHOD.</span>
          
          <div className="precision-feature">
            <div className="precision-feature-icon">
              <Shield size={24} color="var(--primary-blue)" />
            </div>
            <div className="precision-feature-text">
              <h3>Microfiber Technology</h3>
              <p>We use water-efficient, microfiber-based cleaning methods to protect your car's finish while conserving resources. Strictly no pressure washing or foam washing.</p>
            </div>
          </div>

          <div className="precision-feature">
            <div className="precision-feature-icon">
              <Sparkles size={24} color="var(--primary-blue)" />
            </div>
            <div className="precision-feature-text">
              <h3>Society-Wise Reliability</h3>
              <p>Trained crew members allocated society-wise to ensure daily consistent vehicle exterior cleaning between 5:00 AM to 12:00 PM.</p>
            </div>
          </div>
        </div>

        <div className="precision-visual reveal">
          <div className="precision-image-wrap">
            <img src="/image.png" alt="Cleanzo Service" className="precision-image" />
            <div className="precision-image-label">
              <span className="text-label">DAILY EXTERIOR CARE</span>
              <span style={{ fontSize: 10, opacity: 0.6 }}>RESIDENTIAL SOCIETIES</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
