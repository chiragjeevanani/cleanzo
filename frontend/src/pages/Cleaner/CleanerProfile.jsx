import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { MapPin, Star, Award, Sun, Moon, LogOut, Loader2, Trash2, AlertTriangle, X } from 'lucide-react'
import { FEATURES } from '../../config/features'

export default function CleanerProfile() {
  const { theme, toggleTheme } = useTheme()
  const { user, logout, deleteAccount } = useAuth()
  const { showToast } = useToast()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      await deleteAccount()
    } catch (err) {
      showToast(err.message || 'Failed to delete account. Please try again.', 'error')
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const getRatingColor = (rating) => {
    if (rating === undefined || rating === null || isNaN(rating) || rating <= 0) return 'var(--text-secondary)'
    const r = Math.min(5, Math.max(1, rating))
    const percent = (r - 1) / 4
    const red = Math.round(255 * (1 - percent))
    const green = Math.round(255 * percent)
    return `rgb(${red}, ${green}, 0)`
  }

  const handleLogout = () => {
    setIsLoggingOut(true)
    logout()
  }
  const completionRate = user?.completionRate ?? 0
  const circumference = 2 * Math.PI * 40

  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ padding: '24px 0', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--bg-accent), var(--primary-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-on-accent)' }}>
          {user?.name ? user.name[0].toUpperCase() : 'C'}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>{user?.name || 'Cleaner'}</div>
        <div className="chip chip-lime" style={{ marginTop: 8 }}><Award size={12} /> {user?.role || 'Cleaner'}</div>
      </div>

      {/* Performance gauge */}
      <div className="glass" style={{ padding: 24, textAlign: 'center', marginBottom: 16 }}>
        <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 12px' }}>
          <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-glass)" strokeWidth="5" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--text-accent)" strokeWidth="5"
              strokeDasharray={circumference} strokeDashoffset={circumference - (completionRate / 100) * circumference}
              strokeLinecap="round" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 }}>{completionRate}%</span>
          </div>
        </div>
        <div className="text-body-sm text-secondary">Completion Rate</div>
      </div>

      <div className="flex flex-col gap-8" style={{ marginBottom: 20 }}>
        {[
          { icon: Star, label: 'Rating', value: user?.rating ? `${user.rating.toFixed(1)} ★` : 'N/A', isRating: true },
          { icon: MapPin, label: 'Area', value: user?.assignedArea || 'Not assigned' },
        ].map((r, i) => {
          const ratingVal = user?.rating
          const hasRating = r.isRating && ratingVal !== undefined && ratingVal !== null && !isNaN(ratingVal) && ratingVal > 0
          const color = hasRating ? getRatingColor(ratingVal) : 'var(--text-secondary)'
          const textColor = hasRating ? color : 'inherit'
          
          return (
            <div key={i} className="glass" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="flex items-center gap-12">
                <r.icon size={18} style={{ color: color }} />
                <span>{r.label}</span>
              </div>
              <span style={{ 
                fontWeight: hasRating ? 700 : 500, 
                fontSize: 14, 
                color: textColor,
                textShadow: hasRating ? `0 0 8px rgba(${Math.round(255 * (1 - (Math.min(5, Math.max(1, ratingVal)) - 1) / 4))}, ${Math.round(255 * ((Math.min(5, Math.max(1, ratingVal)) - 1) / 4))}, 0, 0.25)` : 'none'
              }}>
                {r.value}
              </span>
            </div>
          )
        })}
      </div>

      {/* Theme toggle */}
      <div className="glass" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div className="flex items-center gap-12">
          {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          <span>Dark Mode</span>
        </div>
        <button onClick={toggleTheme} style={{ width: 44, height: 24, borderRadius: 12, background: theme === 'dark' ? 'var(--bg-accent)' : 'var(--border-glass)', position: 'relative', padding: 2 }}>
          <div style={{ width: 20, height: 20, borderRadius: 10, background: theme === 'dark' ? '#0A0A0A' : 'var(--text-primary)', transition: 'transform var(--transition-fast)', transform: theme === 'dark' ? 'translateX(20px)' : 'translateX(0)' }} />
        </button>
      </div>

      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="btn btn-ghost w-full"
        style={{ color: 'var(--error)', borderColor: 'rgba(255,69,58,0.2)', marginBottom: FEATURES.ACCOUNT_DELETION ? 12 : 100, background: isLoggingOut ? 'rgba(255,69,58,0.05)' : 'transparent', height: 52 }}
      >
        {isLoggingOut ? (
          <><Loader2 size={16} className="animate-spin" /> <span>Logging out...</span></>
        ) : (
          <><LogOut size={16} /> <span>Sign Out</span></>
        )}
      </button>

      {/* Delete Account — App Store / Play Store requirement (feature-flagged) */}
      {FEATURES.ACCOUNT_DELETION && (
        <button
          onClick={() => setShowDeleteModal(true)}
          className="btn btn-ghost w-full"
          style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-glass)', marginBottom: 100, background: 'transparent', height: 48, fontSize: 14 }}
        >
          <Trash2 size={15} /> <span>Delete Account</span>
        </button>
      )}

      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => !isDeleting && setShowDeleteModal(false)}>
          <div className="modal-content" style={{ padding: 24, borderRadius: 24, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
              <div className="flex items-center gap-12">
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,69,58,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={20} style={{ color: 'var(--error)' }} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800 }}>Delete Account?</h3>
              </div>
              {!isDeleting && (
                <button onClick={() => setShowDeleteModal(false)} className="btn-icon glass" style={{ width: 32, height: 32, borderRadius: 10 }}>
                  <X size={16} />
                </button>
              )}
            </div>

            <p className="text-body-sm text-secondary" style={{ marginBottom: 20, lineHeight: 1.5 }}>
              This will <strong style={{ color: 'var(--text-primary)' }}>deactivate your account</strong> and sign you out immediately. To work with Cleanzo again you'll need to contact support to restore your account.
            </p>

            <div className="flex flex-col gap-8">
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="btn w-full"
                style={{ background: 'var(--error)', color: '#fff', height: 48, fontWeight: 700 }}
              >
                {isDeleting ? (
                  <><Loader2 size={16} className="animate-spin" /> <span>Deleting...</span></>
                ) : (
                  <><Trash2 size={16} /> <span>Yes, Delete My Account</span></>
                )}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="btn btn-ghost w-full"
                style={{ height: 48 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
