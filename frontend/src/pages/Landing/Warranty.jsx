import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, HelpCircle, Award, FileText } from 'lucide-react'

export default function Warranty() {
  const navigate = useNavigate()
  const [warrantyData, setWarrantyData] = useState({
    heroTitle: 'Premium Warranty Policy',
    heroDescription: 'Engineered for elite endurance. Every premium detail and daily maintenance plan is backed by our high-performance execution guarantee.',
    sections: [
      {
        id: 1,
        title: '1. Detail & Coating Warranty',
        content: 'All professional restorations and advanced exterior ceramic protections applied by our specialists are covered for material integrity and craftsmanship:',
        bullets: [
          'Coatings Longevity: High-performance coatings are guaranteed to maintain high-hydrophobicity and gloss rating for up to 3 years.',
          'Zero Flaking Policy: Coverage against premature sealant degradation, hazing, or product micro-flaking under normal environmental conditions.',
          'Finish Guard: Absolute guarantee against detailing-induced marring, swirl marks, or paint damage during correction treatments.'
        ]
      },
      {
        id: 2,
        title: '2. Subscription Service Guarantee',
        content: 'For our daily doorstep cleaning plan subscribers, we ensure absolute consistency:',
        bullets: [
          'Weather Protection: Standard suspension due to weather (e.g. intense downpours) guarantees subscription extension. All missed sessions are automatically rolled back into your schedule.',
          'Execution Review: If you notice an oversight in our cleaning execution, report it in the Cleanzo mobile app within 12 hours for prompt rectifications or service credits.',
          'Staff Availability: Backed by standby detailing hubs to ensure replacement crews are mobilized seamlessly.'
        ]
      },
      {
        id: 3,
        title: '3. Claims & Resolution Process',
        content: 'Need validation or want to initiate a warranty review? Submit a claim through the support hub inside your Client Login Portal, upload photos of the affected section, and our inspection crew will review the telemetry within 24 hours. Alternatively, reach our support team directly at support@cleanzo.net.',
        bullets: []
      }
    ]
  })

  useEffect(() => {
    const cached = localStorage.getItem('cleanzo_cms_warranty')
    if (cached) {
      try {
        setWarrantyData(JSON.parse(cached))
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  return (
    <div style={{ padding: '0 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* App Header */}
      <div className="app-header" style={{ padding: '16px 0', marginBottom: 12 }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-8 bg-transparent border-none text-[color:var(--text-primary)] cursor-pointer p-0">
          <ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Warranty Coverage</span>
        </button>
      </div>

      <div className="container" style={{ maxWidth: '800px', margin: '0 auto 100px auto', width: '100%' }}>
        {/* Main Header */}
        <div className="glass" style={{ padding: '32px', borderRadius: 'var(--radius)', marginBottom: 24, textAlign: 'center' }}>
          <div style={{ color: 'var(--primary-blue)', display: 'inline-block', marginBottom: 16 }}><Award size={48} /></div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
            {warrantyData.heroTitle}
          </h2>
          <p className="text-secondary text-body-md" style={{ maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
            {warrantyData.heroDescription}
          </p>
        </div>

        {/* Coverage Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {warrantyData.sections.map((section, idx) => {
            const Icon = idx === 0 ? ShieldCheck : idx === 1 ? FileText : HelpCircle
            return (
              <section key={section.id} className="glass" style={{ padding: '24px', borderRadius: 'var(--radius)' }}>
                <h3 style={{ fontWeight: 600, fontSize: 18, marginBottom: 12, color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={20} /> {section.title}
                </h3>
                <p className="text-secondary text-body-sm" style={{ lineHeight: 1.6, marginBottom: section.bullets.length > 0 ? 12 : 0 }}>
                  {section.content}
                </p>
                {section.bullets.length > 0 && (
                  <ul className="text-secondary text-body-sm" style={{ paddingLeft: 20, listStyleType: 'disc', display: 'flex', flexDirection: 'column', gap: 6, lineHeight: 1.5 }}>
                    {section.bullets.map((bullet, bulletIdx) => (
                      <li key={bulletIdx}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
