import { Droplets, SprayCan, Sparkles, ShieldCheck, Wind, Gem } from 'lucide-react'
import './ServicesSection.css'

const services = [
  { icon: Droplets, title: 'Exterior Wash', desc: 'High-pressure rinse, foam treatment, and hand dry for a showroom-grade finish every morning.', color: 'var(--primary-blue)' },
  { icon: SprayCan, title: 'Interior Detailing', desc: 'Deep vacuum, dashboard polish, seat conditioning, and air freshener for a cabin that feels new.', color: 'var(--accent-lime)' },
  { icon: Sparkles, title: 'Ceramic Coating', desc: 'Nano-ceramic spray shield that repels water, dust, and UV damage between full detail sessions.', color: 'var(--primary-blue)' },
  { icon: ShieldCheck, title: 'Paint Protection', desc: 'Wax sealant and scratch-guard treatment to maintain your car\'s factory finish.', color: 'var(--accent-lime)' },
  { icon: Wind, title: 'Engine Bay Rinse', desc: 'Controlled low-pressure wash and degreasing of engine components for peak performance.', color: 'var(--primary-blue)' },
  { icon: Gem, title: 'Elite Care Package', desc: 'Our flagship all-inclusive service. Everything above plus leather treatment and wheel detailing.', color: 'var(--accent-lime)' },
]

export default function ServicesSection() {
  return (
    <section className="landing-section services-section" id="services">
      <div className="container">
        <div className="section-header reveal">
          <span className="text-label text-lime">What We Offer</span>
          <h2 className="text-headline-lg">Premium Services,<br />Daily Delivered</h2>
          <p className="text-body-lg text-secondary" style={{ maxWidth: 560, margin: '0 auto' }}>
            From a quick exterior wash to a full elite detail — choose the level of care your car deserves.
          </p>
        </div>

        <div className="services-grid">
          {services.map((s, i) => (
            <div key={i} className="service-card glass reveal" style={{ transitionDelay: `${i * 80}ms` }}>
              <div className="service-icon" style={{ color: s.color }}>
                <s.icon size={28} strokeWidth={1.5} />
              </div>
              <h3 className="service-title">{s.title}</h3>
              <p className="text-body-sm text-secondary">{s.desc}</p>
              <div className="service-line" style={{ background: s.color }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
