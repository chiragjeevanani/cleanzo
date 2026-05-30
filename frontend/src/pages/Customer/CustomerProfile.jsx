import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { ChevronRight, Car, Sun, Moon, LogOut, HelpCircle, Shield, Bell, MapPin, FileText, Loader2, Pencil, X, Check, CreditCard, ArrowLeft, Download, Clock } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { validateName, validateEmail, formatCityState } from '../../utils/helpers'

export default function CustomerProfile() {
  const { theme, toggleTheme } = useTheme()
  const { user, logout, updateUser } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    city: user?.city || '',
  })

  const [view, setView] = useState('profile')
  const [payments, setPayments] = useState([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [selectedPaymentId, setSelectedPaymentId] = useState(null)
  const [paymentDetail, setPaymentDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const fetchPayments = async () => {
    setLoadingPayments(true)
    try {
      const res = await apiClient.get('/customer/payment-history')
      setPayments(res.payments || [])
    } catch (err) {
      console.error('Failed to fetch payments:', err)
    } finally {
      setLoadingPayments(false)
    }
  }

  const openPaymentDetail = async (paymentId) => {
    setSelectedPaymentId(paymentId)
    setLoadingDetail(true)
    setPaymentDetail(null)
    try {
      const res = await apiClient.get(`/customer/payment-history/${paymentId}`)
      setPaymentDetail(res.payment)
    } catch (err) {
      console.error('Failed to fetch payment details:', err)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleLogout = () => {
    setIsLoggingOut(true)
    logout()
  }

  const handleSaveProfile = async () => {
    setEditError('')
    if (!validateName(form.firstName) || !validateName(form.lastName)) {
      setEditError('First and Last Name must contain only alphabetic characters (2-50 characters).')
      return
    }
    if (!validateEmail(form.email)) {
      setEditError('Please enter a valid email address.')
      return
    }
    const formattedCity = formatCityState(form.city)
    if (form.city && !formattedCity) {
      setEditError('City name must contain only alphabetic characters.')
      return
    }

    setSaving(true)
    try {
      const res = await apiClient.put('/customer/profile', {
        ...form,
        city: formattedCity
      })
      updateUser(res.user)
      setEditing(false)
    } catch (err) {
      setEditError(err.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const menuItems = [
    { icon: Car, label: 'My Vehicles', to: '/customer/vehicles' },
    { icon: Clock, label: 'Service History', to: '/customer/history' },
    { icon: MapPin, label: 'Saved Address', to: '/customer/addresses' },
    { icon: FileText, label: 'Terms of Service', to: '/customer/terms' },
    { icon: Shield, label: 'Privacy Policy', to: '/customer/privacy' },
    { icon: HelpCircle, label: 'Help and Support', to: '/customer/help' },
  ]

  if (view === 'billing') {
    return (
      <div className="animate-fade-in" style={{ padding: '0 20px', paddingBottom: 100 }}>
        <div className="app-header" style={{ padding: '16px 0', background: 'transparent' }}>
          <button onClick={() => setView('profile')} className="flex items-center gap-8 bg-transparent border-none text-[color:var(--text-primary)] cursor-pointer p-0">
            <ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Profile Settings</span>
          </button>
        </div>

        <div className="flex flex-col gap-16" style={{ marginTop: 12 }}>
          <div>
            <h3 className="text-headline-sm" style={{ marginBottom: 4 }}>Billing & Payments</h3>
            <p className="text-secondary text-body-sm">View your plan subscription purchase logs.</p>
          </div>

          {loadingPayments ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <Loader2 size={32} className="animate-spin text-lime" />
            </div>
          ) : payments.length === 0 ? (
            <div className="glass" style={{ padding: '40px 20px', textAlign: 'center', borderRadius: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CreditCard size={24} className="text-secondary" />
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>No Payments Found</div>
              <p className="text-body-sm text-secondary">You haven't made any plan purchases yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-12">
              {payments.map(p => (
                <button 
                  key={p._id}
                  onClick={() => openPaymentDetail(p.paymentId)}
                  className="glass"
                  style={{ 
                    padding: '16px 20px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    textAlign: 'left',
                    borderRadius: 20,
                    width: '100%',
                    cursor: 'pointer',
                    color: 'inherit'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{p.package?.name || 'Plan Purchase'}</div>
                    <div className="text-body-sm text-secondary" style={{ fontSize: 12, marginTop: 2 }}>
                      {p.vehicle?.brand} {p.vehicle?.model} • {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 800, fontSize: 16 }}>₹{(p.amount / 100).toFixed(0)}</span>
                    <span className="chip chip-success" style={{ fontSize: 8 }}>Success</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Payment Detail Modal */}
        {selectedPaymentId && (
          <div className="modal-overlay" onClick={() => setSelectedPaymentId(null)}>
            <div className="modal-content" style={{ padding: 24, borderRadius: 24, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center" style={{ marginBottom: 20 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800 }}>Payment Details</h3>
                <button onClick={() => setSelectedPaymentId(null)} className="btn-icon glass" style={{ width: 32, height: 32, borderRadius: 10 }}>
                  <X size={16} />
                </button>
              </div>

              {loadingDetail ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                  <Loader2 size={24} className="animate-spin text-lime" />
                </div>
              ) : paymentDetail ? (
                <div className="flex flex-col gap-16">
                  <div className="glass" style={{ padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.01)', textAlign: 'center' }}>
                    <div className="text-label" style={{ color: 'var(--text-tertiary)', fontSize: 9 }}>AMOUNT PAID</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900, color: 'var(--text-accent)', marginTop: 4 }}>
                      ₹{(paymentDetail.amount / 100).toFixed(0)}
                    </div>
                  </div>

                  <div className="flex flex-col gap-10 text-body-sm">
                    <div className="flex justify-between">
                      <span className="text-secondary">Plan Name</span>
                      <span style={{ fontWeight: 600 }}>{paymentDetail.package?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Vehicle</span>
                      <span style={{ fontWeight: 600 }}>{paymentDetail.vehicle?.brand} {paymentDetail.vehicle?.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Transaction Date</span>
                      <span style={{ fontWeight: 600 }}>
                        {new Date(paymentDetail.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Transaction Time</span>
                      <span style={{ fontWeight: 600 }}>
                        {new Date(paymentDetail.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Payment Method</span>
                      <span style={{ fontWeight: 600 }}>{paymentDetail.method || 'Online'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Pay Via</span>
                      <span style={{ fontWeight: 600 }}>{paymentDetail.payVia || 'Razorpay'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Transaction Type</span>
                      <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{paymentDetail.type || 'Purchase'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-secondary">Status</span>
                      <span className="chip chip-success" style={{ fontSize: 8 }}>Verified</span>
                    </div>
                    <div className="flex flex-col gap-4 mt-6" style={{ wordBreak: 'break-all' }}>
                      <span className="text-label" style={{ color: 'var(--text-tertiary)', fontSize: 8 }}>PAYMENT ID</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)' }}>{paymentDetail.paymentId}</span>
                    </div>
                  </div>

                  <div className="divider" style={{ opacity: 0.3, margin: '8px 0' }} />

                  <button 
                    onClick={() => window.open(`/customer/receipt/${paymentDetail.paymentId}`, '_blank')}
                    className="btn btn-primary w-full"
                    style={{ padding: 14, borderRadius: 12, fontWeight: 700, gap: 8 }}
                  >
                    <Download size={16} /> Download Receipt
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--error)' }}>
                  Failed to load transaction details.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ padding: '24px 0', textAlign: 'center', position: 'relative' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-blue), var(--accent-lime))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-display)', color: '#0A0A0A' }}>
          {user?.name ? user.name[0].toUpperCase() : 'U'}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>{user?.name || 'User'}</div>
        <div className="text-body-sm text-secondary">{user?.phone || user?.email || ''}</div>
        <button onClick={() => { setEditing(!editing); setEditError('') }} style={{ position: 'absolute', top: 24, right: 0, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 10, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
          {editing ? <X size={14} /> : <Pencil size={14} />}
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {editing && (
        <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
          {editError && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 14, fontSize: 13 }}>
              {editError}
            </div>
          )}
          <div className="flex flex-col gap-12">
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>First Name</label>
              <input className="input-field" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value.replace(/[^a-zA-Z\s]/g, '') })} placeholder="First name" />
            </div>
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Last Name</label>
              <input className="input-field" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value.replace(/[^a-zA-Z\s]/g, '') })} placeholder="Last name" />
            </div>
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Email</label>
              <input className="input-field" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="your@email.com" />
            </div>
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>City</label>
              <input className="input-field" value={form.city} onChange={e => setForm({ ...form, city: e.target.value.replace(/[^a-zA-Z\s]/g, '') })} placeholder="Your city" />
            </div>
            <button className="btn btn-blue w-full" onClick={handleSaveProfile} disabled={saving}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Check size={14} /> Save Changes</>}
            </button>
          </div>
        </div>
      )}

      {/* Theme toggle */}
      <div className="glass" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="flex items-center gap-12">
          {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
          <span style={{ fontWeight: 500 }}>Dark Mode</span>
        </div>
        <button onClick={toggleTheme} style={{ width: 44, height: 24, borderRadius: 12, background: theme === 'dark' ? 'var(--accent-lime)' : 'var(--border-glass)', position: 'relative', padding: 2 }}>
          <div style={{ width: 20, height: 20, borderRadius: 10, background: theme === 'dark' ? '#0A0A0A' : 'var(--text-primary)', transition: 'transform var(--transition-fast)', transform: theme === 'dark' ? 'translateX(20px)' : 'translateX(0)' }} />
        </button>
      </div>

      <div className="flex flex-col gap-4" style={{ marginBottom: 24 }}>
        <button 
          onClick={() => { setView('billing'); fetchPayments(); }}
          className="glass" 
          style={{ 
            padding: '14px 20px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            width: '100%', 
            cursor: 'pointer', 
            textAlign: 'left', 
            color: 'inherit',
            fontSize: 'inherit'
          }}
        >
          <div className="flex items-center gap-12">
            <CreditCard size={20} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontWeight: 500 }}>Billing & Payments</span>
          </div>
          <ChevronRight size={18} style={{ color: 'var(--text-tertiary)' }} />
        </button>

        {menuItems.map((m, i) => (
          <Link key={i} to={m.to} className="glass" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="flex items-center gap-12">
              <m.icon size={20} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ fontWeight: 500 }}>{m.label}</span>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--text-tertiary)' }} />
          </Link>
        ))}
      </div>

      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="btn btn-ghost w-full"
        style={{
          color: 'var(--error)',
          borderColor: 'rgba(255,69,58,0.2)',
          marginBottom: 100,
          background: isLoggingOut ? 'rgba(255,69,58,0.05)' : 'transparent',
          height: 52
        }}
      >
        {isLoggingOut ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Logging out...</span>
          </>
        ) : (
          <>
            <LogOut size={16} />
            <span>Sign Out</span>
          </>
        )}
      </button>
    </div>
  )
}
