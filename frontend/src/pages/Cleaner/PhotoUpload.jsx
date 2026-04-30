import { Link } from 'react-router-dom'
import { ArrowLeft, Camera, Image, Upload } from 'lucide-react'

export default function PhotoUpload() {
  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <Link to="/cleaner/tasks" className="flex items-center gap-8"><ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Upload Photos</span></Link>
      </div>

      <div className="glass" style={{ padding: 40, textAlign: 'center', marginBottom: 20, borderStyle: 'dashed' }}>
        <Camera size={40} style={{ color: 'var(--text-tertiary)', margin: '0 auto 16px' }} />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Take a Photo</div>
        <p className="text-body-sm text-secondary" style={{ marginBottom: 20 }}>Capture the vehicle before or after cleaning</p>
        <div className="flex gap-8 justify-center">
          <button className="btn btn-primary"><Camera size={16} /> Camera</button>
          <button className="btn btn-ghost"><Image size={16} /> Gallery</button>
        </div>
      </div>

      <div className="glass" style={{ padding: 16, marginBottom: 20 }}>
        <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 8 }}>Notes (Optional)</label>
        <textarea className="input-field" rows={3} placeholder="Any observations or notes..." style={{ resize: 'vertical' }} />
      </div>

      <button className="btn btn-blue w-full btn-lg" style={{ marginBottom: 100 }}><Upload size={16} /> Submit Photos</button>
    </div>
  )
}
