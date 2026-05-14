import { useState, useEffect, useRef } from 'react'
import { Image, Send, Eye, Loader2, Trash2, Globe, ExternalLink, X, Plus } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useToast } from '../../context/ToastContext'

export default function AdminContent() {
  const { showToast } = useToast()
  
  // Notification State
  const [notification, setNotification] = useState({ title: '', body: '', audience: 'All Users' })
  const [sendingNotif, setSendingNotif] = useState(false)
  
  // Banner State
  const [banners, setBanners] = useState([])
  const [loadingBanners, setLoadingBanners] = useState(true)
  const [bannerForm, setBannerForm] = useState({ title: '', description: '', imageUrl: '', link: '' })
  const [uploadingImage, setUploadingImage] = useState(false)
  const [publishingBanner, setPublishingBanner] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  
  const fileInputRef = useRef(null)

  const audienceToTarget = { 
    'All Users': 'all', 
    'Active Subscribers': 'customers', 
    'Expired Subscribers': 'customers', 
    'Cleaners Only': 'cleaners' 
  }

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

  useEffect(() => {
    fetchBanners()
  }, [])

  const handleImageSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadingImage(true)
    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await apiClient.uploadForm('/admin/upload', formData)
      setBannerForm({ ...bannerForm, imageUrl: res.imageUrl })
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

  const handleSendNotification = async () => {
    if (!notification.title || !notification.body) {
      showToast('Title and Message are required.', 'error')
      return
    }
    setSendingNotif(true)
    try {
      await apiClient.post('/admin/notifications/broadcast', {
        title: notification.title,
        message: notification.body,
        target: audienceToTarget[notification.audience] || 'all',
      })
      showToast('Notification broadcasted successfully!', 'success')
      setNotification({ ...notification, title: '', body: '' })
    } catch (err) {
      showToast(err?.message || 'Failed to send notification', 'error')
    } finally {
      setSendingNotif(false)
    }
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="flex justify-between items-center" style={{ marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>Content Management</h1>
          <p className="text-secondary" style={{ fontSize: 14, marginTop: 4 }}>Manage banners, offers, and push notifications</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-24">
        {/* Banner Editor */}
        <div className="lg:col-span-7 flex flex-col gap-24">
          <div className="glass" style={{ padding: 32, borderRadius: 28 }}>
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

              <div className="flex gap-12" style={{ marginTop: 8 }}>
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
            <div className="animate-slide-up">
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

        {/* Right Sidebar: Notifications & Active Banners */}
        <div className="lg:col-span-5 flex flex-col gap-24">
          {/* Push Notification */}
          <div className="glass" style={{ padding: 32, borderRadius: 28 }}>
            <div className="flex items-center gap-12" style={{ marginBottom: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(55, 122, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#377aff' }}>
                <Send size={20} />
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>Push Notification</h2>
            </div>
            
            <div className="flex flex-col gap-16">
              <input 
                className="input-field" 
                placeholder="Notification Title" 
                value={notification.title} 
                onChange={e => setNotification({...notification, title: e.target.value})} 
              />
              <textarea 
                className="input-field" 
                rows={3} 
                placeholder="Notification message..." 
                value={notification.body} 
                onChange={e => setNotification({...notification, body: e.target.value})} 
                style={{ resize: 'none' }} 
              />
              <select 
                className="input-field" 
                value={notification.audience} 
                onChange={e => setNotification({...notification, audience: e.target.value})}>
                <option>All Users</option>
                <option>Active Subscribers</option>
                <option>Expired Subscribers</option>
                <option>Cleaners Only</option>
              </select>
              <button className="btn btn-blue w-full" style={{ padding: '14px' }} onClick={handleSendNotification} disabled={sendingNotif}>
                {sendingNotif ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Send size={16} /> Broadcast Notification</>}
              </button>
            </div>
          </div>

          {/* Active Banners List */}
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
    </div>
  )
}
