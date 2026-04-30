import { Download } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { mockRevenueData } from '../../data/mockData'

export default function AdminRevenue() {
  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>Revenue</h1>
        <button className="btn btn-ghost btn-sm"><Download size={14} /> Export CSV</button>
      </div>

      {/* Summary cards */}
      <div className="grid-3" style={{ gap: 16, marginBottom: 28 }}>
        {[
          { label: 'This Month', value: '₹14.2L', trend: '+8.7%', trendColor: 'var(--success)' },
          { label: 'Last Month', value: '₹13.5L', trend: '+5.2%', trendColor: 'var(--success)' },
          { label: 'YTD Total', value: '₹90.7L', trend: '+12.4%', trendColor: 'var(--success)' },
        ].map((s, i) => (
          <div key={i} className="glass" style={{ padding: 24 }}>
            <div className="text-body-sm text-secondary" style={{ marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800 }}>{s.value}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: s.trendColor, marginTop: 4 }}>{s.trend} vs last period</div>
          </div>
        ))}
      </div>

      {/* Revenue Line Chart */}
      <div className="glass" style={{ padding: 24, marginBottom: 28 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, display: 'block', marginBottom: 20 }}>Monthly Revenue Trend</span>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockRevenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" />
              <XAxis dataKey="month" stroke="var(--text-tertiary)" fontSize={12} />
              <YAxis stroke="var(--text-tertiary)" fontSize={12} tickFormatter={v => `₹${(v/100000).toFixed(1)}L`} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-glass)', borderRadius: 4, fontSize: 13 }} formatter={v => [`₹${(v/1000).toFixed(0)}K`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#007AFF" strokeWidth={2} dot={{ fill: '#007AFF', r: 4 }} activeDot={{ fill: '#DFFF00', r: 6 }} />
              <Line type="monotone" dataKey="subscriptions" stroke="#DFFF00" strokeWidth={2} dot={{ fill: '#DFFF00', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top customers */}
      <div className="glass" style={{ padding: 24 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, display: 'block', marginBottom: 16 }}>Top Customers by Revenue</span>
        <table className="data-table">
          <thead><tr><th>Customer</th><th>Plan</th><th>Months</th><th>Total Paid</th></tr></thead>
          <tbody>
            {[
              { name: 'Arjun Mehta', plan: 'Premium', months: 6, total: '₹11,994' },
              { name: 'Priya Sharma', plan: 'Elite', months: 4, total: '₹13,996' },
              { name: 'Ananya Iyer', plan: 'Elite', months: 3, total: '₹10,497' },
            ].map((c, i) => (
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
