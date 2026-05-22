import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, CreditCard, TrendingUp, UserCog, ArrowUpRight, ArrowDownRight, FileText, CheckCircle, XCircle, PlusCircle, Trash2, Calendar, UserMinus, AlertCircle, Clock, Sparkles, Layers, RotateCcw, ShoppingCart, LifeBuoy } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import apiClient from '../../services/apiClient'

const pieColors = ['var(--text-tertiary)', 'var(--primary-blue)', '#DFFF00', 'var(--accent-lime)']

const ICON_MAP = { Users, CreditCard, TrendingUp, UserCog, UserMinus, AlertCircle }

const ACTIVITY_ICONS = {
  user_created: { icon: PlusCircle, color: 'var(--primary-blue)' },
  user_deleted: { icon: Trash2, color: 'var(--error)' },
  cleaner_created: { icon: UserCog, color: 'var(--accent-lime)' },
  cleaner_deleted: { icon: Trash2, color: 'var(--error)' },
  application_submitted: { icon: FileText, color: 'var(--warning)' },
  kyc_approved: { icon: CheckCircle, color: 'var(--success)' },
  kyc_rejected: { icon: XCircle, color: 'var(--error)' },
  subscription_created: { icon: CreditCard, color: 'var(--accent-lime)' },
  task_completed: { icon: CheckCircle, color: 'var(--success)' },
  system: { icon: Calendar, color: 'var(--text-tertiary)' }
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await apiClient.get('/admin/dashboard')
        setStats(res)
      } catch (err) {
        setError('Failed to load dashboard.')
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) return (
    <div>
      <div className="skeleton" style={{ width: 160, height: 28, borderRadius: 8, marginBottom: 28 }} />
      <div className="grid-4" style={{ gap: 16, marginBottom: 28 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass" style={{ padding: 24 }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
              <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 'var(--radius)' }} />
              <div className="skeleton" style={{ width: 48, height: 18, borderRadius: 6 }} />
            </div>
            <div className="skeleton" style={{ width: 100, height: 32, borderRadius: 8, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 130, height: 13, borderRadius: 6 }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 28 }}>
        <div className="glass" style={{ padding: 24 }}>
          <div className="skeleton" style={{ width: 180, height: 20, borderRadius: 8, marginBottom: 20 }} />
          <div className="skeleton" style={{ height: 260, borderRadius: 12 }} />
        </div>
        <div className="glass" style={{ padding: 24 }}>
          <div className="skeleton" style={{ width: 150, height: 20, borderRadius: 8, marginBottom: 20 }} />
          <div className="skeleton" style={{ height: 180, borderRadius: 12, marginBottom: 16 }} />
          <div className="flex flex-col gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex justify-between">
                <div className="skeleton" style={{ width: 70, height: 12, borderRadius: 6 }} />
                <div className="skeleton" style={{ width: 36, height: 12, borderRadius: 6 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="glass" style={{ padding: 24 }}>
        <div className="skeleton" style={{ width: 160, height: 20, borderRadius: 8, marginBottom: 16 }} />
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between' }}>
            <div className="skeleton" style={{ width: '65%', height: 13, borderRadius: 6 }} />
            <div className="skeleton" style={{ width: 60, height: 13, borderRadius: 6 }} />
          </div>
        ))}
      </div>
    </div>
  )

  const kpiData = [
    ...(stats?.kpiData || []).map(k => ({ ...k, icon: ICON_MAP[k.icon] || Users })),
    {
      label: 'Trial (Not Subscribed)',
      value: stats?.trialNotSubscribedCount || 0,
      growth: 0,
      icon: UserMinus,
      color: '#F59E0B'
    },
    {
      label: 'Inactive Subscriptions',
      value: stats?.inactiveSubscriptionsCount || 0,
      growth: 0,
      icon: AlertCircle,
      color: '#EF4444'
    }
  ]

  const isPieDefault = !stats?.pieData
  const pieData = stats?.pieData || [
    { name: 'Basic', value: 3200, color: 'var(--text-tertiary)' },
    { name: 'Premium', value: 3800, color: 'var(--primary-blue)' },
    { name: 'Elite', value: 1234, color: '#DFFF00' },
  ]

  const isRevenueDefault = !stats?.revenueData
  const revenueData = stats?.revenueData || [
    { month: 'Oct', revenue: 95000 },
    { month: 'Nov', revenue: 102000 },
    { month: 'Dec', revenue: 115000 },
    { month: 'Jan', revenue: 112000 },
    { month: 'Feb', revenue: 128000 },
    { month: 'Mar', revenue: 142000 },
    { month: 'Apr', revenue: 165000 },
  ]

  const isCustomerDefault = !stats?.customerData
  const customerData = stats?.customerData || [
    { month: 'Oct', users: 12 },
    { month: 'Nov', users: 18 },
    { month: 'Dec', users: 25 },
    { month: 'Jan', users: 22 },
    { month: 'Feb', users: 30 },
    { month: 'Mar', users: 45 },
    { month: 'Apr', users: 55 },
  ]

  const isSlotDefault = !stats?.slotDistribution
  const slotDistribution = stats?.slotDistribution || [
    { slot: '06_07_AM', count: 42 },
    { slot: '07_08_AM', count: 35 },
    { slot: '08_09_AM', count: 28 },
    { slot: '05_06_PM', count: 15 },
    { slot: '06_07_PM', count: 8 },
  ]

  const mostUsedSlot = stats?.mostUsedSlot && stats?.mostUsedSlot !== 'N/A'
    ? stats.mostUsedSlot 
    : (slotDistribution[0]?.slot || 'N/A')

  const totalSlotCount = slotDistribution.reduce((acc, curr) => acc + curr.count, 0) || 1

  const formatSlotId = (slotId) => {
    if (!slotId || slotId === 'N/A') return 'No Slot Preference';
    const match = slotId.match(/^(\d{2})_(\d{2})_(AM|PM)$/i);
    if (match) {
      const [_, start, end, period] = match;
      return `${parseInt(start)}:00 ${period} - ${parseInt(end)}:00 ${period}`;
    }
    return slotId.replace(/_/g, ' ').replace(/-/g, ' - ').toUpperCase();
  }

  const recentActivity = stats?.recentActivity || []

  const isSubscriptionFlowDefault = !stats?.subscriptionFlow
  const subFlowData = stats?.subscriptionFlow || {
    trialConversionRate: 64,
    skipRatio: 12.5,
    statusCounts: { Active: 142, Paused: 18, Expired: 85, Cancelled: 32 },
    averageMetrics: {
      avgCompleted: 24,
      avgSkipped: 3,
      avgCredited: 1,
      avgAmount: 2999
    },
    monthlyFlow: [
      { month: 'Oct', created: 35, expired: 12 },
      { month: 'Nov', created: 48, expired: 15 },
      { month: 'Dec', created: 52, expired: 22 },
      { month: 'Jan', created: 45, expired: 18 },
      { month: 'Feb', created: 60, expired: 25 },
      { month: 'Mar', created: 78, expired: 30 },
      { month: 'Apr', created: 85, expired: 34 }
    ]
  }

  const statusCounts = subFlowData.statusCounts || { Active: 0, Paused: 0, Expired: 0, Cancelled: 0 }
  const activeCount = statusCounts.Active || 0
  const pausedCount = statusCounts.Paused || 0
  const expiredCount = statusCounts.Expired || 0
  const cancelledCount = statusCounts.Cancelled || 0
  const totalLifecycles = activeCount + pausedCount + expiredCount + cancelledCount
  const retentionRate = totalLifecycles > 0 
    ? Math.round(((activeCount + pausedCount) / totalLifecycles) * 100)
    : 0

  const totalAvgDays = (subFlowData.averageMetrics?.avgCompleted || 0) + 
                       (subFlowData.averageMetrics?.avgSkipped || 0) + 
                       (subFlowData.averageMetrics?.avgCredited || 0) || 1

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, marginBottom: 28 }}>Dashboard</h1>
      
      {/* Tab Switcher Header */}
      <div 
        className="glass animate-fade-in" 
        style={{ 
          padding: 6, 
          borderRadius: 16, 
          background: 'rgba(255, 255, 255, 0.03)', 
          border: '1px solid var(--border-glass)',
          display: 'inline-flex',
          gap: 4,
          marginBottom: 28
        }}
      >
        <button 
          onClick={() => setActiveTab('overview')} 
          style={{ 
            padding: '8px 20px', 
            borderRadius: 12, 
            border: 'none',
            background: activeTab === 'overview' ? 'var(--bg-glass)' : 'transparent',
            color: activeTab === 'overview' ? 'var(--text-primary)' : 'var(--text-tertiary)',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: activeTab === 'overview' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <TrendingUp size={15} style={{ color: activeTab === 'overview' ? 'var(--primary-blue)' : 'var(--text-tertiary)' }} />
          Overview
        </button>
        <button 
          onClick={() => setActiveTab('subscription-flow')} 
          style={{ 
            padding: '8px 20px', 
            borderRadius: 12, 
            border: 'none',
            background: activeTab === 'subscription-flow' ? 'var(--bg-glass)' : 'transparent',
            color: activeTab === 'subscription-flow' ? 'var(--text-primary)' : 'var(--text-tertiary)',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: activeTab === 'subscription-flow' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <Sparkles size={15} style={{ color: activeTab === 'subscription-flow' ? 'var(--accent-lime)' : 'var(--text-tertiary)' }} />
          Subscription Flow
        </button>
      </div>
      
      <style>{`
        @keyframes dotPulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); transform: scale(1); }
          70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); transform: scale(1.1); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); transform: scale(1); }
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }
        @media (max-width: 1024px) {
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .kpi-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Action Required / Pending Requests Grid */}
      {stats && (stats.pendingApplicationsCount > 0 || stats.pendingLeavesCount > 0 || stats.pendingOrdersCount > 0 || stats.pendingGrievancesCount > 0 || stats.pendingLeadsCount > 0) && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', animation: 'dotPulse 2s infinite' }} />
            Action Required
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {stats.pendingApplicationsCount > 0 && (
              <div 
                onClick={() => navigate('/admin/applications')}
                className="glass hover-glow animate-scale-in"
                style={{ 
                  padding: 20, 
                  borderRadius: 20, 
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.02) 100%)',
                  border: '1px solid rgba(59, 130, 246, 0.15)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 130
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
                    <UserCog size={18} />
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 900, color: '#3B82F6', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 8px', borderRadius: 8 }}>
                    {stats.pendingApplicationsCount}
                  </span>
                </div>
                <div style={{ marginTop: 12 }}>
                  <h4 style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Cleaner KYC</h4>
                  <p className="text-secondary" style={{ fontSize: 12, marginTop: 4 }}>Pending applications/KYC approvals</p>
                </div>
              </div>
            )}

            {stats.pendingLeavesCount > 0 && (
              <div 
                onClick={() => navigate('/admin/leaves')}
                className="glass hover-glow animate-scale-in"
                style={{ 
                  padding: 20, 
                  borderRadius: 20, 
                  background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.08) 0%, rgba(236, 72, 153, 0.02) 100%)',
                  border: '1px solid rgba(236, 72, 153, 0.15)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 130
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EC4899' }}>
                    <Calendar size={18} />
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 900, color: '#EC4899', background: 'rgba(236, 72, 153, 0.1)', padding: '2px 8px', borderRadius: 8 }}>
                    {stats.pendingLeavesCount}
                  </span>
                </div>
                <div style={{ marginTop: 12 }}>
                  <h4 style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Leave Requests</h4>
                  <p className="text-secondary" style={{ fontSize: 12, marginTop: 4 }}>Pending leave approval requests</p>
                </div>
              </div>
            )}

            {stats.pendingOrdersCount > 0 && (
              <div 
                onClick={() => navigate('/admin/marketplace')}
                className="glass hover-glow animate-scale-in"
                style={{ 
                  padding: 20, 
                  borderRadius: 20, 
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.02) 100%)',
                  border: '1px solid rgba(245, 158, 11, 0.15)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 130
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
                    <ShoppingCart size={18} />
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 900, color: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: 8 }}>
                    {stats.pendingOrdersCount}
                  </span>
                </div>
                <div style={{ marginTop: 12 }}>
                  <h4 style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Marketplace Orders</h4>
                  <p className="text-secondary" style={{ fontSize: 12, marginTop: 4 }}>Placed/Confirmed orders to process</p>
                </div>
              </div>
            )}

            {stats.pendingGrievancesCount > 0 && (
              <div 
                onClick={() => navigate('/admin/grievances')}
                className="glass hover-glow animate-scale-in"
                style={{ 
                  padding: 20, 
                  borderRadius: 20, 
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(168, 85, 247, 0.02) 100%)',
                  border: '1px solid rgba(168, 85, 247, 0.15)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 130
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A855F7' }}>
                    <LifeBuoy size={18} />
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 900, color: '#A855F7', background: 'rgba(168, 85, 247, 0.1)', padding: '2px 8px', borderRadius: 8 }}>
                    {stats.pendingGrievancesCount}
                  </span>
                </div>
                <div style={{ marginTop: 12 }}>
                  <h4 style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Grievances</h4>
                  <p className="text-secondary" style={{ fontSize: 12, marginTop: 4 }}>Open/In Progress support tickets</p>
                </div>
              </div>
            )}

            {stats.pendingLeadsCount > 0 && (
              <div 
                onClick={() => navigate('/admin/leads')}
                className="glass hover-glow animate-scale-in"
                style={{ 
                  padding: 20, 
                  borderRadius: 20, 
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.15)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 130
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                    <Users size={18} />
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 900, color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: 8 }}>
                    {stats.pendingLeadsCount}
                  </span>
                </div>
                <div style={{ marginTop: 12 }}>
                  <h4 style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Leads</h4>
                  <p className="text-secondary" style={{ fontSize: 12, marginTop: 4 }}>Pending societal lead requests</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      {activeTab === 'overview' && (
        <>
          {/* KPI Cards */}
          <div className="kpi-grid">
            {kpiData.map((k, i) => {
              const handleCardClick = () => {
                if (k.label === 'Total Users') {
                  navigate('/admin/users')
                } else if (k.label === 'Subscriptions') {
                  navigate('/admin/subscriptions?filter=Active')
                } else if (k.label === 'Total Revenue') {
                  navigate('/admin/revenue')
                } else if (k.label === 'Pending Orders') {
                  navigate('/admin/marketplace')
                } else if (k.label === 'Trial (Not Subscribed)') {
                  navigate('/admin/subscriptions?filter=trial')
                } else if (k.label === 'Inactive Subscriptions') {
                  navigate('/admin/subscriptions?filter=Expired')
                }
              }

              return (
                <div 
                  key={i} 
                  onClick={handleCardClick}
                  className="glass hover-glow animate-fade-in" 
                  style={{ 
                    padding: 24, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between', 
                    minHeight: 160,
                    cursor: 'pointer'
                  }}
                >
                  <div>
                    <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 'var(--radius)', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <k.icon size={20} style={{ color: k.color }} />
                      </div>
                      {k.growth !== 0 && (
                        <div className="flex items-center gap-4" style={{ fontSize: 13, fontWeight: 600, color: k.growth > 0 ? 'var(--success)' : 'var(--error)' }}>
                          {k.growth > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          {Math.abs(k.growth)}%
                        </div>
                      )}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em' }}>
                      {typeof k.value === 'number' ? k.value.toLocaleString() : k.value}
                    </div>
                    <div className="text-body-sm text-secondary" style={{ marginTop: 4 }}>{k.label}</div>
                  </div>

                  {/* Revenue Split Breakdown */}
                  {k.label === 'Total Revenue' && stats && (
                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--divider)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span className="text-secondary flex items-center gap-6">
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#007AFF', display: 'inline-block' }} />
                          Subscription
                        </span>
                        <span style={{ fontWeight: 600 }}>₹{(stats.subscriptionRevenue || 0).toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span className="text-secondary flex items-center gap-6">
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#DFFF00', display: 'inline-block' }} />
                          Marketplace
                        </span>
                        <span style={{ fontWeight: 600 }}>₹{(stats.marketplaceRevenue || 0).toLocaleString()}</span>
                      </div>
                      {/* Visual mini progress bar for split */}
                      {stats.revenue > 0 && (
                        <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', display: 'flex', marginTop: 4 }}>
                          <div style={{ 
                            width: `${((stats.subscriptionRevenue || 0) / stats.revenue) * 100}%`, 
                            background: '#007AFF', 
                            height: '100%' 
                          }} />
                          <div style={{ 
                            width: `${((stats.marketplaceRevenue || 0) / stats.revenue) * 100}%`, 
                            background: '#DFFF00', 
                            height: '100%' 
                          }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 28 }}>
            {/* Revenue Chart */}
            <div className="glass" style={{ padding: 24 }}>
              <div className="flex justify-between items-center" style={{ marginBottom: 20 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Revenue Overview</span>
                {stats && (
                  <div className="flex items-center gap-14" style={{ fontSize: 12 }}>
                    <span className="flex items-center gap-6">
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#007AFF', display: 'inline-block' }} />
                      Subscription: <strong>₹{(stats.subscriptionRevenue || 0).toLocaleString()}</strong>
                    </span>
                    <span className="flex items-center gap-6">
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DFFF00', display: 'inline-block' }} />
                      Marketplace: <strong>₹{(stats.marketplaceRevenue || 0).toLocaleString()}</strong>
                    </span>
                  </div>
                )}
                <span className="chip chip-ghost">Last 7 months</span>
              </div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#007AFF" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" />
                    <XAxis dataKey="month" stroke="var(--text-tertiary)" fontSize={12} />
                    <YAxis stroke="var(--text-tertiary)" fontSize={12} tickFormatter={v => `₹${(v/100000).toFixed(1)}L`} />
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-glass)', borderRadius: 4, fontSize: 13 }} formatter={v => [`₹${(v/1000).toFixed(0)}K`, 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="#007AFF" strokeWidth={2} fill="url(#revGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {isRevenueDefault && (
                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>Sample data — no revenue records yet</p>
              )}
            </div>

            {/* Subscription Distribution */}
            <div className="glass" style={{ padding: 24 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, display: 'block', marginBottom: 20 }}>Plans Distribution</span>
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-glass)', borderRadius: 4, fontSize: 13 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-8" style={{ marginTop: 8 }}>
                {pieData.map((p, i) => (
                  <div key={i} className="flex justify-between items-center text-body-sm">
                    <div className="flex items-center gap-8">
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: p.color }} />
                      <span className="text-secondary">{p.name}</span>
                    </div>
                    <span style={{ fontWeight: 600 }}>{p.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              {isPieDefault && (
                <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 10 }}>Sample data — no subscriptions yet</p>
              )}
            </div>
          </div>

          {/* Customer Trend & Slot Analytics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 28 }}>
            {/* Customer Registration Trend */}
            <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: 20 }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, display: 'block' }}>Customer Onboarding Trend</span>
                  <span className="text-secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>Monthly user registration growth</span>
                </div>
                <span className="chip chip-ghost">Last 7 months</span>
              </div>
              <div style={{ height: 260, flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={customerData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-lime)" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="var(--accent-lime)" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" />
                    <XAxis dataKey="month" stroke="var(--text-tertiary)" fontSize={12} />
                    <YAxis stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'var(--bg-elevated)', 
                        border: '1px solid var(--border-glass)', 
                        borderRadius: 12, 
                        fontSize: 13,
                        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(8px)'
                      }} 
                      formatter={v => [`${v} New Users`, 'Customers']} 
                    />
                    <Bar dataKey="users" fill="url(#userGrad)" radius={[6, 6, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {isCustomerDefault && (
                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>Sample data — no customer registrations yet</p>
              )}
            </div>

            {/* Slot Analytics */}
            <div className="glass flex flex-col" style={{ padding: 24, justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, display: 'block', marginBottom: 20 }}>Time Slot Preference</span>
                
                {/* Highlighted Most Used Slot Card */}
                <div 
                  style={{ 
                    padding: '16px 20px', 
                    borderRadius: 16, 
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.04) 100%)', 
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    marginBottom: 20
                  }}
                >
                  <div 
                    style={{ 
                      width: 44, 
                      height: 44, 
                      borderRadius: 12, 
                      background: 'rgba(245, 158, 11, 0.15)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: '#F59E0B',
                      flexShrink: 0
                    }}
                  >
                    <Clock size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'rgba(245, 158, 11, 0.8)', fontWeight: 600 }}>MOST PREFERRED SLOT</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                      {formatSlotId(mostUsedSlot)}
                    </div>
                  </div>
                </div>

                {/* Distribution List */}
                <div className="flex flex-col gap-12">
                  {slotDistribution.slice(0, 5).map((item, i) => {
                    const pct = Math.round((item.count / totalSlotCount) * 100)
                    return (
                      <div key={i} className="flex flex-col gap-6 text-body-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-secondary" style={{ fontWeight: 500 }}>{formatSlotId(item.slot)}</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.count} ({pct}%)</span>
                        </div>
                        {/* Progress Bar Container */}
                        <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${pct}%`, 
                              background: 'linear-gradient(90deg, #F59E0B 0%, #FFB020 100%)', 
                              height: '100%',
                              borderRadius: 3,
                              transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                            }} 
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              {isSlotDefault && (
                <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 16 }}>Sample data — no active subscriptions yet</p>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass" style={{ padding: 24 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, display: 'block', marginBottom: 16 }}>Recent Activity</span>
            <div className="flex flex-col">
              {recentActivity.length === 0 ? (
                <div className="text-secondary text-center py-4">No recent activity</div>
              ) : recentActivity.map((a, i) => {
                const ActivityIcon = ACTIVITY_ICONS[a.type]?.icon || Calendar
                const iconColor = ACTIVITY_ICONS[a.type]?.color || 'var(--text-tertiary)'
                
                return (
                  <div key={i} style={{ padding: '14px 0', borderBottom: i < recentActivity.length - 1 ? '1px solid var(--divider)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="flex items-center gap-12">
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIcon size={14} style={{ color: iconColor }} />
                      </div>
                      <span className="text-body-sm" style={{ fontWeight: 500 }}>{a.text}</span>
                    </div>
                    <span className="text-body-sm text-tertiary" style={{ whiteSpace: 'nowrap', marginLeft: 16, fontSize: 12 }}>
                      {a.time ? new Date(a.time).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {activeTab === 'subscription-flow' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Specialized Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {/* Card 1: Trial to Paid Conversion */}
            <div className="glass animate-fade-in" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 160 }}>
              <div>
                <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius)', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={20} style={{ color: '#F59E0B' }} />
                  </div>
                  <span className="chip chip-ghost" style={{ fontSize: 11, color: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)' }}>Conversion</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', color: '#F59E0B' }}>
                  {subFlowData.trialConversionRate}%
                </div>
                <div className="text-body-sm text-secondary" style={{ marginTop: 4 }}>Trial-to-Paid Conversion</div>
              </div>
            </div>

            {/* Card 2: Active Retention Rate */}
            <div className="glass animate-fade-in" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 160 }}>
              <div>
                <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius)', background: 'rgba(191, 255, 0, 0.1)', border: '1px solid rgba(191, 255, 0, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Layers size={20} style={{ color: 'var(--accent-lime)' }} />
                  </div>
                  <span className="chip chip-ghost" style={{ fontSize: 11, color: 'var(--accent-lime)', background: 'rgba(191, 255, 0, 0.08)' }}>Retention</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--accent-lime)' }}>
                  {retentionRate}%
                </div>
                <div className="text-body-sm text-secondary" style={{ marginTop: 4 }}>Active Retention Rate</div>
              </div>
            </div>

            {/* Card 3: Wash Skip Ratio */}
            <div className="glass animate-fade-in" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 160 }}>
              <div>
                <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RotateCcw size={20} style={{ color: '#EF4444' }} />
                  </div>
                  <span className="chip chip-ghost" style={{ fontSize: 11, color: '#EF4444', background: 'rgba(239, 68, 68, 0.08)' }}>Skips</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', color: '#EF4444' }}>
                  {subFlowData.skipRatio}%
                </div>
                <div className="text-body-sm text-secondary" style={{ marginTop: 4 }}>Wash Skip Ratio</div>
              </div>
            </div>

            {/* Card 4: Avg Completed Washes */}
            <div className="glass animate-fade-in" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 160 }}>
              <div>
                <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius)', background: 'rgba(0, 122, 255, 0.1)', border: '1px solid rgba(0, 122, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={20} style={{ color: '#007AFF' }} />
                  </div>
                  <span className="chip chip-ghost" style={{ fontSize: 11, color: '#007AFF', background: 'rgba(0, 122, 255, 0.08)' }}>Fulfillment</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', color: '#007AFF' }}>
                  {subFlowData.averageMetrics?.avgCompleted || 0} <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-secondary)' }}>days</span>
                </div>
                <div className="text-body-sm text-secondary" style={{ marginTop: 4 }}>Average Wash Count</div>
              </div>
            </div>
          </div>

          {/* Sub Velocity Line Chart & Lifecycle Distribution */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            {/* Velocity Chart */}
            <div className="glass" style={{ padding: 24 }}>
              <div className="flex justify-between items-center" style={{ marginBottom: 20 }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, display: 'block' }}>Subscription Velocity</span>
                  <span className="text-secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>Monthly creations vs expirations/cancellations</span>
                </div>
                <span className="chip chip-ghost">Last 7 months</span>
              </div>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={subFlowData.monthlyFlow}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" />
                    <XAxis dataKey="month" stroke="var(--text-tertiary)" fontSize={12} />
                    <YAxis stroke="var(--text-tertiary)" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'var(--bg-elevated)', 
                        border: '1px solid var(--border-glass)', 
                        borderRadius: 12, 
                        fontSize: 13,
                        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(8px)'
                      }} 
                    />
                    <Line type="monotone" dataKey="created" stroke="var(--accent-lime)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="New Subscriptions" />
                    <Line type="monotone" dataKey="expired" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Expired/Cancelled" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {isSubscriptionFlowDefault && (
                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>Sample data — no subscription records yet</p>
              )}
            </div>

            {/* Lifecycle Status Distribution */}
            <div className="glass flex flex-col justify-between" style={{ padding: 24 }}>
              <div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, display: 'block', marginBottom: 20 }}>Lifecycle Status</span>
                
                <div className="flex flex-col gap-16">
                  {/* Active */}
                  <div className="flex flex-col gap-6 text-body-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-secondary flex items-center gap-6">
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-lime)', display: 'inline-block' }} />
                        Active Subscriptions
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{activeCount} ({totalLifecycles > 0 ? Math.round(activeCount/totalLifecycles*100) : 0}%)</span>
                    </div>
                    <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{ width: `${totalLifecycles > 0 ? (activeCount/totalLifecycles*100) : 0}%`, background: 'var(--accent-lime)', height: '100%', borderRadius: 3 }} />
                    </div>
                  </div>

                  {/* Paused */}
                  <div className="flex flex-col gap-6 text-body-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-secondary flex items-center gap-6">
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
                        Paused
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{pausedCount} ({totalLifecycles > 0 ? Math.round(pausedCount/totalLifecycles*100) : 0}%)</span>
                    </div>
                    <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{ width: `${totalLifecycles > 0 ? (pausedCount/totalLifecycles*100) : 0}%`, background: '#F59E0B', height: '100%', borderRadius: 3 }} />
                    </div>
                  </div>

                  {/* Expired */}
                  <div className="flex flex-col gap-6 text-body-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-secondary flex items-center gap-6">
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#007AFF', display: 'inline-block' }} />
                        Expired Cycles
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{expiredCount} ({totalLifecycles > 0 ? Math.round(expiredCount/totalLifecycles*100) : 0}%)</span>
                    </div>
                    <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{ width: `${totalLifecycles > 0 ? (expiredCount/totalLifecycles*100) : 0}%`, background: '#007AFF', height: '100%', borderRadius: 3 }} />
                    </div>
                  </div>

                  {/* Cancelled */}
                  <div className="flex flex-col gap-6 text-body-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-secondary flex items-center gap-6">
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
                        Cancelled
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cancelledCount} ({totalLifecycles > 0 ? Math.round(cancelledCount/totalLifecycles*100) : 0}%)</span>
                    </div>
                    <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{ width: `${totalLifecycles > 0 ? (cancelledCount/totalLifecycles*100) : 0}%`, background: '#EF4444', height: '100%', borderRadius: 3 }} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 16, marginTop: 16 }}>
                <div className="flex justify-between text-body-sm" style={{ fontWeight: 600 }}>
                  <span className="text-secondary">Total Lifecycles Tracked</span>
                  <span>{totalLifecycles}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Wash Day Utilization Stacked Bar */}
          <div className="glass" style={{ padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, display: 'block' }}>Fulfillment stacked Day-Utilization</span>
              <span className="text-secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>Allocation and consumption breakdown of average subscription days</span>
            </div>

            {/* Stacked utilization bar */}
            <div style={{ width: '100%', height: 32, borderRadius: 16, background: 'rgba(255,255,255,0.04)', overflow: 'hidden', display: 'flex', border: '1px solid var(--border-glass)', marginBottom: 24 }}>
              <div 
                style={{ 
                  width: `${((subFlowData.averageMetrics?.avgCompleted || 0) / totalAvgDays) * 100}%`, 
                  background: 'linear-gradient(90deg, var(--accent-lime) 0%, #a6e22e 100%)', 
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#000',
                  textShadow: '0 1px 2px rgba(255,255,255,0.4)',
                  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {Math.round(((subFlowData.averageMetrics?.avgCompleted || 0) / totalAvgDays) * 100)}%
              </div>
              <div 
                style={{ 
                  width: `${((subFlowData.averageMetrics?.avgSkipped || 0) / totalAvgDays) * 100}%`, 
                  background: 'linear-gradient(90deg, #EF4444 0%, #f36c6c 100%)', 
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#fff',
                  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {Math.round(((subFlowData.averageMetrics?.avgSkipped || 0) / totalAvgDays) * 100)}%
              </div>
              <div 
                style={{ 
                  width: `${((subFlowData.averageMetrics?.avgCredited || 0) / totalAvgDays) * 100}%`, 
                  background: 'linear-gradient(90deg, #007AFF 0%, #3395ff 100%)', 
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#fff',
                  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {Math.round(((subFlowData.averageMetrics?.avgCredited || 0) / totalAvgDays) * 100)}%
              </div>
            </div>

            {/* Explanation items */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div style={{ padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--accent-lime)', marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-lime)' }} />
                  Completed Washes
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{subFlowData.averageMetrics?.avgCompleted || 0} days</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Washes completed successfully according to schedule.</div>
              </div>

              <div style={{ padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#EF4444', marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
                  Skipped Washes
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{subFlowData.averageMetrics?.avgSkipped || 0} days</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Washes skipped by customer request during active cycle.</div>
              </div>

              <div style={{ padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#007AFF', marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#007AFF' }} />
                  Credited Washes
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{subFlowData.averageMetrics?.avgCredited || 0} days</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Washes credited back due to weather or service reschedules.</div>
              </div>
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>
              <span>Average package amount: <strong>₹{(subFlowData.averageMetrics?.avgAmount || 0).toLocaleString()}</strong></span>
              <span>Total calculated cycle span: <strong>{totalAvgDays} scheduled days</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
