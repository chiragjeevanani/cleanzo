import { useState, useEffect } from 'react'
import { Users, CreditCard, TrendingUp, UserCog, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import apiClient from '../../services/apiClient'

const pieColors = ['var(--text-tertiary)', 'var(--primary-blue)', '#DFFF00', 'var(--accent-lime)']

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await apiClient.get('/admin/dashboard')
        setStats(res)
      } catch (err) {
        console.error('Error fetching dashboard stats:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) return <div className="loader-overlay"><div className="loader"></div></div>

  // Use mock data fallback if API doesn't return full structure yet
  const kpiData = stats?.kpis || [
    { label: 'Total Users', value: stats?.usersCount || '0', growth: 12, icon: Users, color: 'var(--primary-blue)' },
    { label: 'Subscriptions', value: stats?.subscriptionsCount || '0', growth: 8, icon: CreditCard, color: 'var(--accent-lime)' },
    { label: "Today's Revenue", value: `₹${stats?.revenue || 0}`, growth: 15, icon: TrendingUp, color: 'var(--success)' },
    { label: 'Active Cleaners', value: stats?.cleanersCount || '0', growth: 5, icon: UserCog, color: 'var(--warning)' },
  ]

  const pieData = stats?.pieData || [
    { name: 'Basic', value: 3200, color: 'var(--text-tertiary)' },
    { name: 'Premium', value: 3800, color: 'var(--primary-blue)' },
    { name: 'Elite', value: 1234, color: '#DFFF00' },
  ]

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
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass" style={{ padding: 24 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, display: 'block', marginBottom: 16 }}>Recent Activity</span>
        <div className="flex flex-col gap-4">
          {recentActivity.length === 0 ? (
            <div className="text-secondary text-center py-4">No recent activity</div>
          ) : recentActivity.map((a, i) => (
            <div key={i} style={{ padding: '12px 0', borderBottom: i < recentActivity.length - 1 ? '1px solid var(--divider)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-body-sm">{a.text}</span>
              <span className="text-body-sm text-tertiary" style={{ whiteSpace: 'nowrap', marginLeft: 16 }}>{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
