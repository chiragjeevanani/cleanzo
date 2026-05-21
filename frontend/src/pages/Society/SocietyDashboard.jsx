import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Award, ShieldAlert, CreditCard, DollarSign, Percent, ArrowUpRight } from 'lucide-react'
import apiClient from '../../services/apiClient'
import PageLoader from '../../components/PageLoader'

export default function SocietyDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await apiClient.get('/society/dashboard')
        if (res.success) {
          setStats(res.dashboard)
        } else {
          setError(res.message || 'Failed to load dashboard data')
        }
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) return <PageLoader />

  if (error) {
    return (
      <div className="glass-solid text-center" style={{ padding: 40, margin: '20px auto', maxWidth: 500 }}>
        <h3 style={{ color: 'var(--error)', marginBottom: 12 }}>Error Loading Dashboard</h3>
        <p className="text-secondary" style={{ marginBottom: 20 }}>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Try Again</button>
      </div>
    )
  }

  const kpis = [
    {
      title: 'Total Residents Joined',
      value: stats.totalMembers,
      subtitle: 'Joined using Cleanzo app',
      icon: Users,
      color: 'var(--primary-blue)',
      bg: 'rgba(0, 122, 255, 0.1)'
    },
    {
      title: 'Active Subscriptions',
      value: stats.activeSubscriptionsCount,
      subtitle: 'Currently active paid plans',
      icon: Award,
      color: 'var(--success)',
      bg: 'rgba(48, 209, 88, 0.1)'
    },
    {
      title: 'Trial-Only Members',
      value: stats.trialOnlyCount,
      subtitle: 'Never converted to paid',
      icon: ShieldAlert,
      color: 'var(--warning)',
      bg: 'rgba(255, 214, 10, 0.1)'
    },
    {
      title: 'Total Earned',
      value: `₹${stats.totalCommissionEarned.toLocaleString()}`,
      subtitle: 'Lifetime commission earnings',
      icon: DollarSign,
      color: 'var(--accent-lime)',
      bg: 'rgba(223, 255, 0, 0.1)'
    },
    {
      title: 'Pending Payout Balance',
      value: `₹${stats.pendingBalance.toLocaleString()}`,
      subtitle: 'Available to withdraw',
      icon: CreditCard,
      color: 'var(--primary-blue)',
      bg: 'rgba(0, 122, 255, 0.1)'
    },
    {
      title: 'Your Commission Rate',
      value: `${stats.commissionRate}%`,
      subtitle: 'Of subscription value',
      icon: Percent,
      color: 'var(--text-secondary)',
      bg: 'var(--bg-glass)'
    }
  ]

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
          {stats.societyName}
        </h1>
        <p className="text-secondary">Society Partner Dashboard</p>
      </div>

      {/* KPI Grid */}
      <div className="grid-3" style={{ gap: 24 }}>
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon
          return (
            <div key={idx} className="glass premium-gradient" style={{
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 160,
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <span className="text-label" style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{kpi.title}</span>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: kpi.bg,
                  color: kpi.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={18} />
                </div>
              </div>
              <div>
                <div className="text-headline-sm" style={{ fontWeight: 800, color: kpi.color === 'var(--accent-lime)' ? 'var(--text-primary)' : kpi.color }}>
                  {kpi.value}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{kpi.subtitle}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Payout Promo Banner */}
      <div className="glass premium-gradient" style={{
        padding: 32,
        borderRadius: 'var(--radius)',
        background: 'linear-gradient(135deg, rgba(var(--primary-blue-rgb), 0.15) 0%, rgba(223, 255, 0, 0.03) 100%)',
        border: '1px solid var(--border-glass)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 24
      }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Commission Earnings
          </h3>
          <p className="text-secondary" style={{ maxWidth: 600, fontSize: 14 }}>
            Earn commissions on every paid subscription purchased or renewed by residents of your society. 
            Withdraw your earnings directly to your bank account or UPI ID.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
              Pending Balance
            </div>
            <div className="text-headline-sm" style={{ fontWeight: 800 }}>
              ₹{stats.pendingBalance.toLocaleString()}
            </div>
          </div>
          <button 
            className="btn btn-primary btn-lg" 
            style={{ 
              background: 'var(--primary-blue)', 
              color: '#fff', 
              boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)' 
            }}
            onClick={() => navigate('/society/commissions')}
          >
            <span>Request Payout</span>
            <ArrowUpRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
