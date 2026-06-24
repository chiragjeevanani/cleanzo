import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell, ChevronRight, Calendar, SkipForward, Clock, Car, Check, User, ShoppingBag, CreditCard, AlertTriangle, X, MapPin, Send } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import apiClient from '../../services/apiClient'
import { useCustomerData } from '../../context/CustomerDataContext'

const formatSlot = (slotStr) => {
  if (!slotStr) return '—';
  const parts = slotStr.split('_');
  if (parts.length === 3) {
    const [start, end, period] = parts;
    return `${start}:00 - ${end}:00 ${period}`;
  }
  return slotStr;
};

export default function CustomerHome() {
  const { user } = useAuth()
  const {
    subscriptions, history, orders, notifications, banners,
    loading: dataLoading
  } = useCustomerData()

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeSub = (subscriptions || []).find(s => {
    if (s.status !== 'Active') return false;
    const endDate = new Date(s.endDate);
    endDate.setHours(0, 0, 0, 0);
    return today.getTime() <= endDate.getTime();
  }) || null;

  const expiredTrial = !activeSub && (subscriptions || []).find(s => s.status === 'Expired' && s.isTrial)
  const remainingDays = activeSub ? Math.max(0, activeSub.totalDays - (activeSub.completedDays || 0) - (activeSub.skippedDays || 0)) : 0
  const hasRemainingDays = remainingDays > 0
  const unreadCount = (notifications || []).filter(n => !n.read).length

  // Unified recent activity: services + subscription purchases + marketplace orders, newest first
  const recentActivity = [
    ...(history || []).map(s => ({
      id: `task-${s._id}`,
      kind: 'service',
      time: s.date,
      title: s.packageName || 'Cleaning Service',
      subtitle: `${s.date ? new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}${(s.scheduledTime || s.completedTime) ? ` • ${s.scheduledTime || s.completedTime}` : ''}`,
      status: s.status,
    })),
    ...(subscriptions || []).map(sub => ({
      id: `sub-${sub._id}`,
      kind: 'purchase',
      time: sub.createdAt,
      title: sub.isTrial ? 'Free Trial Started' : `${sub.package?.name || 'Subscription'} Purchased`,
      subtitle: `${sub.createdAt ? new Date(sub.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}${(!sub.isTrial && sub.amount) ? ` • ₹${sub.amount}` : ''}`,
      status: sub.status,
    })),
    ...(orders || []).map(o => ({
      id: `order-${o._id}`,
      kind: 'order',
      time: o.createdAt,
      title: o.items?.[0]?.product?.name
        ? `${o.items[0].product.name}${o.items.length > 1 ? ` +${o.items.length - 1} more` : ''}`
        : `Order ${o.orderId || ''}`,
      subtitle: `${o.createdAt ? new Date(o.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}${o.totalAmount ? ` • ₹${o.totalAmount}` : ''}`,
      status: o.status,
    })),
  ]
    .filter(a => a.time)
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 5)


  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  const loading = dataLoading.subscriptions || dataLoading.history || dataLoading.notifications || dataLoading.banners
  
  if (loading) return (
    <div className="app-shell">
      <div className="app-header" style={{ padding: '24px var(--margin-side)' }}>
        <div>
          <div className="skeleton" style={{ width: 80, height: 12, borderRadius: 6, marginBottom: 10 }} />
          <div className="skeleton" style={{ width: 150, height: 28, borderRadius: 8 }} />
        </div>
        <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 16, flexShrink: 0 }} />
      </div>
      <div className="container">
        <div className="skeleton" style={{ height: 188, borderRadius: 32, marginBottom: 32 }} />
        <div style={{ marginBottom: 40 }}>
          <div className="skeleton" style={{ width: 100, height: 11, borderRadius: 6, marginBottom: 16, marginLeft: 8 }} />
          <div className="grid-3" style={{ gap: 14 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 96, borderRadius: 24 }} />)}
          </div>
        </div>
        <div>
          <div className="flex justify-between" style={{ marginBottom: 16, padding: '0 8px' }}>
            <div className="skeleton" style={{ width: 100, height: 11, borderRadius: 6 }} />
            <div className="skeleton" style={{ width: 52, height: 11, borderRadius: 6 }} />
          </div>
          <div className="flex flex-col gap-10">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 20 }}>
                <div className="flex items-center gap-14">
                  <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0 }} />
                  <div>
                    <div className="skeleton" style={{ width: 120, height: 14, borderRadius: 6, marginBottom: 8 }} />
                    <div className="skeleton" style={{ width: 88, height: 12, borderRadius: 6 }} />
                  </div>
                </div>
                <div className="skeleton" style={{ width: 60, height: 22, borderRadius: 8, flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  if (!loading && !subscriptions.length && !history.length && !banners.length) return <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--error)' }}>Failed to load dashboard data. Please refresh.</div>

  return (
    <div className="app-shell animate-fade-in">
      {/* Society Removed Alert Banner */}
      <SocietyDisplacedBanner
        notifications={notifications}
        subscriptions={subscriptions}
      />

      {/* Header */}
      <div className="app-header" style={{ padding: '24px var(--margin-side)' }}>
        <div>
          <div className="text-body-sm text-secondary font-medium">{greeting},</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 2 }}>
            {user?.firstName || user?.name?.split(' ')[0] || 'User'} 👋
          </h1>
        </div>
        <Link to="/customer/notifications" className="relative">
          <div className="glass flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 16 }}>
            <Bell size={20} className="text-secondary" />
          </div>
          {unreadCount > 0 && (
            <div style={{ position: 'absolute', top: 10, right: 10, width: 10, height: 10, borderRadius: '50%', background: 'var(--error)', border: '2px solid var(--bg-primary)' }} />
          )}
        </Link>
      </div>

      <div className="container">
        {/* Banner Carousel */}
        {banners.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <BannerCarousel banners={banners} />
          </div>
        )}

        {/* Active Subscription Card */}
        {activeSub ? (
          <Link to="/customer/subscriptions" className="glass animate-fade-in" style={{ padding: '24px 28px', borderRadius: 32, marginBottom: 32, display: 'block', background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.07) 100%)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)' }}>
            <div className="flex justify-between items-start" style={{ marginBottom: 20 }}>
              <div>
                <div className="text-label text-lime mb-6" style={{ letterSpacing: '0.05em' }}>ACTIVE PLAN</div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800 }}>{activeSub.package?.name || 'Standard Plan'}</h2>
                <div className="text-body-xs text-secondary" style={{ marginTop: 4 }}>
                  Expires: {new Date(activeSub.endDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 32,
                  fontWeight: 800,
                  lineHeight: 1,
                  color: 'var(--accent-lime)'
                }}>
                  {remainingDays}
                </div>
                <div className="text-label text-secondary" style={{ fontSize: 9, letterSpacing: '0.05em' }}>DAYS LEFT</div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: 20 }}>
              <div className="flex justify-between text-body-xs text-secondary" style={{ marginBottom: 6, fontWeight: 600 }}>
                <span>Plan Progress</span>
                <span>{activeSub.completedDays || 0} / {activeSub.totalDays || 30} cleans</span>
              </div>
              <div style={{ width: '100%', height: 6, background: 'var(--bg-glass)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                <div style={{ 
                  width: `${Math.min(100, ((activeSub.completedDays || 0) / (activeSub.totalDays || 30)) * 100)}%`, 
                  height: '100%', 
                  background: 'linear-gradient(90deg, var(--primary-blue) 0%, var(--accent-lime) 100%)',
                  borderRadius: 3,
                  transition: 'width 0.8s ease'
                }} />
              </div>
            </div>

            {/* Details Grid */}
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px 20px', 
              padding: '16px 0', 
              borderTop: '1px solid var(--divider)', 
              borderBottom: '1px solid var(--divider)', 
              marginBottom: 16 
            }}>
              <div>
                <div className="text-label text-tertiary mb-4" style={{ fontSize: 9, letterSpacing: '0.05em' }}>VEHICLE</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Car size={14} className="text-secondary" />
                  <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeSub.vehicle?.brand} {activeSub.vehicle?.model}</span>
                </div>
                <div className="text-body-xs text-secondary" style={{ marginLeft: 20 }}>{activeSub.vehicle?.number}</div>
              </div>

              <div>
                <div className="text-label text-tertiary mb-4" style={{ fontSize: 9, letterSpacing: '0.05em' }}>TIME SLOT</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} className="text-secondary" />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{formatSlot(activeSub.slot)}</span>
                </div>
              </div>

              <div>
                <div className="text-label text-tertiary mb-4" style={{ fontSize: 9, letterSpacing: '0.05em' }}>CLEANER</div>
                {activeSub.assignedCleaner ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <User size={14} className="text-secondary" />
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{activeSub.assignedCleaner.name}</span>
                      {activeSub.assignedCleaner.rating && (
                        <span style={{ fontSize: 11, color: '#FFB800', display: 'flex', alignItems: 'center', gap: 2 }}>
                          ★<span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{activeSub.assignedCleaner.rating}</span>
                        </span>
                      )}
                    </div>
                    <div className="text-body-xs text-secondary" style={{ marginLeft: 20 }}>{activeSub.assignedCleaner.phone}</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="animate-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFB800' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>Assigning...</span>
                  </div>
                )}
              </div>

              <div>
                <div className="text-label text-tertiary mb-4" style={{ fontSize: 9, letterSpacing: '0.05em' }}>NEXT CLEAN</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} className="text-secondary" />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    {activeSub.nextWash ? new Date(activeSub.nextWash).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-body-xs font-bold" style={{ color: 'var(--primary-blue)' }}>
              <span>Manage Plan & Support</span>
              <ChevronRight size={14} />
            </div>
          </Link>
        ) : (
          <div className="glass animate-fade-in-up overflow-hidden relative" style={{ marginBottom: 32, borderRadius: 32, border: expiredTrial ? '1px solid rgba(var(--bg-accent-rgb), 0.3)' : '1px solid var(--border-glass)' }}>
            <div style={{ position: 'absolute', top: -50, right: -50, width: 150, height: 150, background: expiredTrial ? 'var(--error)' : 'var(--bg-accent)', opacity: 0.1, borderRadius: '50%', filter: 'blur(40px)' }} />
            <div style={{ position: 'absolute', bottom: -50, left: -50, width: 150, height: 150, background: 'var(--primary-blue)', opacity: 0.1, borderRadius: '50%', filter: 'blur(40px)' }} />
            
            <div style={{ padding: '40px 24px', position: 'relative', zIndex: 1, textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: 24, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                {expiredTrial ? <Clock size={32} color="#ff5555" /> : <Car size={32} color="var(--text-accent)" />}
              </div>
              
              <div className="text-label mb-8" style={{ color: expiredTrial ? '#ff5555' : 'var(--text-accent)', letterSpacing: '0.05em' }}>
                {expiredTrial ? 'TRIAL EXPIRED' : 'NO ACTIVE PLAN'}
              </div>
              
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, marginBottom: 12 }}>
                {expiredTrial ? 'Keep the Shine Going' : 'Your Garage is Waiting'}
              </h2>
              
              <p className="text-secondary text-body-sm mb-32 leading-relaxed" style={{ maxWidth: 300, margin: '0 auto 32px' }}>
                {expiredTrial 
                  ? 'Your trial service has ended. Subscribe now to ensure your vehicle stays in showroom condition every single day.'
                  : 'Unlock daily premium exterior cleaning and regular interior detailing. Let our experts keep your car in showroom condition.'}
              </p>
              
              <Link to="/customer/packages" className="btn btn-primary w-full shadow-lg" style={{ borderRadius: 16, padding: '18px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                <span>{expiredTrial ? 'Renew Subscription' : 'Explore Premium Plans'}</span>
                <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="animate-fade-in-up delay-1" style={{ marginBottom: 40 }}>
          <div className="text-label" style={{ marginBottom: 16, color: 'var(--text-tertiary)', paddingLeft: 8 }}>Quick Services</div>
          
          {expiredTrial && (
            <div className="glass animate-pulse" style={{ padding: '16px 20px', borderRadius: 20, marginBottom: 16, background: 'rgba(var(--bg-accent-rgb), 0.05)', border: '1px solid rgba(var(--bg-accent-rgb), 0.2)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--bg-accent)' }} />
              <p className="text-body-sm font-bold" style={{ color: 'var(--text-accent)', margin: 0 }}>Trial Expired! Purchase a plan to continue.</p>
            </div>
          )}

          <div className="quick-actions-grid">
            {[
              activeSub ? {
                icon: Calendar,
                label: 'Extend Service',
                to: `/customer/packages?extend=true&vehicleId=${activeSub.vehicle?._id}`,
                color: 'var(--text-accent)',
                bg: 'rgba(var(--bg-accent-rgb), 0.1)',
                disabled: false
              } : {
                icon: Calendar,
                label: 'New Booking',
                to: '/customer/packages',
                color: 'var(--text-accent)',
                bg: 'rgba(var(--bg-accent-rgb), 0.1)',
                disabled: false
              },
              { icon: SkipForward, label: 'Skip Days', to: '/customer/skip', color: 'var(--primary-blue)', bg: 'rgba(0,122,255,0.1)', disabled: !hasRemainingDays },
              { icon: Car, label: 'My Garage', to: '/customer/vehicles', color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.05)', disabled: false },
            ].map((a, i) => {
              const content = (
                <>
                  <div className="quick-action-icon-wrapper" style={{ background: a.bg }}>
                    <a.icon size={22} style={{ color: a.color, opacity: a.disabled ? 0.35 : 1 }} />
                  </div>
                  <span className="quick-action-label" style={{ color: a.disabled ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                    {a.label}
                  </span>
                </>
              );

              return a.disabled ? (
                <div key={i} className="glass quick-action-btn" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                  {content}
                </div>
              ) : (
                <Link key={i} to={a.to} className="glass quick-action-btn">
                  {content}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="animate-fade-in-up delay-2" style={{ marginBottom: 40 }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 16, padding: '0 8px' }}>
            <span className="text-label" style={{ color: 'var(--text-tertiary)' }}>Recent Activity</span>
            <Link to="/customer/history" className="text-body-sm font-bold" style={{ color: 'var(--primary-blue)' }}>View All</Link>
          </div>
          <div className="flex flex-col gap-10">
            {recentActivity.length === 0 ? (
              <div className="glass text-center text-secondary text-body-sm py-32" style={{ borderRadius: 24 }}>
                No recent activity yet.
              </div>
            ) : (
              recentActivity.map(a => {
                const Icon = a.kind === 'order' ? ShoppingBag : a.kind === 'purchase' ? CreditCard : Check
                const status = (a.status || '').toString()
                const positive = ['completed', 'active', 'delivered'].includes(status.toLowerCase())
                const negative = ['cancelled', 'expired', 'failed'].includes(status.toLowerCase())
                const chipClass = positive ? 'chip-success' : negative ? 'chip-error' : 'chip-ghost'
                const iconColor = positive ? 'var(--success)' : 'var(--text-tertiary)'
                return (
                  <div key={a.id} className="glass" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 24 }}>
                    <div className="flex items-center gap-14">
                      <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.03)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={20} color={iconColor} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700 }}>{a.title}</div>
                        <div className="text-body-sm text-secondary font-medium">{a.subtitle}</div>
                      </div>
                    </div>
                    {status && (
                      <span className={`chip ${chipClass}`} style={{ borderRadius: 8, fontSize: 9 }}>
                        {status.toUpperCase()}
                      </span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function BannerCarousel({ banners }) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % banners.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [banners.length])

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: 32, overflow: 'hidden', aspectRatio: '16/9' }}>
      <div style={{ 
        display: 'flex', 
        width: `${banners.length * 100}%`, 
        height: '100%',
        transform: `translateX(-${(current * 100) / banners.length}%)`,
        transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {banners.map((b, i) => (
          <div key={b._id} style={{ 
            width: `${100 / banners.length}%`, 
            height: '100%',
            position: 'relative',
            background: `url(${b.imageUrl}) center/cover no-repeat`
          }}>
            <div style={{ 
              position: 'absolute', inset: 0, 
              background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)',
              padding: '32px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
            }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'white', maxWidth: '80%', lineHeight: 1.1, marginBottom: 8 }}>{b.title}</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', maxWidth: '90%', marginBottom: 16 }}>{b.description}</p>
              <Link to={b.link || '/customer/packages'} className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start', padding: '10px 24px', borderRadius: 12 }}>
                Claim Now
              </Link>
            </div>
          </div>
        ))}
      </div>

      {banners.length > 1 && (
        <div style={{ position: 'absolute', bottom: 16, right: 28, display: 'flex', gap: 6 }}>
          {banners.map((_, i) => (
            <div 
              key={i} 
              onClick={() => setCurrent(i)}
              style={{ 
                width: current === i ? 24 : 6, 
                height: 6, 
                borderRadius: 3, 
                background: current === i ? 'var(--bg-accent)' : 'var(--border-glass-hover)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }} 
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── SOCIETY DISPLACED BANNER ────────────────────
function SocietyDisplacedBanner({ notifications, subscriptions }) {
  const [dismissed, setDismissed] = useState(false)
  const [mode, setMode] = useState(null) // 'select' | 'request'
  const [societies, setSocieties] = useState([])
  const [selectedSociety, setSelectedSociety] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [reqForm, setReqForm] = useState({ requestedSociety: '', requestedArea: '', city: '', pincode: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // Detect if there is an unread society-removed notification
  const societyAlert = (notifications || []).find(
    n => !n.read && n.type === 'alert' && n.data?.societyRemoved
  )
  // Find the affected active subscription
  const activeSub = (subscriptions || []).find(s => s.status === 'Active')

  if (!societyAlert || dismissed) return null

  const openSelectMode = async () => {
    setMode('select')
    setError('')
    setSuccess('')
    if (societies.length === 0) {
      try {
        const res = await apiClient.get('/customer/societies')
        setSocieties(res.societies || [])
      } catch {
        setError('Failed to load societies. Please try again.')
      }
    }
  }

  const slotsForSelected = societies.find(s => s._id === selectedSociety)?.slots || []

  const handleChangeSociety = async () => {
    if (!selectedSociety || !selectedSlot) {
      setError('Please select a society and a time slot.')
      return
    }
    if (!activeSub) {
      setError('No active subscription found to update.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await apiClient.post('/customer/change-society', {
        subscriptionId: activeSub._id,
        newSocietyId: selectedSociety,
        newSlotId: selectedSlot,
      })
      setSuccess('Society updated! Your plan and vehicle info are preserved. 🎉')
      setTimeout(() => setDismissed(true), 2500)
    } catch (err) {
      setError(err?.message || 'Failed to update society. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestSociety = async () => {
    if (!reqForm.requestedSociety || !reqForm.city) {
      setError('Society name and city are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await apiClient.post('/customer/request-society', reqForm)
      setSuccess('Request submitted! Our team will reach out to you soon. 🙌')
      setTimeout(() => setDismissed(true), 2500)
    } catch (err) {
      setError(err?.message || 'Failed to submit request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating Banner */}
      {!mode && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 2000,
          background: 'linear-gradient(135deg, rgba(255,69,58,0.15) 0%, rgba(255,69,58,0.08) 100%)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,69,58,0.3)',
          padding: '14px 20px',
          display: 'flex', alignItems: 'flex-start', gap: 12
        }}>
          <AlertTriangle size={20} color="var(--error)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--error)', marginBottom: 4 }}>
              {societyAlert.title}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
              {societyAlert.message}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={openSelectMode}
                style={{
                  padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  background: 'var(--primary-blue)', color: '#fff', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                <MapPin size={14} /> Select New Society
              </button>
              <button
                onClick={() => { setMode('request'); setError(''); setSuccess('') }}
                style={{
                  padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)',
                  border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                <Send size={14} /> Request My Society
              </button>
            </div>
          </div>
          <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* Modal: Select New Society */}
      {mode === 'select' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{
            width: '100%', maxWidth: 500, padding: 28, borderRadius: '24px 24px 0 0',
            background: 'var(--bg-elevated)', border: '1px solid var(--border-glass)',
            maxHeight: '85vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800 }}>Select New Society</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Your plan and vehicle will remain the same.</p>
              </div>
              <button onClick={() => setMode(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,69,58,0.1)', color: 'var(--error)', fontSize: 13, marginBottom: 16 }}>{error}</div>}
            {success && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(50,215,75,0.1)', color: 'var(--success)', fontSize: 13, marginBottom: 16 }}>{success}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>SELECT SOCIETY</label>
                <select
                  value={selectedSociety}
                  onChange={e => { setSelectedSociety(e.target.value); setSelectedSlot('') }}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', fontSize: 14 }}
                >
                  <option value="">-- Choose a society --</option>
                  {societies.map(s => (
                    <option key={s._id} value={s._id}>{s.name} — {s.city}</option>
                  ))}
                </select>
              </div>

              {selectedSociety && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>SELECT TIME SLOT</label>
                  <select
                    value={selectedSlot}
                    onChange={e => setSelectedSlot(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', fontSize: 14 }}
                  >
                    <option value="">-- Choose a slot --</option>
                    {slotsForSelected.filter(sl => sl.status === 'Open' && sl.currentCount < sl.maxVehicles).map(sl => (
                      <option key={sl.slotId} value={sl.slotId}>{sl.timeWindow} ({sl.maxVehicles - sl.currentCount} spots left)</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handleChangeSociety}
                disabled={loading || !selectedSociety || !selectedSlot}
                style={{
                  padding: '14px', borderRadius: 14, fontSize: 15, fontWeight: 700,
                  background: loading || !selectedSociety || !selectedSlot ? 'var(--bg-glass)' : 'var(--primary-blue)',
                  color: loading || !selectedSociety || !selectedSlot ? 'var(--text-tertiary)' : '#fff',
                  border: 'none', cursor: loading || !selectedSociety || !selectedSlot ? 'not-allowed' : 'pointer',
                  marginTop: 4
                }}
              >
                {loading ? 'Updating...' : 'Confirm New Society'}
              </button>

              <button
                onClick={() => { setMode('request'); setError(''); setSuccess('') }}
                style={{ padding: '12px', borderRadius: 14, fontSize: 14, fontWeight: 600, background: 'transparent', color: 'var(--primary-blue)', border: 'none', cursor: 'pointer' }}
              >
                My society isn't listed — Request it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Request Society */}
      {mode === 'request' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{
            width: '100%', maxWidth: 500, padding: 28, borderRadius: '24px 24px 0 0',
            background: 'var(--bg-elevated)', border: '1px solid var(--border-glass)',
            maxHeight: '85vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800 }}>Request My Society</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>We'll review and reach out to you.</p>
              </div>
              <button onClick={() => setMode(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,69,58,0.1)', color: 'var(--error)', fontSize: 13, marginBottom: 16 }}>{error}</div>}
            {success && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(50,215,75,0.1)', color: 'var(--success)', fontSize: 13, marginBottom: 16 }}>{success}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>SOCIETY NAME *</label>
                <input
                  value={reqForm.requestedSociety}
                  onChange={e => setReqForm(p => ({ ...p, requestedSociety: e.target.value }))}
                  placeholder="e.g. Gokuldham Society"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>CITY *</label>
                <input
                  value={reqForm.city}
                  onChange={e => setReqForm(p => ({ ...p, city: e.target.value }))}
                  placeholder="e.g. Pune"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>AREA / LOCALITY</label>
                <input
                  value={reqForm.requestedArea}
                  onChange={e => setReqForm(p => ({ ...p, requestedArea: e.target.value }))}
                  placeholder="e.g. Wagholi"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>PINCODE</label>
                <input
                  value={reqForm.pincode}
                  onChange={e => setReqForm(p => ({ ...p, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                  placeholder="6-digit pincode"
                  inputMode="numeric"
                  maxLength={6}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>

              <button
                onClick={handleRequestSociety}
                disabled={loading}
                style={{
                  padding: '14px', borderRadius: 14, fontSize: 15, fontWeight: 700,
                  background: loading ? 'var(--bg-glass)' : 'var(--primary-blue)',
                  color: loading ? 'var(--text-tertiary)' : '#fff',
                  border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
              >
                <Send size={16} /> {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
