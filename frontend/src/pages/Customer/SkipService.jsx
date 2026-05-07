import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Info } from 'lucide-react'
import apiClient from '../../services/apiClient'

export default function SkipService() {
  const navigate = useNavigate()
  const today = new Date()
  const [selectedDates, setSelectedDates] = useState([])
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const year = today.getFullYear()
  const month = today.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' })

  const toggleDate = (day) => {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    if (day <= today.getDate()) return
    setSelectedDates(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr])
  }

  const handleSkipConfirm = async () => {
    setLoading(true)
    try {
      await apiClient.post('/customer/skip', { dates: selectedDates })
      setShowConfirm(false)
      navigate('/customer')
    } catch (err) {
      console.error('Failed to skip days', err)
      alert('Failed to skip days')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <Link to="/customer" className="flex items-center gap-8"><ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Skip Service</span></Link>
      </div>

      <div className="glass" style={{ padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Info size={16} style={{ color: 'var(--primary-blue)', flexShrink: 0 }} />
        <span className="text-body-sm text-secondary">Skipped days will be added to the end of your subscription.</span>
      </div>

      {/* Calendar */}
      <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, marginBottom: 16 }}>{monthName}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} className="text-label text-tertiary" style={{ padding: 8, fontSize: 10 }}>{d}</div>
          ))}
          {[...Array(firstDay)].map((_, i) => <div key={`e${i}`} />)}
          {[...Array(daysInMonth)].map((_, i) => {
            const day = i + 1
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            const isPast = day <= today.getDate()
            const isSelected = selectedDates.includes(dateStr)
            return (
              <button key={day} onClick={() => toggleDate(day)}
                style={{ padding: 8, borderRadius: 'var(--radius)', fontSize: 14, fontWeight: isSelected ? 700 : 400,
                  background: isSelected ? 'var(--accent-lime)' : 'transparent', color: isSelected ? '#0A0A0A' : isPast ? 'var(--text-tertiary)' : 'var(--text-primary)',
                  cursor: isPast ? 'default' : 'pointer', fontFamily: 'var(--font-display)' }}>
                {day}
              </button>
            )
          })}
        </div>
      </div>

      {selectedDates.length > 0 && (
        <div style={{ paddingBottom: 100 }}>
          <div className="text-body-sm text-secondary" style={{ marginBottom: 12 }}>
            {selectedDates.length} day{selectedDates.length > 1 ? 's' : ''} selected for skip
          </div>
          <button className="btn btn-primary w-full" onClick={() => setShowConfirm(true)}>Confirm Skip</button>
        </div>
      )}

      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Confirm Skip</h3>
            <p className="text-body-md text-secondary" style={{ marginBottom: 20 }}>
              Are you sure you want to skip {selectedDates.length} day{selectedDates.length > 1 ? 's' : ''}? These days will be added to the end of your subscription.
            </p>
            <div className="flex gap-8">
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowConfirm(false)}>Cancel</button>
              <button disabled={loading} className={`btn btn-primary ${loading ? 'opacity-50' : ''}`} style={{ flex: 1 }} onClick={handleSkipConfirm}>
                {loading ? 'Skipping...' : 'Skip Days'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
