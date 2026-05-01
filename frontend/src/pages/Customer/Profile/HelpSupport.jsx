import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Search, ChevronDown, ChevronUp, MessageCircle, PhoneCall } from 'lucide-react'

export default function HelpSupport() {
  const [search, setSearch] = useState('')
  const [openFaq, setOpenFaq] = useState(null)

  const faqs = [
    { id: 1, q: 'How do I reschedule a cleaning?', a: 'You can reschedule any cleaning up to 12 hours before the scheduled time by navigating to your Service History and tapping "Reschedule".' },
    { id: 2, q: 'What happens if it rains?', a: 'If inclement weather prevents us from servicing your vehicle, we will automatically credit your account for a skipped service or offer a free reschedule.' },
    { id: 3, q: 'Are your cleaning products safe for ceramic coats?', a: 'Yes, all our chemicals are pH-neutral and completely safe for ceramic coatings, waxes, and factory clear coats.' },
    { id: 4, q: 'How do I change my subscription plan?', a: 'Navigate to the "Plans" tab in your app and select "Upgrade" or "Modify" on your current active plan.' }
  ]

  const filteredFaqs = faqs.filter(f => f.q.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ padding: '0 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="app-header" style={{ padding: '16px 0', marginBottom: 12 }}>
        <Link to="/customer/profile" className="flex items-center gap-8">
          <ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Help & Support</span>
        </Link>
      </div>

      <div className="glass" style={{ display: 'flex', alignItems: 'center', padding: '0 16px', borderRadius: 'var(--radius)', marginBottom: 24 }}>
        <Search size={18} className="text-secondary" />
        <input 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search for answers..." 
          style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '16px', width: '100%', outline: 'none' }}
        />
      </div>

      <div style={{ flex: 1 }}>
        <h3 className="text-label text-secondary" style={{ marginBottom: 16 }}>Frequently Asked Questions</h3>
        <div className="flex flex-col gap-12">
          {filteredFaqs.map(faq => (
            <div key={faq.id} className="glass" style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}>
              <div style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 500, fontSize: 15, paddingRight: 16 }}>{faq.q}</span>
                {openFaq === faq.id ? <ChevronUp size={18} className="text-secondary" /> : <ChevronDown size={18} className="text-secondary" />}
              </div>
              {openFaq === faq.id && (
                <div style={{ padding: '0 20px 20px', color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
          {filteredFaqs.length === 0 && (
            <div className="text-secondary text-center" style={{ padding: 40 }}>No articles found for "{search}"</div>
          )}
        </div>
      </div>

      <div style={{ padding: '32px 0 100px' }}>
        <h3 className="text-label text-secondary" style={{ marginBottom: 16 }}>Still need help?</h3>
        <div className="flex gap-12">
          <button className="btn glass flex-1 flex flex-col items-center justify-center gap-8" style={{ height: 100, border: '1px solid rgba(var(--accent-lime-rgb), 0.3)' }}>
            <MessageCircle size={24} style={{ color: 'var(--accent-lime)' }} />
            <span style={{ fontWeight: 600 }}>Live Chat</span>
          </button>
          <button className="btn glass flex-1 flex flex-col items-center justify-center gap-8" style={{ height: 100 }}>
            <PhoneCall size={24} style={{ color: 'var(--primary-blue)' }} />
            <span style={{ fontWeight: 600 }}>Call Us</span>
          </button>
        </div>
      </div>
    </div>
  )
}
