import { useState } from 'react'

const subs = [
  { id: 1, user: 'Arjun Mehta', vehicle: 'BMW 3 Series', plan: 'Premium', start: '2025-04-01', end: '2025-04-30', status: 'Active' },
  { id: 2, user: 'Priya Sharma', vehicle: 'Mercedes C-Class', plan: 'Elite', start: '2025-04-05', end: '2025-05-04', status: 'Active' },
  { id: 3, user: 'Vikram Patel', vehicle: 'Maruti Swift', plan: 'Basic', start: '2025-03-15', end: '2025-04-14', status: 'Expired' },
  { id: 4, user: 'Neha Gupta', vehicle: 'Tata Nexon EV', plan: 'Premium', start: '2025-04-10', end: '2025-05-09', status: 'Active' },
  { id: 5, user: 'Rohit Verma', vehicle: 'Hyundai i20', plan: 'Basic', start: '2025-02-01', end: '2025-02-28', status: 'Expired' },
]

export default function AdminSubscriptions() {
  const [filter, setFilter] = useState('all')
  const filtered = filter === 'all' ? subs : subs.filter(s => s.status.toLowerCase() === filter)

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Subscriptions</h1>
      <div className="flex gap-8" style={{ marginBottom: 20 }}>
        {['all', 'active', 'expired'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`chip ${filter === f ? 'chip-lime' : 'chip-ghost'}`} style={{ cursor: 'pointer', textTransform: 'capitalize' }}>{f}</button>
        ))}
      </div>
      <div className="glass" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead><tr><th>User</th><th>Vehicle</th><th>Plan</th><th>Start</th><th>End</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight: 500 }}>{s.user}</td>
                <td className="text-secondary">{s.vehicle}</td>
                <td><span className={`chip ${s.plan === 'Elite' ? 'chip-lime' : s.plan === 'Premium' ? 'chip-blue' : 'chip-ghost'}`}>{s.plan}</span></td>
                <td className="text-secondary">{s.start}</td>
                <td className="text-secondary">{s.end}</td>
                <td><span className={`chip ${s.status === 'Active' ? 'chip-success' : 'chip-error'}`}>{s.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
