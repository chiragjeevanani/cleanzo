import PageLoader from '../../components/PageLoader'
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Share2, CheckCircle2, XCircle, ChevronRight, HelpCircle, Star, Plus, Minus } from 'lucide-react'
import apiClient from '../../services/apiClient'

export default function PlanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [pkg, setPkg] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPkg = async () => {
      try {
        const res = await apiClient.get(`/packages/${id}`)
        setPkg(res.package)
      } catch (err) {
        console.error('Error fetching plan:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPkg()
  }, [id])

  if (loading) return <PageLoader />
  if (!pkg) return <div style={{ padding: 20, textAlign: 'center' }}>Plan not found</div>

  if (!pkg) return null

  const includes = pkg.features || []
  const doesNotInclude = [
    'Deep interior shampooing',
    'Engine bay detailing',
    'Paint correction',
    'Pet hair removal (Elite only)'
  ].filter(item => !(pkg.features || []).includes(item))

  const faqs = [
    { q: 'What are the service timings?', a: 'We work dedicatedly from 5:00 AM to 10:00 AM every morning so your car is ready before you leave for work.' },
    { q: 'Do you work on Sundays/Holidays?', a: 'Yes! We work 365 days a year, including all public holidays and festivals. No leaves, no excuses.' },
    { q: 'Is interior cleaning included?', a: 'Our standard plans focus on daily exterior cleaning. Interior deep cleaning and detailing are available as flexible add-ons.' },
    { q: 'How does the prepaid model work?', a: 'You pay for the month in advance. We provide doorstep service daily without any follow-ups required.' }
  ]

  // Map package to specific images
  const pkgImages = {
    1: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?q=80&w=2831&auto=format&fit=crop',
    2: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?q=80&w=2942&auto=format&fit=crop',
    3: 'https://images.unsplash.com/photo-1552933529-e359b24772ff?q=80&w=2940&auto=format&fit=crop'
  }

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', paddingBottom: 100 }}>
      {/* Banner */}
      <div style={{ position: 'relative', height: 260, width: '100%', overflow: 'hidden' }}>
        <img 
          src={pkgImages[pkg.id] || pkgImages[2]} 
          alt={pkg.name} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
          <button onClick={() => navigate(-1)} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
            <ArrowLeft size={20} />
          </button>
          <button style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
            <Share2 size={20} />
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 20px' }}>
        <div className="flex justify-between items-start" style={{ marginBottom: 8 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>{pkg.name}</h1>
          <div className="flex flex-col items-end">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--accent-lime)' }}>₹{pkg.price}</div>
            <div className="text-secondary text-body-sm" style={{ textDecoration: 'line-through' }}>₹{Math.round(pkg.price * 1.2)}</div>
          </div>
        </div>

        <div className="flex items-center gap-4" style={{ marginBottom: 24 }}>
          <Star size={16} fill="var(--warning)" color="var(--warning)" />
          <span style={{ fontWeight: 600 }}>4.9</span>
          <span className="text-secondary text-body-sm">(27.8k ratings)</span>
        </div>

        <div className="divider" style={{ marginBottom: 32 }} />

        {/* Includes */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Includes</h2>
          <div className="flex flex-col gap-12">
            {includes.map((item, i) => (
              <div key={i} className="flex gap-12 items-start">
                <CheckCircle2 size={20} style={{ color: 'var(--success)', flexShrink: 0 }} />
                <span className="text-secondary" style={{ fontSize: 15 }}>{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Does not include */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Does not include</h2>
          <div className="flex flex-col gap-12">
            {doesNotInclude.map((item, i) => (
              <div key={i} className="flex gap-12 items-start">
                <XCircle size={20} style={{ color: 'var(--error)', opacity: 0.6, flexShrink: 0 }} />
                <span className="text-secondary" style={{ fontSize: 15 }}>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="divider" style={{ marginBottom: 32 }} />

        {/* How it's done */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>How it's done?</h2>
          <div className="flex flex-col gap-20">
            {[
              { title: 'Vehicle Inspection', desc: 'Detailer arrives and performs a 360° photo inspection of your car.', icon: 'https://cdn-icons-png.flaticon.com/128/1532/1532692.png' },
              { title: 'Precision Cleaning', desc: 'Eco-friendly waterless cleaning using nanotech surfactants.', icon: 'https://cdn-icons-png.flaticon.com/128/2330/2330453.png' },
              { title: 'Finishing Touches', desc: 'Application of tire dresser and high-gloss spray wax.', icon: 'https://cdn-icons-png.flaticon.com/128/2910/2910791.png' },
            ].map((step, i) => (
              <div key={i} className="flex gap-16 items-center">
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-glass)', padding: 10 }}>
                  <img src={step.icon} alt={step.title} style={{ width: '100%', height: '100%', opacity: 0.8 }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{step.title}</div>
                  <div className="text-secondary text-body-sm">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="divider" style={{ marginBottom: 32 }} />

        {/* FAQs */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>FAQs</h2>
          <div className="flex flex-col gap-8">
            {faqs.map((faq, i) => (
              <div key={i} className="glass" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 500 }}>{faq.q}</span>
                <Plus size={18} className="text-secondary" />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Floating Bottom Button */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: 'var(--bg-primary)', borderTop: '1px solid var(--border-glass)', zIndex: 100, maxWidth: 480, margin: '0 auto' }}>
        <Link to="/customer/booking" className="btn btn-primary w-full btn-lg">
          Subscribe to {pkg.name}
        </Link>
      </div>
    </div>
  )
}
