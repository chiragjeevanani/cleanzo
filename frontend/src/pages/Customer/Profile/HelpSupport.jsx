import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, ChevronDown, ChevronUp, MessageCircle, PhoneCall, Mail, MapPin } from 'lucide-react'
import apiClient from '../../../services/apiClient'
import PageLoader from '../../../components/PageLoader'

export default function HelpSupport() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [openFaq, setOpenFaq] = useState(null)
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [support, setSupport] = useState({
    whatsapp: '919555860362',
    phone: '+919555860362',
    email: 'hello@trycleanzo.com',
    address: 'Flat no 1603, Tower C1, Redicon Vedantam, noida, IN'
  })

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const res = await apiClient.get('/public/faqs')
        setFaqs(res.faqs || [])
      } catch (err) {
        console.error('Failed to load FAQs:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchFaqs()

    const fetchSupport = async () => {
      try {
        const res = await apiClient.get('/public/support-contacts')
        if (res.data) setSupport(res.data)
      } catch (err) {
        console.error('Failed to load support contacts:', err)
      }
    }
    fetchSupport()
  }, [])

  const filteredFaqs = faqs.filter(f => f.question.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <PageLoader />

  return (
    <div style={{ padding: '0 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="app-header" style={{ padding: '16px 0', marginBottom: 12 }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-8 bg-transparent border-none text-[color:var(--text-primary)] cursor-pointer p-0">
          <ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Help & Support</span>
        </button>
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
            <div key={faq._id} className="glass" style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={() => setOpenFaq(openFaq === faq._id ? null : faq._id)}>
              <div style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 500, fontSize: 15, paddingRight: 16 }}>{faq.question}</span>
                {openFaq === faq._id ? <ChevronUp size={18} className="text-secondary" /> : <ChevronDown size={18} className="text-secondary" />}
              </div>
              {openFaq === faq._id && (
                <div style={{ padding: '0 20px 20px', color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
          {filteredFaqs.length === 0 && (
            <div className="text-secondary text-center" style={{ padding: 40 }}>No articles found for "{search}"</div>
          )}
        </div>
      </div>

      <div style={{ padding: '32px 0 0' }}>
        <h3 className="text-label text-secondary" style={{ marginBottom: 16 }}>Contact Information</h3>
        <div className="glass" style={{ padding: 20, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Mail size={18} style={{ color: 'var(--text-secondary)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Email</div>
              <div style={{ fontSize: 14, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{support.email}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <PhoneCall size={18} style={{ color: 'var(--text-secondary)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Phone</div>
              <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{support.phone}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <MapPin size={18} style={{ color: 'var(--text-secondary)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Address</div>
              <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 }}>{support.address}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '32px 0 100px' }}>
        <h3 className="text-label text-secondary" style={{ marginBottom: 16 }}>Still need help?</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="glass"
            style={{ flex: 1, minWidth: 0, height: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px solid rgba(var(--accent-lime-rgb), 0.3)', borderRadius: 16, cursor: 'pointer', color: 'var(--text-primary)' }}
            onClick={() => window.open(`https://wa.me/${(support.whatsapp || '').replace(/\D/g, '')}`, '_blank')}
          >
            <MessageCircle size={24} style={{ color: 'var(--text-accent)' }} />
            <span style={{ fontWeight: 600, fontSize: 13 }}>WhatsApp</span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{support.whatsapp}</span>
          </button>
          <button
            className="glass"
            style={{ flex: 1, minWidth: 0, height: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px solid var(--border-glass)', borderRadius: 16, cursor: 'pointer', color: 'var(--text-primary)' }}
            onClick={() => window.location.href = `tel:${(support.phone || '').replace(/\s/g, '')}`}
          >
            <PhoneCall size={24} style={{ color: 'var(--primary-blue)' }} />
            <span style={{ fontWeight: 600, fontSize: 13 }}>Call</span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{support.phone}</span>
          </button>
          <button
            className="glass"
            style={{ flex: 1, minWidth: 0, height: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px solid var(--border-glass)', borderRadius: 16, cursor: 'pointer', color: 'var(--text-primary)' }}
            onClick={() => window.location.href = `mailto:${support.email}`}
          >
            <Mail size={24} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontWeight: 600, fontSize: 13 }}>Email</span>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', wordBreak: 'break-all', textAlign: 'center', padding: '0 4px' }}>{support.email}</span>
          </button>
        </div>

        <button 
          className="btn btn-primary"
          onClick={() => navigate('/customer/grievance')}
          style={{ width: '100%', marginTop: 24, padding: '16px', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          File a Grievance
        </button>
      </div>
    </div>
  )
}
