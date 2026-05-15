import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell, ChevronRight, Calendar, SkipForward, Clock, Car, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import apiClient from '../../services/apiClient'
import { useCustomerData } from '../../context/CustomerDataContext'

export default function CustomerHome() {
  const { user } = useAuth()
  const { 
    subscriptions, history, notifications, banners, 
    loading: dataLoading 
  } = useCustomerData()

  const activeSub = (subscriptions || []).find(s => s.status === 'Active') || null
  const unreadCount = (notifications || []).filter(n => !n.read).length
  const recentHistory = (history || []).slice(0, 3)


  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  const loading = dataLoading.subscriptions || dataLoading.history || dataLoading.notifications || dataLoading.banners
  
  if (loading) return (
    <div className="app-shell">
      <div className="app-header" style={{ padding: '24px var(--margin-side)', background: 'transparent' }}>
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
      {/* Header */}
      <div className="app-header" style={{ padding: '24px var(--margin-side)', background: 'transparent' }}>
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
          <Link to="/customer/subscriptions" className="glass animate-fade-in" style={{ padding: '24px 28px', borderRadius: 32, marginBottom: 32, display: 'block', background: 'var(--bg-glass-hover)', border: '1px solid var(--border-glass)' }}>
            <div className="flex justify-between items-start" style={{ marginBottom: 20 }}>
              <div>
                <div className="text-label text-lime mb-4">Active Plan</div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800 }}>{activeSub.package?.name}</h2>
              </div>
              <div className="glass flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 14 }}>
                <Car size={22} className="text-secondary" />
              </div>
            </div>
            
            <div className="flex items-center gap-20">
              <div>
                <div className="text-label text-tertiary mb-2">Vehicle</div>
                <div className="text-body-sm font-bold">{activeSub.vehicle?.brand} {activeSub.vehicle?.model}</div>
              </div>
              <div style={{ width: 1, height: 24, background: 'var(--divider)' }} />
              <div>
                <div className="text-label text-tertiary mb-2">Next Clean</div>
                <div className="text-body-sm font-bold">{activeSub.nextServiceDate ? new Date(activeSub.nextServiceDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—'}</div>
              </div>
            </div>
          </Link>
        ) : (
          <div className="glass animate-fade-in-up" style={{ padding: 40, marginBottom: 32, textAlign: 'center', borderRadius: 32 }}>
            <div style={{ width: 64, height: 64, background: 'rgba(223, 255, 0, 0.1)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Calendar size={32} color="var(--accent-lime)" />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Ready for a clean car?</h3>
            <p className="text-secondary text-body-sm mb-24">Subscribe to a plan and keep your vehicle shiny every day.</p>
            <Link to="/customer/packages" className="btn btn-primary w-full" style={{ borderRadius: 16, padding: 18 }}>Explore Packages</Link>
          </div>
        )}

        {/* Quick Actions */}
        <div className="animate-fade-in-up delay-1" style={{ marginBottom: 40 }}>
          <div className="text-label" style={{ marginBottom: 16, color: 'var(--text-tertiary)', paddingLeft: 8 }}>Quick Services</div>
          <div className="grid-3" style={{ gap: 14 }}>
            {[
              { icon: Calendar, label: 'New Booking', to: '/customer/booking', color: 'var(--accent-lime)', bg: 'rgba(223,255,0,0.1)' },
              { icon: SkipForward, label: 'Skip Today', to: '/customer/skip', color: 'var(--primary-blue)', bg: 'rgba(0,122,255,0.1)' },
              { icon: Car, label: 'My Garage', to: '/customer/vehicles', color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.05)' },
            ].map((a, i) => (
              <Link key={i} to={a.to} className="glass" style={{ padding: '24px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, borderRadius: 24 }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <a.icon size={24} style={{ color: a.color }} />
                </div>
                <span className="text-body-sm" style={{ fontWeight: 700 }}>{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="animate-fade-in-up delay-2" style={{ marginBottom: 40 }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 16, padding: '0 8px' }}>
            <span className="text-label" style={{ color: 'var(--text-tertiary)' }}>Recent Service</span>
            <Link to="/customer/history" className="text-body-sm font-bold" style={{ color: 'var(--primary-blue)' }}>View All</Link>
          </div>
          <div className="flex flex-col gap-10">
            {recentHistory.length === 0 ? (
              <div className="glass text-center text-secondary text-body-sm py-32" style={{ borderRadius: 24 }}>
                No recent service history yet.
              </div>
            ) : (
              recentHistory.map(s => (
                <div key={s._id} className="glass" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 24 }}>
                  <div className="flex items-center gap-14">
                    <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.03)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={20} color={s.status === 'completed' ? 'var(--success)' : 'var(--text-tertiary)'} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{s.packageName || 'Cleaning Service'}</div>
                      <div className="text-body-sm text-secondary font-medium">
                        {new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} <span style={{ opacity: 0.3 }}>•</span> {s.scheduledTime || s.completedTime || ''}
                      </div>
                    </div>
                  </div>
                  <span className={`chip ${s.status === 'completed' ? 'chip-success' : s.status === 'skipped' ? 'chip-ghost' : 'chip-error'}`} style={{ borderRadius: 8, fontSize: 9 }}>
                    {s.status.toUpperCase()}
                  </span>
                </div>
              ))
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
                background: current === i ? 'var(--accent-lime)' : 'rgba(255,255,255,0.3)',
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
