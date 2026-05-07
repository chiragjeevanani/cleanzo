import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Search, ChevronDown, ChevronUp, MessageCircle, PhoneCall } from 'lucide-react'

export default function HelpSupport() {
  const [search, setSearch] = useState('')
  const [openFaq, setOpenFaq] = useState(null)
  const isAuthed = localStorage.getItem('cleanzo_authed') === 'true'

  const faqs = [
    { id: 1, q: 'What happens if it rains?', a: 'During heavy rain, we pause our services for safety. The missed day will be automatically added back to your subscription validity, extending your plan.' },
    { id: 2, q: 'Are services available during curfews or elections?', a: 'No, services are suspended during government-mandated curfews, lockdowns, or election days. All such missed days are credited back to your subscription.' },
    { id: 3, q: 'Why was my car not cleaned today?', a: 'Our cleaning staff is entitled to one scheduled leave per month. This is already accounted for in our pricing and will not be added to your validity. Check your notifications for any other reasons.' },
    { id: 4, q: 'How do I add interior cleaning to my plan?', a: 'Standard daily plans focus on exterior. You can purchase "Interior Deep Clean" as a one-time add-on from your dashboard anytime.' }
  ]

  const filteredFaqs = faqs.filter(f => f.q.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ padding: '0 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="app-header" style={{ padding: '16px 0', marginBottom: 12 }}>
        <Link to={isAuthed ? "/customer/profile" : "/"} className="flex items-center gap-8">
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
