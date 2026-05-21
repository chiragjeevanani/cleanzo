import PageLoader from '../../components/PageLoader'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Star, X, Image as ImageIcon } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useCustomerData } from '../../context/CustomerDataContext'

function RatingModal({ task, onClose, onSubmit }) {
  const [step, setStep] = useState(task.photos?.after?.length > 0 || task.photos?.before?.length > 0 || task.notes ? 'report' : 'rate')
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [ratingError, setRatingError] = useState('')
  const [photoView, setPhotoView] = useState(null) // full-screen photo

  const hasBefore = task.photos?.before?.length > 0
  const hasAfter  = task.photos?.after?.length > 0
  const hasPhotos = hasBefore || hasAfter

  const handleSubmit = async () => {
    if (!score) return
    setLoading(true)
    setRatingError('')
    try {
      await apiClient.post(`/customer/tasks/${task._id}/rate`, { score, feedback })
      onSubmit(task._id)
    } catch (err) {
      setRatingError(err.message || 'Failed to submit rating')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Full-screen photo lightbox */}
      {photoView && (
        <div 
          onClick={() => setPhotoView(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <img src={photoView} alt="Service photo" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 16, objectFit: 'contain' }} />
          <button onClick={() => setPhotoView(null)} style={{ position: 'absolute', top: 24, right: 24, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
      )}

      {/* Main modal sheet */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div className="glass" style={{ width: '100%', maxWidth: 480, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: '24px 20px 36px', animation: 'slideUp 0.3s ease-out', maxHeight: '90vh', overflowY: 'auto' }}>
          
          {/* Header */}
          <div className="flex justify-between items-center" style={{ marginBottom: 20 }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 2 }}>
                {step === 'report' ? 'Service Report' : 'Rate your clean'}
              </h3>
              <p className="text-secondary" style={{ fontSize: 12 }}>
                {task.vehicle?.model || 'Vehicle'} · {new Date(task.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <button onClick={onClose} style={{ background: 'var(--bg-glass)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {step === 'report' ? (
            <>
              {/* Step indicator */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <div style={{ height: 3, flex: 1, borderRadius: 2, background: 'var(--accent-lime)' }} />
                <div style={{ height: 3, flex: 1, borderRadius: 2, background: 'var(--border-glass)' }} />
              </div>

              {/* Before / After photo grid */}
              {hasPhotos ? (
                <div style={{ marginBottom: 20 }}>
                  <p className="text-secondary" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Before & After</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {['before', 'after'].map(type => {
                      const photos = task.photos?.[type] || []
                      const hasPhoto = photos.length > 0
                      return (
                        <div key={type} onClick={() => hasPhoto && setPhotoView(photos[0])} style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', aspectRatio: '1', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', cursor: hasPhoto ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {hasPhoto ? (
                            <>
                              <img src={photos[0]} alt={type} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)', padding: '20px 10px 8px' }}>
                                <span style={{ color: 'white', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{type}</span>
                              </div>
                              {photos.length > 1 && (
                                <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: '2px 6px', color: 'white', fontSize: 11, fontWeight: 600 }}>+{photos.length - 1}</div>
                              )}
                            </>
                          ) : (
                            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                              <ImageIcon size={22} style={{ margin: '0 auto 6px', display: 'block' }} />
                              <span style={{ fontSize: 11 }}>{type}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 8 }}>Tap a photo to view full screen</p>
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', background: 'var(--bg-glass)', borderRadius: 14, marginBottom: 20, fontSize: 13 }}>
                  No photos uploaded by the cleaner.
                </div>
              )}

              {/* Cleaner Notes */}
              {task.notes ? (
                <div style={{ padding: 16, borderRadius: 14, background: 'rgba(50,215,75,0.06)', border: '1px solid rgba(50,215,75,0.15)', marginBottom: 20 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Cleaner's Notes</p>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>{task.notes}</p>
                </div>
              ) : (
                <div style={{ padding: 16, borderRadius: 14, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', marginBottom: 20, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                  No notes from cleaner.
                </div>
              )}

              <button className="btn btn-primary w-full" onClick={() => setStep('rate')}>
                Continue to Rate →
              </button>
            </>
          ) : (
            <>
              {/* Step indicator */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <div style={{ height: 3, flex: 1, borderRadius: 2, background: 'var(--accent-lime)' }} />
                <div style={{ height: 3, flex: 1, borderRadius: 2, background: 'var(--accent-lime)' }} />
              </div>

              <p className="text-secondary" style={{ fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
                How was the cleaning service? Your feedback helps improve quality.
              </p>
              
              <div className="flex justify-center gap-12" style={{ marginBottom: 24 }}>
                {[1,2,3,4,5].map(star => (
                  <button key={star} onClick={() => setScore(star)} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', transition: 'transform 0.2s', transform: score >= star ? 'scale(1.15)' : 'scale(1)' }}>
                    <Star size={40} fill={score >= star ? '#FFD700' : 'transparent'} color={score >= star ? '#FFD700' : 'var(--border-glass)'} />
                  </button>
                ))}
              </div>

              {score > 0 && (
                <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, fontWeight: 600 }}>
                  {['', 'Needs improvement', 'Could be better', 'Good service', 'Great job!', 'Excellent! 🌟'][score]}
                </p>
              )}

              <textarea 
                placeholder="Any feedback for the cleaner? (Optional)"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="glass"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, minHeight: 80, border: '1px solid var(--border-glass)', background: 'transparent', color: 'white', resize: 'vertical', marginBottom: 16, boxSizing: 'border-box' }}
              />

              {ratingError && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 12, fontSize: 13 }}>
                  {ratingError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                {(task.photos?.after?.length > 0 || task.photos?.before?.length > 0 || task.notes) && (
                  <button className="btn btn-glass" style={{ flex: '0 0 auto' }} onClick={() => setStep('report')}>← Back</button>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={!score || loading}
                  className={`btn btn-primary ${(!score || loading) ? 'opacity-50' : ''}`}
                  style={{ flex: 1 }}>
                  {loading ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default function ServiceHistory() {
  const navigate = useNavigate();

  const { history, loading: dataLoading, refreshHistory } = useCustomerData()
  const [ratingTask, setRatingTask] = useState(null)
  const [ratedTaskIds, setRatedTaskIds] = useState(new Set()) 

  const handleRatingSubmit = (taskId) => {
    setRatedTaskIds(prev => new Set(prev).add(taskId))
    setRatingTask(null)
    refreshHistory()
  }

  const loading = dataLoading.history
  if (loading && !history.length) return (
    <div className="app-shell">
      <div className="app-header" style={{ padding: '16px var(--margin-side)', background: 'transparent' }}>
        <div className="skeleton" style={{ width: 150, height: 24, borderRadius: 8 }} />
      </div>
      <div className="container" style={{ padding: '0 20px' }}>
        <div className="flex flex-col gap-8 mt-12">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="glass" style={{ padding: '16px 20px', borderRadius: 16 }}>
              <div className="flex justify-between items-center mb-12">
                <div className="skeleton" style={{ width: 120, height: 16, borderRadius: 6 }} />
                <div className="skeleton" style={{ width: 60, height: 20, borderRadius: 8 }} />
              </div>
              <div className="flex justify-between">
                <div className="skeleton" style={{ width: 180, height: 12, borderRadius: 6 }} />
                <div className="skeleton" style={{ width: 40, height: 12, borderRadius: 6 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <button onClick={() => navigate(-1)}  className="flex items-center gap-8" style={{ background: 'transparent', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', outline: 'none' }}><ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Service History</span></button>
      </div>
      <div className="flex flex-col gap-8" style={{ paddingBottom: 100 }}>
        {history.length === 0 ? (
          <div className="text-center text-secondary py-8">No service history found.</div>
        ) : history.map(s => {
          const isRated = ratedTaskIds.has(s._id)
          return (
            <div key={s._id} className="glass" style={{ padding: '16px 20px' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{s.packageName || 'Cleaning Service'}</span>
                <span className={`chip ${s.status === 'completed' ? 'chip-success' : s.status === 'skipped' ? 'chip-ghost' : 'chip-error'}`}>{s.status}</span>
              </div>
              <div className="flex justify-between text-body-sm text-secondary">
                <span>{s.vehicle?.model || s.vehicleName || 'Vehicle'} · {new Date(s.date).toLocaleDateString()}</span>
                <span>{s.scheduledTime || s.completedTime || ''}</span>
              </div>
              
              {s.status === 'completed' && !isRated && (
                <button onClick={() => setRatingTask(s)} style={{ width: '100%', marginTop: 12, padding: '10px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#B8860B', background: 'rgba(255, 193, 7, 0.12)', border: '1px solid rgba(255, 193, 7, 0.3)', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'background 0.2s' }}>
                  <Star size={16} fill="#B8860B" stroke="none" /> Rate this service
                </button>
              )}
              {isRated && (
                <div style={{ marginTop: 12, padding: 8, textAlign: 'center', color: 'var(--success)', fontSize: 13, fontWeight: 600 }}>
                  ✓ Thanks for rating!
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {ratingTask && (
        <RatingModal 
          task={ratingTask} 
          onClose={() => setRatingTask(null)}
          onSubmit={handleRatingSubmit}
        />
      )}
    </div>
  )
}
