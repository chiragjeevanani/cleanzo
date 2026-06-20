import { useState, useEffect, useRef } from 'react'
import { FileText, HelpCircle, Save, Plus, Trash2, CheckCircle, RefreshCw, Star, MapPin, Image, Eye, Loader2, Globe, ExternalLink, X, Send, Package, Shield, Headphones, MessageCircle, PhoneCall, Mail } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import FaqsManager from './FaqsManager'
import TestimonialsManager from './TestimonialsManager'
import LandingPlansManager from './LandingPlansManager'
import apiClient from '../../services/apiClient'

export default function AdminCMS() {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('terms')

  // --- Terms of Service State ---
  const [termsData, setTermsData] = useState({
    lastUpdated: 'October 2023',
    sections: [
      { id: 1, title: '1. Acceptance of Terms', content: 'By accessing and using the Cleanzo application and services, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not use our services. These terms constitute a legally binding agreement between you and Cleanzo.' },
      { id: 2, title: '2. Service Description', content: 'Cleanzo provides premium mobile car detailing and daily doorstep cleaning services. Our service includes exterior cleaning, with interior vacuuming and specialized treatments available as add-ons. We reserve the right to refuse service to any vehicle that poses a health or safety risk or is in a condition that prevents safe cleaning.' },
      { id: 3, title: '3. User Obligations', content: 'You are responsible for providing accurate location data and ensuring that your vehicle is parked in a location where our executives can safely perform the service. You must also ensure that all windows and doors are fully closed prior to the scheduled service time.' },
      { id: 4, title: '4. Service Availability & External Factors', content: 'Cleanzo strives to provide 365-day service. However, services may be temporarily suspended due to external factors beyond our control, including heavy rain, curfew/lockdown restrictions, or election day regulations. In such cases, missed service days are automatically added back to subscription validity.' },
      { id: 5, title: '5. Leave Policy', content: 'Our cleaning staff is entitled to one scheduled leave per month. This day is already factored into our competitive pricing model and will not be added back to your subscription validity. Any additional leaves taken by the staff beyond this will be credited back to your account.' },
      { id: 6, title: '6. Liability & Damages', content: 'While we take the utmost care, Cleanzo is not liable for pre-existing damage, loose parts, mechanical issues, or internal electronic failures. We recommend securing or removing all valuables from the vehicle prior to service. Any claims for damage must be reported within 24 hours of service completion.' }
    ]
  })

  // --- Privacy Policy State ---
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

  // --- Support Contact State ---
  const [supportData, setSupportData] = useState({
    whatsapp: '919555860362',
    phone: '+919555860362',
    email: 'hello@trycleanzo.com',
    address: 'Flat no 1603, Tower C1, Redicon Vedantam, noida, IN'
  })

  // --- Trusted Societies State ---
  const [societiesData, setSocietiesData] = useState({ heading: 'TRUSTED BY RESIDENTS OF', items: [] })
  const [loadingSocieties, setLoadingSocieties] = useState(false)
  const [savingSocieties, setSavingSocieties] = useState(false)

  const [loadingSupport, setLoadingSupport] = useState(false)
  const [savingSupport, setSavingSupport] = useState(false)

  const [loadingTerms, setLoadingTerms] = useState(false)
  const [savingTerms, setSavingTerms] = useState(false)
  const [loadingPrivacy, setLoadingPrivacy] = useState(false)
  const [savingPrivacy, setSavingPrivacy] = useState(false)

  // --- Banners State ---
  const [banners, setBanners] = useState([])
  const [loadingBanners, setLoadingBanners] = useState(true)
  const [bannerForm, setBannerForm] = useState({ title: '', description: '', imageUrl: '', link: '' })
  const [uploadingImage, setUploadingImage] = useState(false)
  const [publishingBanner, setPublishingBanner] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef(null)

  // Legal Content (Terms / Privacy) Fetch & Save
  const fetchLegalContent = async (type) => {
    const setLoading = type === 'terms' ? setLoadingTerms : setLoadingPrivacy
    const setData = type === 'terms' ? setTermsData : setPrivacyData
    setLoading(true)
    try {
      const res = await apiClient.get(`/admin/legal/${type}`)
      setData(res.data)
    } catch (err) {
      console.error(`Failed to fetch ${type} content:`, err)
    } finally {
      setLoading(false)
    }
  }

  // Dynamic Banners Fetch
  const fetchBanners = async () => {
    try {
      const res = await apiClient.get('/admin/banners')
      setBanners(res.banners || [])
    } catch (err) {
      console.error('Failed to fetch banners:', err)
    } finally {
      setLoadingBanners(false)
    }
  }

  // Support Contacts Fetch & Save
  const fetchSupportContacts = async () => {
    setLoadingSupport(true)
    try {
      const res = await apiClient.get('/admin/support-contacts')
      setSupportData(res.data)
    } catch (err) {
      console.error('Failed to fetch support contacts:', err)
    } finally {
      setLoadingSupport(false)
    }
  }

  // Trusted Societies Fetch & Save
  const fetchSocieties = async () => {
    setLoadingSocieties(true)
    try {
      const res = await apiClient.get('/admin/trusted-societies')
      setSocietiesData(res.data)
    } catch (err) {
      console.error('Failed to fetch trusted societies:', err)
    } finally {
      setLoadingSocieties(false)
    }
  }

  const saveSocieties = async () => {
    const containsAlphanumeric = (str) => /^(?=.*[a-zA-Z0-9]).+$/.test(str);
    if (!societiesData.heading || !containsAlphanumeric(societiesData.heading)) {
      showToast('Society heading cannot consist of only special characters', 'error')
      return
    }
    const filteredItems = societiesData.items.filter(s => s.trim() !== '')
    if (filteredItems.length === 0 && societiesData.items.length > 0) {
      showToast('Please enter at least one society name before saving.', 'error')
      return
    }
    if (filteredItems.some(s => !containsAlphanumeric(s))) {
      showToast('Society names cannot consist of only special characters', 'error')
      return
    }
    const payload = { ...societiesData, items: filteredItems }
    setSocietiesData(payload)
    setSavingSocieties(true)
    try {
      await apiClient.put('/admin/trusted-societies', payload)
      showToast('Trusted Societies updated! Changes are now live on the website.', 'success')
    } catch (err) {
      showToast(err?.message || 'Failed to save trusted societies', 'error')
    } finally {
      setSavingSocieties(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'banners') {
      fetchBanners()
    }
    if (activeTab === 'societies') {
      fetchSocieties()
    }
    if (activeTab === 'support') {
      fetchSupportContacts()
    }
    if (activeTab === 'terms') {
      fetchLegalContent('terms')
    }
    if (activeTab === 'privacy') {
      fetchLegalContent('privacy')
    }
  }, [activeTab])


  const handleImageSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadingImage(true)
    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await apiClient.uploadForm('/admin/upload', formData)
      setBannerForm({ ...bannerForm, imageUrl: res.imageUrl || res.url })
      showToast('Image uploaded successfully', 'success')
    } catch (err) {
      showToast(err?.message || 'Failed to upload image', 'error')
    } finally {
      setUploadingImage(false)
    }
  }

  const handlePublishBanner = async () => {
    if (!bannerForm.title || !bannerForm.imageUrl) {
      showToast('Title and Image are required', 'error')
      return
    }

    const containsAlphanumeric = (str) => /^(?=.*[a-zA-Z0-9]).+$/.test(str);
    if (!containsAlphanumeric(bannerForm.title)) {
      showToast('Banner title cannot consist of only special characters', 'error')
      return
    }

    if (bannerForm.link) {
      const pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
        '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
      if (!pattern.test(bannerForm.link) && !bannerForm.link.startsWith('/')) {
        showToast('Target link must be a valid URL (e.g. https://example.com)', 'error')
        return
      }
    }

    setPublishingBanner(true)
    try {
      await apiClient.post('/admin/banners', bannerForm)
      showToast('Banner published successfully!', 'success')
      setBannerForm({ title: '', description: '', imageUrl: '', link: '' })
      fetchBanners()
    } catch (err) {
      showToast(err?.message || 'Failed to publish banner', 'error')
    } finally {
      setPublishingBanner(false)
    }
  }

  const handleDeleteBanner = async (id) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return
    try {
      await apiClient.delete(`/admin/banners/${id}`)
      showToast('Banner deleted', 'success')
      fetchBanners()
    } catch (err) {
      showToast('Failed to delete banner', 'error')
    }
  }

  // --- Save Handlers ---
  const saveTerms = async () => {
    setSavingTerms(true)
    try {
      await apiClient.put('/admin/legal/terms', termsData)
      showToast('Terms of Service saved! Changes are now live on the website.', 'success')
    } catch (err) {
      showToast(err?.message || 'Failed to save Terms of Service', 'error')
    } finally {
      setSavingTerms(false)
    }
  }

  const savePrivacy = async () => {
    setSavingPrivacy(true)
    try {
      await apiClient.put('/admin/legal/privacy', privacyData)
      showToast('Privacy Policy saved! Changes are now live on the website.', 'success')
    } catch (err) {
      showToast(err?.message || 'Failed to save Privacy Policy', 'error')
    } finally {
      setSavingPrivacy(false)
    }
  }

  const saveSupport = async () => {
    if (supportData.phone.length !== 10) {
      showToast('Call number must be exactly 10 digits', 'error')
      return
    }
    if (supportData.whatsapp.length !== 10) {
      showToast('WhatsApp number must be exactly 10 digits', 'error')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!supportData.email || !emailRegex.test(supportData.email.trim())) {
      showToast('Please enter a valid support email address', 'error')
      return
    }
    const containsAlphanumeric = (str) => /^(?=.*[a-zA-Z0-9]).+$/.test(str);
    if (!containsAlphanumeric(supportData.address)) {
      showToast('Address cannot consist of only special characters', 'error')
      return
    }
    setSavingSupport(true)
    try {
      await apiClient.put('/admin/support-contacts', supportData)
      showToast('Support contact details saved! Changes are now live on the website.', 'success')
    } catch (err) {
      showToast(err?.message || 'Failed to save support contacts', 'error')
    } finally {
      setSavingSupport(false)
    }
  }


  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>CMS</h1>
        <p className="text-secondary" style={{ fontSize: 14, marginTop: 4 }}>
          Content Management System for managing public information, legal terms, policies, and FAQs
        </p>
      </div>

      {/* Subsection Tabs */}
      <div className="flex gap-8" style={{ marginBottom: 28, borderBottom: '1px solid var(--divider)', paddingBottom: 0 }}>
        {[
          { id: 'terms', icon: FileText, label: 'Terms of Service' },
          { id: 'privacy', icon: Shield, label: 'Privacy Policy' },
          { id: 'support', icon: Headphones, label: 'Support' },
          { id: 'societies', icon: MapPin, label: 'Trusted Societies' },
          { id: 'banners', icon: Image, label: 'Banners' },
          { id: 'landingPlans', icon: Package, label: 'Landing Page Plans' },
          { id: 'reviews', icon: Star, label: 'Reviews' },
          { id: 'faqs', icon: HelpCircle, label: 'FAQs' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 18px',
              fontSize: 14,
              fontWeight: 600,
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-lime)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
              marginBottom: -1,
              transition: 'all 0.2s',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Subsections Content */}
      <div className="glass-solid animate-fade-in" style={{ padding: '32px', borderRadius: 'var(--radius)' }}>
        
        {/* --- 1. TERMS OF SERVICE --- */}
        {activeTab === 'terms' && (
          <div>
            <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>Manage Terms of Service</h3>
              <button onClick={saveTerms} disabled={savingTerms || loadingTerms} className="btn btn-primary btn-sm flex items-center gap-8">
                {savingTerms ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {savingTerms ? 'Saving...' : 'Save Terms'}
              </button>
            </div>

            <div className="flex flex-col gap-24">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 300 }}>
                <label className="text-label" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Last Updated Date</label>
                <input
                  type="text"
                  className="input-field"
                  value={termsData.lastUpdated}
                  onChange={e => setTermsData({ ...termsData, lastUpdated: e.target.value })}
                />
              </div>

              <div className="divider" style={{ margin: '12px 0' }} />

              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>Sections</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {termsData.sections.map((section, idx) => (
                  <div key={section.id} className="glass" style={{ padding: 20, borderRadius: 'var(--radius-sm)', position: 'relative' }}>
                    <button
                      onClick={() => {
                        const filtered = termsData.sections.filter(s => s.id !== section.id)
                        setTermsData({ ...termsData, sections: filtered })
                      }}
                      style={{ position: 'absolute', top: 16, right: 16, color: 'var(--error)', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <input
                        type="text"
                        className="input-field"
                        style={{ fontWeight: 600, fontSize: 14, border: 'none', background: 'rgba(255,255,255,0.02)' }}
                        value={section.title}
                        onChange={e => {
                          const updated = [...termsData.sections]
                          updated[idx].title = e.target.value
                          setTermsData({ ...termsData, sections: updated })
                        }}
                      />
                      <textarea
                        className="input-field"
                        rows={3}
                        style={{ fontSize: 13, resize: 'vertical' }}
                        value={section.content}
                        onChange={e => {
                          const updated = [...termsData.sections]
                          updated[idx].content = e.target.value
                          setTermsData({ ...termsData, sections: updated })
                        }}
                      />
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => {
                    const newSection = { id: Date.now(), title: `${termsData.sections.length + 1}. New Policy Term`, content: 'Enter the contents here...' }
                    setTermsData({ ...termsData, sections: [...termsData.sections, newSection] })
                  }}
                  className="btn btn-glass btn-sm"
                  style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Plus size={14} /> Add New Term
                </button>
              </div>
            </div>
          </div>
        )}






        {/* --- 2. PRIVACY POLICY --- */}
        {activeTab === 'privacy' && (
          <div>
            <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>Manage Privacy Policy</h3>
                <p className="text-secondary" style={{ fontSize: 13, marginTop: 4 }}>
                  Content shown on the public Privacy Policy page linked in the website footer.
                </p>
              </div>
              <button onClick={savePrivacy} disabled={savingPrivacy || loadingPrivacy} className="btn btn-primary btn-sm flex items-center gap-8">
                {savingPrivacy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {savingPrivacy ? 'Saving...' : 'Save Privacy Policy'}
              </button>
            </div>

            <div className="flex flex-col gap-24">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 300 }}>
                <label className="text-label" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Last Updated Date</label>
                <input
                  type="text"
                  className="input-field"
                  value={privacyData.lastUpdated}
                  onChange={e => setPrivacyData({ ...privacyData, lastUpdated: e.target.value })}
                />
              </div>

              <div className="divider" style={{ margin: '12px 0' }} />

              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>Sections</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {privacyData.sections.map((section, idx) => (
                  <div key={section.id} className="glass" style={{ padding: 20, borderRadius: 'var(--radius-sm)', position: 'relative' }}>
                    <button
                      onClick={() => {
                        const filtered = privacyData.sections.filter(s => s.id !== section.id)
                        setPrivacyData({ ...privacyData, sections: filtered })
                      }}
                      style={{ position: 'absolute', top: 16, right: 16, color: 'var(--error)', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <input
                        type="text"
                        className="input-field"
                        style={{ fontWeight: 600, fontSize: 14, border: 'none', background: 'rgba(255,255,255,0.02)' }}
                        value={section.title}
                        onChange={e => {
                          const updated = [...privacyData.sections]
                          updated[idx].title = e.target.value
                          setPrivacyData({ ...privacyData, sections: updated })
                        }}
                      />
                      <textarea
                        className="input-field"
                        rows={3}
                        style={{ fontSize: 13, resize: 'vertical' }}
                        value={section.content}
                        onChange={e => {
                          const updated = [...privacyData.sections]
                          updated[idx].content = e.target.value
                          setPrivacyData({ ...privacyData, sections: updated })
                        }}
                      />
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => {
                    const newSection = { id: Date.now(), title: `${privacyData.sections.length + 1}. New Privacy Clause`, content: 'Enter the contents here...' }
                    setPrivacyData({ ...privacyData, sections: [...privacyData.sections, newSection] })
                  }}
                  className="btn btn-glass btn-sm"
                  style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Plus size={14} /> Add New Clause
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- 3. SUPPORT --- */}
        {activeTab === 'support' && (
          <div>
            <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>Manage Support Contacts</h3>
                <p className="text-secondary" style={{ fontSize: 13, marginTop: 4 }}>
                  Contact channels shown on the public Support page linked in the website footer.
                </p>
              </div>
              <button onClick={saveSupport} disabled={savingSupport || loadingSupport} className="btn btn-primary btn-sm flex items-center gap-8">
                {savingSupport ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {savingSupport ? 'Saving...' : 'Save Support'}
              </button>
            </div>

            <div className="flex flex-col gap-24" style={{ maxWidth: 480 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label className="text-label flex items-center gap-8" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                  <MessageCircle size={14} /> WhatsApp Number
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. 9555860362"
                  value={supportData.whatsapp}
                  onChange={e => setSupportData({ ...supportData, whatsapp: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                />
                <span className="text-tertiary" style={{ fontSize: 11 }}>Include 10-digit number. Used for the wa.me chat link.</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label className="text-label flex items-center gap-8" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                  <PhoneCall size={14} /> Call Number
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. 9555860362"
                  value={supportData.phone}
                  onChange={e => setSupportData({ ...supportData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label className="text-label flex items-center gap-8" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                  <Mail size={14} /> Support Email
                </label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="e.g. hello@trycleanzo.com"
                  value={supportData.email}
                  onChange={e => setSupportData({ ...supportData, email: e.target.value.toLowerCase() })}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label className="text-label flex items-center gap-8" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                  <MapPin size={14} /> Address
                </label>
                <textarea
                  className="input-field"
                  rows={2}
                  style={{ resize: 'vertical' }}
                  placeholder="e.g. Flat no 1603, Tower C1, Redicon Vedantam, noida, IN"
                  value={supportData.address}
                  onChange={e => setSupportData({ ...supportData, address: e.target.value })}
                />
                <span className="text-tertiary" style={{ fontSize: 11 }}>Shown as plain text on the Support page.</span>
              </div>
            </div>
          </div>
        )}

        {/* --- 4. TRUSTED SOCIETIES --- */}
        {activeTab === 'societies' && (
          <div>
            <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>Manage Trusted Societies</h3>
                <p className="text-secondary" style={{ fontSize: 13, marginTop: 4 }}>
                  Societies listed here will appear live on the website's hero section for all users.
                </p>
              </div>
              <button
                onClick={saveSocieties}
                disabled={savingSocieties}
                className="btn btn-primary btn-sm flex items-center gap-8"
              >
                {savingSocieties ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {savingSocieties ? 'Saving...' : 'Save & Publish'}
              </button>
            </div>

            {loadingSocieties ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 24 }}>
                <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-lime)' }} />
                <span className="text-secondary">Loading...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-24">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400 }}>
                  <label className="text-label" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Section Heading Text</label>
                  <input
                    type="text"
                    className="input-field"
                    value={societiesData.heading}
                    onChange={e => setSocietiesData({ ...societiesData, heading: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="divider" style={{ margin: '4px 0' }} />

                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>
                  Societies List <span style={{ color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 400 }}>({societiesData.items.length} entries)</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {societiesData.items.map((society, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <MapPin size={16} style={{ color: 'var(--accent-lime)', flexShrink: 0 }} />
                      <input
                        type="text"
                        className="input-field"
                        style={{ fontSize: 13, padding: '10px 16px', fontWeight: 600 }}
                        value={society}
                        onChange={e => {
                          const updated = [...societiesData.items]
                          updated[idx] = e.target.value.toUpperCase()
                          setSocietiesData({ ...societiesData, items: updated })
                        }}
                      />
                      <button
                        onClick={() => {
                          const updated = societiesData.items.filter((_, sIdx) => sIdx !== idx)
                          setSocietiesData({ ...societiesData, items: updated })
                        }}
                        style={{ color: 'var(--error)', padding: 8, flexShrink: 0 }}
                        title="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => setSocietiesData({ ...societiesData, items: [...societiesData.items, ''] })}
                    className="btn btn-glass btn-sm"
                    style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Plus size={14} /> Add Society
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- 5. BANNERS --- */}
        {activeTab === 'banners' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-24">
            {/* Banner Editor */}
            <div className="lg:col-span-7 flex flex-col gap-24">
              <div>
                <div className="flex items-center gap-12" style={{ marginBottom: 24 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(163, 255, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-lime)' }}>
                    <Plus size={20} />
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>Create Offer Banner</h2>
                </div>

                <div className="flex flex-col gap-20">
                  <div className="flex flex-col gap-8">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.12em', fontWeight: 600 }}>BANNER TITLE *</label>
                    <input 
                      className="input-field" 
                      placeholder="e.g. 20% Off Elite Plan!" 
                      value={bannerForm.title}
                      onChange={e => setBannerForm({ ...bannerForm, title: e.target.value })}
                    />
                  </div>

                  <div className="flex flex-col gap-8">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.12em', fontWeight: 600 }}>DESCRIPTION</label>
                    <textarea 
                      className="input-field" 
                      rows={3} 
                      placeholder="Tell users about this offer..." 
                      style={{ resize: 'none' }}
                      value={bannerForm.description}
                      onChange={e => setBannerForm({ ...bannerForm, description: e.target.value })}
                    />
                  </div>

                  <div className="flex flex-col gap-8">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.12em', fontWeight: 600 }}>TARGET LINK (URL)</label>
                    <div style={{ position: 'relative' }}>
                      <Globe size={14} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                      <input 
                        className="input-field" 
                        style={{ paddingLeft: 44 }}
                        placeholder="https://cleanzo.in/offers/elite" 
                        value={bannerForm.link}
                        onChange={e => setBannerForm({ ...bannerForm, link: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-8">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.12em', fontWeight: 600 }}>BANNER IMAGE *</label>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      hidden 
                      accept="image/*" 
                      onChange={handleImageSelect} 
                    />
                    
                    {bannerForm.imageUrl ? (
                      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                        <img src={bannerForm.imageUrl} alt="Preview" style={{ width: '100%', height: 200, objectFit: 'cover' }} />
                        <button 
                          onClick={() => setBannerForm({ ...bannerForm, imageUrl: '' })}
                          style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => fileInputRef.current.click()}
                        className="glass flex flex-col items-center justify-center gap-12" 
                        style={{ padding: '48px 24px', borderRadius: 20, borderStyle: 'dashed', cursor: 'pointer', transition: 'all 0.2s' }}>
                        {uploadingImage ? (
                          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-lime)' }} />
                        ) : (
                          <>
                            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Image size={24} style={{ color: 'var(--text-tertiary)' }} />
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 14, fontWeight: 600 }}>Click to upload image</div>
                              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Recommended: 1200x400 (3:1 ratio)</div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-12" style={{ marginTop: 24 }}>
                    <button
                      className="btn btn-glass"
                      style={{ flex: 1, padding: '14px' }}
                      onClick={() => setShowPreview(!showPreview)}>
                      <Eye size={16} /> {showPreview ? 'Hide Preview' : 'Show Preview'}
                    </button>
                    <button 
                      className="btn btn-primary" 
                      style={{ flex: 1.5, padding: '14px' }}
                      disabled={publishingBanner || uploadingImage}
                      onClick={handlePublishBanner}>
                      {publishingBanner ? <><Loader2 size={16} className="animate-spin" /> Publishing...</> : <><Send size={16} /> Publish Banner</>}
                    </button>
                  </div>
                </div>
              </div>

              {/* Real-time Preview */}
              {showPreview && (
                <div className="animate-slide-up" style={{ marginTop: 24 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.12em', fontWeight: 600, marginBottom: 12, display: 'block' }}>LIVE PREVIEW</label>
                  <div className="glass" style={{ padding: 20, borderRadius: 24, background: 'linear-gradient(to bottom, rgba(255,255,255,0.05), transparent)' }}>
                    <div style={{ 
                      width: '100%', borderRadius: 20, overflow: 'hidden', position: 'relative', aspectRatio: '3/1',
                      background: bannerForm.imageUrl ? `url(${bannerForm.imageUrl}) center/cover no-repeat` : '#1a1a1a'
                    }}>
                      {!bannerForm.imageUrl && (
                        <div className="flex items-center justify-center h-full text-secondary" style={{ fontSize: 14 }}>
                          Add an image to see preview
                        </div>
                      )}
                      <div style={{ 
                        position: 'absolute', inset: 0, 
                        background: 'linear-gradient(90deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
                        padding: '24px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center'
                      }}>
                        <h3 style={{ fontSize: 24, fontWeight: 800, color: 'white', maxWidth: '60%', lineHeight: 1.2 }}>
                          {bannerForm.title || 'Your Banner Title Here'}
                        </h3>
                        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8, maxWidth: '50%' }}>
                          {bannerForm.description || 'Provide a compelling description for your offer.'}
                        </p>
                        <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start', marginTop: 16, padding: '8px 24px' }}>
                          Claim Offer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Active Banners List */}
            <div className="lg:col-span-5 flex flex-col gap-24">
              <div className="glass" style={{ padding: 32, borderRadius: 28 }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
                  <div className="flex items-center gap-12">
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Image size={20} />
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>Active Banners</h2>
                  </div>
                  <span className="chip chip-ghost" style={{ fontSize: 11 }}>{banners.length} TOTAL</span>
                </div>

                <div className="flex flex-col gap-12">
                  {loadingBanners ? (
                    <div className="flex flex-col items-center py-40 text-secondary">
                      <Loader2 className="animate-spin" style={{ marginBottom: 12 }} />
                      <span>Loading banners...</span>
                    </div>
                  ) : banners.length === 0 ? (
                    <div className="text-center py-40 text-secondary" style={{ fontSize: 14 }}>
                      No active banners found.
                    </div>
                  ) : banners.map(b => (
                    <div key={b._id} className="glass" style={{ padding: 12, borderRadius: 16, background: 'rgba(255,255,255,0.02)' }}>
                      <div className="flex gap-12">
                        <img src={b.imageUrl} alt="" style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                          <div className="text-secondary" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{b.description || 'No description'}</div>
                          <div className="flex items-center gap-12" style={{ marginTop: 6 }}>
                            <button className="text-error flex items-center gap-4" style={{ fontSize: 11, fontWeight: 600 }} onClick={() => handleDeleteBanner(b._id)}>
                              <Trash2 size={12} /> Delete
                            </button>
                            {b.link && (
                              <a href={b.link} target="_blank" rel="noreferrer" className="text-secondary flex items-center gap-4" style={{ fontSize: 11 }}>
                                <ExternalLink size={12} /> Link
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- 6. LANDING PLANS --- */}
        {activeTab === 'landingPlans' && (
          <div>
            <LandingPlansManager />
          </div>
        )}

        {/* --- 7. REVIEWS --- */}
        {activeTab === 'reviews' && (
          <div>
            <TestimonialsManager />
          </div>
        )}

        {/* --- 7. FAQS --- */}
        {activeTab === 'faqs' && (
          <div>
            <FaqsManager />
          </div>
        )}

      </div>
    </div>
  )
}
