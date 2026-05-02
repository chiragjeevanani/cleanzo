import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function TermsOfService() {
  return (
    <div style={{ padding: '0 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="app-header" style={{ padding: '16px 0', marginBottom: 12 }}>
        <Link to="/customer/profile" className="flex items-center gap-8">
          <ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Terms of Service</span>
        </Link>
      </div>

      <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius)', marginBottom: 100 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Cleanzo Terms of Service</h2>
        <p className="text-secondary text-body-sm" style={{ marginBottom: 24 }}>Last Updated: October 2023</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section>
            <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: 'var(--accent-lime)' }}>1. Acceptance of Terms</h3>
            <p className="text-secondary text-body-sm" style={{ lineHeight: 1.6 }}>By accessing and using the Cleanzo application and services, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not use our services. These terms constitute a legally binding agreement between you and Cleanzo.</p>
          </section>

          <section>
            <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: 'var(--accent-lime)' }}>2. Service Description</h3>
            <p className="text-secondary text-body-sm" style={{ lineHeight: 1.6 }}>Cleanzo provides premium mobile car detailing and dedicated daily doorstep cleaning services. Our service includes exterior cleaning, with interior vacuuming and specialized treatments available as add-ons. We reserve the right to refuse service to any vehicle that poses a health or safety risk or is in a condition that prevents safe cleaning.</p>
          </section>

          <section>
            <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: 'var(--accent-lime)' }}>3. User Obligations</h3>
            <p className="text-secondary text-body-sm" style={{ lineHeight: 1.6 }}>You are responsible for providing accurate location data and ensuring that your vehicle is parked in a location where our executives can safely perform the service. You must also ensure that all windows and doors are fully closed prior to the scheduled service time.</p>
          </section>

          <section>
            <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: 'var(--accent-lime)' }}>4. Payment & Subscriptions</h3>
            <p className="text-secondary text-body-sm" style={{ lineHeight: 1.6 }}>Subscription plans are billed automatically on a recurring monthly or annual basis. You may cancel your subscription at any time through the app settings, but no refunds or credits will be provided for partial months or unused service days.</p>
          </section>

          <section>
            <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: 'var(--accent-lime)' }}>5. Liability & Damages</h3>
            <p className="text-secondary text-body-sm" style={{ lineHeight: 1.6 }}>While we take the utmost care, Cleanzo is not liable for pre-existing damage, loose parts, mechanical issues, or internal electronic failures. We recommend securing or removing all valuables from the vehicle prior to service. Any claims for damage must be reported within 24 hours of service completion.</p>
          </section>

          <section>
            <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: 'var(--accent-lime)' }}>6. Termination of Service</h3>
            <p className="text-secondary text-body-sm" style={{ lineHeight: 1.6 }}>Cleanzo reserves the right to terminate or suspend your account and access to services at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to our interests or other users.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
