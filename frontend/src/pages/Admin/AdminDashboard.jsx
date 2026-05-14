import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, CreditCard, TrendingUp, UserCog, ArrowUpRight, ArrowDownRight, FileText, CheckCircle, XCircle, PlusCircle, Trash2, Calendar } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import apiClient from '../../services/apiClient'

const pieColors = ['var(--text-tertiary)', 'var(--primary-blue)', '#DFFF00', 'var(--accent-lime)']

const ICON_MAP = { Users, CreditCard, TrendingUp, UserCog }

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

  const kpiData = (stats?.kpiData || []).map(k => ({ ...k, icon: ICON_MAP[k.icon] || Users }))

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

  const recentActivity = stats?.recentActivity || []

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, marginBottom: 28 }}>Dashboard</h1>
      
      {stats?.pendingApplicationsCount > 0 && (
        <div 
          onClick={() => navigate('/admin/applications')}
          className="glass animate-fade-in" 
          style={{ 
            padding: '16px 24px', 
            borderRadius: 20, 
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.03) 100%)', 
            border: '1px solid rgba(245, 158, 11, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
            cursor: 'pointer'
          }}
        >
          <div className="flex items-center gap-14">
            <div style={{ 
              width: 42, height: 42, borderRadius: 12, background: 'rgba(245, 158, 11, 0.15)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' 
            }}>
              <Users size={22} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Recruitment Pipeline</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>You have <strong>{stats.pendingApplicationsCount}</strong> pending cleaner applications and KYC requests.</div>
            </div>
          </div>
          <div style={{ padding: '8px 16px', borderRadius: 12, background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', fontSize: 12, fontWeight: 700 }}>Review Now</div>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid-4" style={{ gap: 16, marginBottom: 28 }}>
        {kpiData.map((k, i) => (
          <div key={i} className="glass" style={{ padding: 24 }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius)', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <k.icon size={20} style={{ color: k.color }} />
              </div>
              <div className="flex items-center gap-4" style={{ fontSize: 13, fontWeight: 600, color: k.growth > 0 ? 'var(--success)' : 'var(--error)' }}>
                {k.growth > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {Math.abs(k.growth)}%
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em' }}>{k.value}</div>
            <div className="text-body-sm text-secondary" style={{ marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 28 }}>
        {/* Revenue Chart */}
        <div className="glass" style={{ padding: 24 }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 20 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Revenue Overview</span>
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
                <span className="text-body-sm text-tertiary" style={{ whiteSpace: 'nowrap', marginLeft: 16, fontSize: 12 }}>{a.time}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
