import { useState, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Camera, Image, Upload } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { optimizeImage } from '../../utils/imageOptimizer'

export default function PhotoUpload() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const taskId = searchParams.get('taskId')
  const uploadType = searchParams.get('type') || 'before'

  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setPreview(URL.createObjectURL(selectedFile))
    }
  }

  const handleUpload = async () => {
    if (!file || !taskId) return
    setUploading(true)
    
    try {
      // Optimize image before upload
      const optimizedFile = await optimizeImage(file, { maxWidth: 1000, quality: 0.7 })
      
      const formData = new FormData()
      formData.append('photo', optimizedFile)
      formData.append('type', uploadType)

      await apiClient.uploadForm(`/cleaner/tasks/${taskId}/photo`, formData)
      navigate(`/cleaner/tasks/${taskId}`)
    } catch (err) {
      setUploadError('Photo upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }
  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <Link to="/cleaner/tasks" className="flex items-center gap-8"><ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Upload Photos</span></Link>
      </div>

      <div className="glass" style={{ padding: 40, textAlign: 'center', marginBottom: 20, borderStyle: 'dashed' }}>
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          style={{ display: 'none' }} 
        />
        {preview ? (
          <div style={{ marginBottom: 16 }}>
            <img src={preview} alt="Preview" style={{ width: '100%', borderRadius: 12, objectFit: 'cover' }} />
            <button className="btn btn-ghost btn-sm mt-4" onClick={() => { setFile(null); setPreview(null); }}>
              Remove Photo
            </button>
          </div>
        ) : (
          <>
            <Camera size={40} style={{ color: 'var(--text-tertiary)', margin: '0 auto 16px' }} />
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Take {uploadType === 'before' ? 'Before' : 'After'} Photo</div>
            <p className="text-body-sm text-secondary" style={{ marginBottom: 20 }}>Capture the vehicle {uploadType} cleaning</p>
            <div className="flex gap-8 justify-center">
              <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
                <Camera size={16} /> Choose {uploadType === 'before' ? 'Before' : 'After'} Photo
              </button>
            </div>
          </>
        )}
      </div>

      <div className="glass" style={{ padding: 16, marginBottom: 20 }}>
        <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 8 }}>Notes (Optional)</label>
        <textarea className="input-field" rows={3} placeholder="Any observations or notes..." style={{ resize: 'vertical' }} />
      </div>

      {uploadError && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 12, fontSize: 14 }}>
          {uploadError}
        </div>
      )}
      <button disabled={!file || uploading} className={`btn btn-blue w-full btn-lg ${(!file || uploading) ? 'opacity-50' : ''}`} style={{ marginBottom: 100 }} onClick={handleUpload}>
        <Upload size={16} /> {uploading ? 'Uploading...' : 'Submit Photos'}
      </button>
    </div>
  )
}
