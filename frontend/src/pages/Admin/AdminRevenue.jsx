import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import apiClient from '../../services/apiClient'
import { useToast } from '../../context/ToastContext'

export default function AdminRevenue() {
  const { showToast } = useToast()
  const [revenueStats, setRevenueStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const res = await apiClient.get('/admin/revenue')
        setRevenueStats(res)
      } catch (err) {
        setError('Failed to load revenue data.')
      } finally {
        setLoading(false)
      }
    }
    fetchRevenue()
  }, [])

  if (loading) return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
        <div className="skeleton" style={{ height: 32, width: 140, borderRadius: 8 }} />
        <div className="skeleton" style={{ height: 32, width: 110, borderRadius: 8 }} />
      </div>
      <div className="grid-3" style={{ gap: 16, marginBottom: 28 }}>
        {[0,1,2].map(i => <div key={i} className="glass skeleton" style={{ height: 100, borderRadius: 16 }} />)}
      </div>
      <div className="glass skeleton" style={{ height: 280, borderRadius: 16, marginBottom: 28 }} />
      <div className="glass" style={{ overflow: 'hidden', borderRadius: 16 }}>
        {[0,1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 52, margin: '8px 16px', borderRadius: 8 }} />)}
      </div>
    </div>
  )

  const isSummaryDefault = !revenueStats?.summary
  const isChartDefault = !revenueStats?.chartData
  const isCustomersDefault = !revenueStats?.topCustomers

  const summary = revenueStats?.summary || [
    { label: 'This Month', value: '₹14.2L', trend: '+8.7%', trendColor: 'var(--success)' },
    { label: 'Last Month', value: '₹13.5L', trend: '+5.2%', trendColor: 'var(--success)' },
    { label: 'YTD Total', value: '₹90.7L', trend: '+12.4%', trendColor: 'var(--success)' },
  ]

  const chartData = revenueStats?.chartData || [
    { month: 'Oct', revenue: 95000, subscriptions: 80000 },
    { month: 'Nov', revenue: 102000, subscriptions: 85000 },
    { month: 'Dec', revenue: 115000, subscriptions: 90000 },
    { month: 'Jan', revenue: 112000, subscriptions: 88000 },
    { month: 'Feb', revenue: 128000, subscriptions: 100000 },
    { month: 'Mar', revenue: 142000, subscriptions: 110000 },
    { month: 'Apr', revenue: 165000, subscriptions: 125000 },
  ]

  const topCustomers = revenueStats?.topCustomers || [
    { name: 'Arjun Mehta', plan: 'Premium', months: 6, total: '₹11,994' },
    { name: 'Priya Sharma', plan: 'Elite', months: 4, total: '₹13,996' },
    { name: 'Ananya Iyer', plan: 'Elite', months: 3, total: '₹10,497' },
  ]
  return (
    <div>
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}
      <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>Revenue</h1>
        <button className="btn btn-ghost btn-sm" onClick={() => showToast('CSV export coming soon', 'info')}><Download size={14} /> Export CSV</button>
      </div>

      {/* Summary cards */}
      <div className="grid-3" style={{ gap: 16, marginBottom: isSummaryDefault ? 8 : 28 }}>
        {summary.map((s, i) => (
          <div key={i} className="glass" style={{ padding: 24 }}>
            <div className="text-body-sm text-secondary" style={{ marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800 }}>{s.value}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: s.trendColor, marginTop: 4 }}>{s.trend} vs last period</div>
          </div>
        ))}
      </div>
      {isSummaryDefault && (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 28 }}>Sample data — no revenue records yet</p>
      )}

      {/* Revenue Line Chart */}
      <div className="glass" style={{ padding: 24, marginBottom: 28 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, display: 'block', marginBottom: 20 }}>Monthly Revenue Trend</span>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" />
              <XAxis dataKey="month" stroke="var(--text-tertiary)" fontSize={12} />
              <YAxis stroke="var(--text-tertiary)" fontSize={12} tickFormatter={v => `₹${(v/100000).toFixed(1)}L`} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-glass)', borderRadius: 4, fontSize: 13 }} formatter={v => [`₹${(v/1000).toFixed(0)}K`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#007AFF" strokeWidth={2} dot={{ fill: '#007AFF', r: 4 }} activeDot={{ fill: '#DFFF00', r: 6 }} />
              <Line type="monotone" dataKey="subscriptions" stroke="#DFFF00" strokeWidth={2} dot={{ fill: '#DFFF00', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {isChartDefault && (
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>Sample data — no revenue records yet</p>
        )}
      </div>

      {/* Top customers */}
      <div className="glass" style={{ padding: 24 }}>
        <div className="flex items-center gap-12" style={{ marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Top Customers by Revenue</span>
          {isCustomersDefault && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>sample data</span>}
        </div>
        <table className="data-table">
          <thead><tr><th>Customer</th><th>Plan</th><th>Months</th><th>Total Paid</th></tr></thead>
          <tbody>
            {topCustomers.map((c, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td><span className={`chip ${c.plan === 'Elite' ? 'chip-lime' : 'chip-blue'}`}>{c.plan}</span></td>
                <td>{c.months}</td>
                <td style={{ fontWeight: 600, color: 'var(--accent-lime)' }}>{c.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
