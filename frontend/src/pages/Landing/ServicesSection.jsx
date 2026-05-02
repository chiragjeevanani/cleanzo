import { Droplets, SprayCan, Sparkles, ShieldCheck, Wind, Gem } from 'lucide-react'
import './ServicesSection.css'

const services = [
  { icon: Droplets, title: 'Daily Exterior Cleaning', desc: 'Meticulous waterless cleaning at your doorstep every morning between 5 AM – 10 AM.', color: 'var(--primary-blue)', className: 'col-span-2' },
  { icon: Sparkles, title: '365 Days Service', desc: 'No holidays, no leaves. We work through Sundays, festivals, and public holidays without fail.', color: 'var(--accent-lime)', className: 'col-span-1' },
  { icon: SprayCan, title: 'Interior Add-on', desc: 'Deep cabin cleaning, vacuuming, and dashboard polishing available to add to any plan.', color: 'var(--primary-blue)', className: 'col-span-1' },
  { icon: ShieldCheck, title: 'Professional Staff', desc: 'Trained and background-verified cleaning professionals dedicated to your vehicle\'s care.', color: 'var(--accent-lime)', className: 'col-span-2' },
  { icon: Wind, title: 'Deep Detailing Add-on', desc: 'Engine bay cleaning and full body detailing available as premium on-demand services.', color: 'var(--primary-blue)', className: 'col-span-2' },
  { icon: Gem, title: 'Prepaid Convenience', desc: 'Simple monthly prepaid model with total transparency and automated scheduling.', color: 'var(--accent-lime)', className: 'col-span-1' },
]

export default function ServicesSection() {
  return (
    <section className="landing-section services-section" id="services">
      <div className="container">
        <div className="section-header reveal">
          <span className="text-label text-lime">What We Offer</span>
          <h2 className="text-headline-lg">Premium Services,<br />Daily Delivered</h2>
          <p className="text-body-lg text-secondary" style={{ maxWidth: 560, margin: '0 auto' }}>
            From a quick exterior clean to a full detailing — choose the level of care your car deserves.
          </p>
        </div>

        <div className="services-grid">
          {services.map((s, i) => (
            <div key={i} className={`service-card glass reveal ${s.className || ''}`} style={{ transitionDelay: `${i * 80}ms` }}>
              <div className="service-icon" style={{ color: s.color }}>
                <s.icon size={28} strokeWidth={1.5} />
              </div>
              <div className="service-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                <h3 className="service-title">{s.title}</h3>
                <p className="text-body-sm text-secondary" style={{ marginTop: '4px' }}>{s.desc}</p>
              </div>
              <div className="service-line" style={{ background: s.color }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
