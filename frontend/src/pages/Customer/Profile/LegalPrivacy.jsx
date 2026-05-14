import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicy() {
  const isAuthed = localStorage.getItem('cleanzo_authed') === 'true'

  return (
    <div style={{ padding: '0 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="app-header" style={{ padding: '16px 0', marginBottom: 12 }}>
        <Link to={isAuthed ? "/customer/profile" : "/"} className="flex items-center gap-8">
          <ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Privacy Policy</span>
        </Link>
      </div>

      <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius)', marginBottom: 100 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Privacy Policy</h2>
        <p className="text-secondary text-body-sm" style={{ marginBottom: 24 }}>Last Updated: October 2023</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section>
            <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: 'var(--primary-blue)' }}>1. Information Collection</h3>
            <p className="text-secondary text-body-sm" style={{ lineHeight: 1.6 }}>We collect personal information that you provide to us, including your name, email address, phone number, vehicle details (make, model, color, and license plate), and service addresses. We also collect payment information through our secure third-party payment processors.</p>
          </section>

          <section>
            <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: 'var(--primary-blue)' }}>2. Usage of Data</h3>
            <p className="text-secondary text-body-sm" style={{ lineHeight: 1.6 }}>Your data is used primarily to facilitate the car cleaning services you request. This includes dispatching executives, processing payments, providing service updates via push notifications or SMS, and improving our internal logistics and customer support experiences.</p>
          </section>

          <section>
            <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: 'var(--primary-blue)' }}>3. Location & GPS Tracking</h3>
            <p className="text-secondary text-body-sm" style={{ lineHeight: 1.6 }}>Cleanzo requires access to your location data to ensure our service executives can locate your vehicle accurately in parking lots or residential complexes. This data is only accessed when a service is scheduled or active and is never sold to third parties.</p>
          </section>

          <section>
            <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: 'var(--primary-blue)' }}>4. Data Sharing & Third Parties</h3>
            <p className="text-secondary text-body-sm" style={{ lineHeight: 1.6 }}>We do not sell your personal data. We share information only with trusted partners necessary for service delivery, such as payment gateways and map service providers. We may also disclose information if required by law or to protect our rights and safety.</p>
          </section>

          <section>
            <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: 'var(--primary-blue)' }}>5. Your Rights & Choices</h3>
            <p className="text-secondary text-body-sm" style={{ lineHeight: 1.6 }}>You have the right to access, correct, or delete your personal information through the account settings in the app. You can also opt-out of marketing communications at any time, though you will still receive essential service-related notifications.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
