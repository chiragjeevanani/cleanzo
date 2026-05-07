import { useState } from 'react'
import { Image, Send, Eye, Loader2 } from 'lucide-react'
import apiClient from '../../services/apiClient'

export default function AdminContent() {
  const [notification, setNotification] = useState({ title: '', body: '', audience: 'All Users' })
  const [sending, setSending] = useState(false)

  const handleSendNotification = async () => {
    if (!notification.title || !notification.body) return alert('Title and Message are required')
    setSending(true)
    try {
      await apiClient.post('/admin/notifications/broadcast', {
        title: notification.title,
        message: notification.body,
        // Optional mapping based on backend needs, for now just pass strings
      })
      alert('Notification broadcasted successfully!')
      setNotification({ ...notification, title: '', body: '' })
    } catch (err) {
      console.error('Failed to send notification', err)
      alert('Failed to send notification')
    } finally {
      setSending(false)
    }
  }
  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Content Management</h1>

      {/* Banner/Offer Editor */}
      <div className="glass" style={{ padding: 24, marginBottom: 24 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, display: 'block', marginBottom: 16 }}>Create Offer Banner</span>
        <div className="flex flex-col gap-16">
          <div>
            <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Banner Title</label>
            <input className="input-field" placeholder="e.g. 20% Off Elite Plan!" />
          </div>
          <div>
            <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Description</label>
            <textarea className="input-field" rows={3} placeholder="Offer details..." style={{ resize: 'vertical' }} />
          </div>
          <div>
            <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Banner Image</label>
            <div className="glass" style={{ padding: 32, textAlign: 'center', borderStyle: 'dashed' }}>
              <Image size={32} style={{ color: 'var(--text-tertiary)', margin: '0 auto 8px' }} />
              <div className="text-body-sm text-secondary">Click or drag to upload</div>
            </div>
          </div>
          <div className="flex gap-8">
            <button className="btn btn-ghost" style={{ flex: 1 }}><Eye size={14} /> Preview</button>
            <button className="btn btn-primary" style={{ flex: 1 }}>Publish Banner</button>
          </div>
        </div>
      </div>

      {/* Push Notification */}
      <div className="glass" style={{ padding: 24 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, display: 'block', marginBottom: 16 }}>Push Notification</span>
        <div className="flex flex-col gap-16">
          <div>
            <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Title</label>
            <input className="input-field" placeholder="Notification title" value={notification.title} onChange={e => setNotification({...notification, title: e.target.value})} />
          </div>
          <div>
            <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Message</label>
            <textarea className="input-field" rows={3} placeholder="Write your message..." value={notification.body} onChange={e => setNotification({...notification, body: e.target.value})} style={{ resize: 'vertical' }} />
          </div>
          <div>
            <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Target Audience</label>
            <select className="input-field" value={notification.audience} onChange={e => setNotification({...notification, audience: e.target.value})}>
              <option>All Users</option>
              <option>Active Subscribers</option>
              <option>Expired Subscribers</option>
              <option>Cleaners Only</option>
            </select>
          </div>
          <button className="btn btn-blue" onClick={handleSendNotification} disabled={sending}>
            {sending ? <><Loader2 size={14} className="animate-spin" /> Sending...</> : <><Send size={14} /> Send Notification</>}
          </button>
        </div>
      </div>
    </div>
  )
}
