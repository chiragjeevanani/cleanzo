import { Users, CreditCard, TrendingUp, UserCog, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { mockAdminStats, mockRevenueData } from '../../data/mockData'

const kpis = [
  { label: 'Total Users', value: '12.8K', growth: mockAdminStats.userGrowth, icon: Users, color: 'var(--primary-blue)' },
  { label: 'Subscriptions', value: '8.2K', growth: mockAdminStats.subGrowth, icon: CreditCard, color: 'var(--accent-lime)' },
  { label: "Today's Revenue", value: '₹1.4L', growth: mockAdminStats.revenueGrowth, icon: TrendingUp, color: 'var(--success)' },
  { label: 'Active Cleaners', value: '142', growth: mockAdminStats.cleanerGrowth, icon: UserCog, color: 'var(--warning)' },
]

const pieData = [
  { name: 'Basic', value: 3200, color: 'var(--text-tertiary)' },
  { name: 'Premium', value: 3800, color: 'var(--primary-blue)' },
  { name: 'Elite', value: 1234, color: '#DFFF00' },
]

const recentActivity = [
  { text: 'Arjun Mehta subscribed to Premium Detail', time: '2m ago', type: 'subscription' },
  { text: 'Raj Kumar completed 6/6 tasks today', time: '15m ago', type: 'cleaner' },
  { text: 'New user Sneha Roy registered', time: '1h ago', type: 'user' },
  { text: '₹14,250 revenue collected today', time: '2h ago', type: 'revenue' },
  { text: 'Amit Singh flagged for low completion rate', time: '3h ago', type: 'alert' },
]

export default function AdminDashboard() {
  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, marginBottom: 28 }}>Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid-4" style={{ gap: 16, marginBottom: 28 }}>
        {kpis.map((k, i) => (
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
              <AreaChart data={mockRevenueData}>
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
          {recentActivity.map((a, i) => (
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
