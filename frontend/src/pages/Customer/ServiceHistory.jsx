import PageLoader from '../../components/PageLoader'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Star, X } from 'lucide-react'
import apiClient from '../../services/apiClient'

function RatingModal({ task, onClose, onSubmit }) {
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [ratingError, setRatingError] = useState('')

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
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div className="glass" style={{ width: '100%', maxWidth: 480, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '24px 20px', animation: 'slideUp 0.3s ease-out' }}>
        <div className="flex justify-between items-center mb-4">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>Rate your clean</h3>
          <button onClick={onClose} style={{ background: 'var(--bg-glass)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}><X size={20} /></button>
        </div>
        <p className="text-secondary text-body-sm" style={{ marginBottom: 20 }}>How was the cleaning for {task.vehicle?.model || 'your vehicle'} on {new Date(task.date).toLocaleDateString()}?</p>
        
        <div className="flex justify-center gap-12" style={{ marginBottom: 24 }}>
          {[1,2,3,4,5].map(star => (
            <button key={star} onClick={() => setScore(star)} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', transition: 'transform 0.2s', transform: score >= star ? 'scale(1.1)' : 'scale(1)' }}>
              <Star size={40} fill={score >= star ? '#FFD700' : 'transparent'} color={score >= star ? '#FFD700' : 'var(--border-glass)'} />
            </button>
          ))}
        </div>

        <textarea 
          placeholder="Any feedback for the cleaner? (Optional)"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="glass"
          style={{ width: '100%', padding: '12px 16px', borderRadius: 12, minHeight: 80, border: '1px solid var(--border-glass)', background: 'transparent', color: 'white', resize: 'vertical', marginBottom: 20 }}
        />

        {ratingError && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 12, fontSize: 13 }}>
            {ratingError}
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={!score || loading}
          className={`btn btn-primary w-full ${(!score || loading) ? 'opacity-50' : ''}`}>
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </div>
  )
}

export default function ServiceHistory() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ratingTask, setRatingTask] = useState(null)
  const [ratedTaskIds, setRatedTaskIds] = useState(new Set()) // In a real app, backend would return if task is rated

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await apiClient.get('/customer/history')
        setHistory(res.tasks || [])
      } catch (err) {
        setError('Failed to load service history. Please refresh.')
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  const handleRatingSubmit = (taskId) => {
    setRatedTaskIds(prev => new Set(prev).add(taskId))
    setRatingTask(null)
  }

  if (loading) return <PageLoader />
  if (error) return <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--error)' }}>{error}</div>
  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <Link to="/customer" className="flex items-center gap-8"><ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Service History</span></Link>
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
                <button onClick={() => setRatingTask(s)} className="btn btn-ghost" style={{ width: '100%', marginTop: 12, padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#FFD700' }}>
                  <Star size={16} /> Rate this service
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
