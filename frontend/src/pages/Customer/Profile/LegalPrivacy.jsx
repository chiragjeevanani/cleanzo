import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicy() {
  const navigate = useNavigate()
  const [privacyData, setPrivacyData] = useState({
    lastUpdated: 'October 2023',
    sections: [
      { id: 1, title: '1. Information Collection', content: 'We collect personal information that you provide to us, including your name, email address, phone number, vehicle details (make, model, color, and license plate), and service addresses. We also collect payment information through our secure third-party payment processors.' },
      { id: 2, title: '2. Usage of Data', content: 'Your data is used primarily to facilitate the car cleaning services you request. This includes dispatching executives, processing payments, providing service updates via push notifications or SMS, and improving our internal logistics and customer support experiences.' },
      { id: 3, title: '3. Location & GPS Tracking', content: 'Cleanzo requires access to your location data to ensure our service executives can locate your vehicle accurately in parking lots or residential complexes. This data is only accessed when a service is scheduled or active and is never sold to third parties.' },
      { id: 4, title: '4. Data Sharing & Third Parties', content: 'We do not sell your personal data. We share information only with trusted partners necessary for service delivery, such as payment gateways and map service providers. We may also disclose information if required by law or to protect our rights and safety.' },
      { id: 5, title: '5. Your Rights & Choices', content: 'You have the right to access, correct, or delete your personal information through the account settings in the app. You can also opt-out of marketing communications at any time, though you will still receive essential service-related notifications.' }
    ]
  })

  useEffect(() => {
    const cached = localStorage.getItem('cleanzo_cms_privacy')
    if (cached) {
      try {
        setPrivacyData(JSON.parse(cached))
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  return (
    <div style={{ padding: '0 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="app-header" style={{ padding: '16px 0', marginBottom: 12 }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-8 bg-transparent border-none text-[color:var(--text-primary)] cursor-pointer p-0">
          <ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Privacy Policy</span>
        </button>
      </div>

      <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius)', marginBottom: 100 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Privacy Policy</h2>
        <p className="text-secondary text-body-sm" style={{ marginBottom: 24 }}>Last Updated: {privacyData.lastUpdated}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {privacyData.sections.map(section => (
            <section key={section.id}>
              <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: 'var(--primary-blue)' }}>{section.title}</h3>
              <p className="text-secondary text-body-sm" style={{ lineHeight: 1.6 }}>{section.content}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
