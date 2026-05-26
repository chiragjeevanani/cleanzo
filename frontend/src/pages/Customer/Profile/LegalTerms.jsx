import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function TermsOfService() {
  const navigate = useNavigate()
  const [termsData, setTermsData] = useState({
    lastUpdated: 'October 2023',
    sections: [
      { id: 1, title: '1. Acceptance of Terms', content: 'By accessing and using the Cleanzo application and services, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not use our services. These terms constitute a legally binding agreement between you and Cleanzo.' },
      { id: 2, title: '2. Service Description', content: 'Cleanzo provides premium mobile car detailing and dedicated daily doorstep cleaning services. Our service includes exterior cleaning, with interior vacuuming and specialized treatments available as add-ons. We reserve the right to refuse service to any vehicle that poses a health or safety risk or is in a condition that prevents safe cleaning.' },
      { id: 3, title: '3. User Obligations', content: 'You are responsible for providing accurate location data and ensuring that your vehicle is parked in a location where our executives can safely perform the service. You must also ensure that all windows and doors are fully closed prior to the scheduled service time.' },
      { id: 4, title: '4. Service Availability & External Factors', content: 'Cleanzo strives to provide 365-day service. However, services may be temporarily suspended due to external factors beyond our control, including heavy rain, curfew/lockdown restrictions, or election day regulations. In such cases, missed service days are automatically added back to subscription validity.' },
      { id: 5, title: '5. Leave Policy', content: 'Our cleaning staff is entitled to one scheduled leave per month. This day is already factored into our competitive pricing model and will not be added back to your subscription validity. Any additional leaves taken by the staff beyond this will be credited back to your account.' },
      { id: 6, title: '6. Liability & Damages', content: 'While we take the utmost care, Cleanzo is not liable for pre-existing damage, loose parts, mechanical issues, or internal electronic failures. We recommend securing or removing all valuables from the vehicle prior to service. Any claims for damage must be reported within 24 hours of service completion.' }
    ]
  })

  useEffect(() => {
    const cached = localStorage.getItem('cleanzo_cms_terms')
    if (cached) {
      try {
        setTermsData(JSON.parse(cached))
      } catch (e) {
        console.error(e)
      }
    }
  }, [])
  
  return (
    <div style={{ padding: '0 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="app-header" style={{ padding: '16px 0', marginBottom: 12 }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-8" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>
          <ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Terms of Service</span>
        </button>
      </div>

      <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius)', marginBottom: 100 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Cleanzo Terms of Service</h2>
        <p className="text-secondary text-body-sm" style={{ marginBottom: 24 }}>Last Updated: {termsData.lastUpdated}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {termsData.sections.map(section => (
            <section key={section.id}>
              <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: 'var(--text-accent)' }}>{section.title}</h3>
              <p className="text-secondary text-body-sm" style={{ lineHeight: 1.6 }}>{section.content}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
