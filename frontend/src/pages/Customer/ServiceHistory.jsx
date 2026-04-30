import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { mockServiceHistory } from '../../data/mockData'

export default function ServiceHistory() {
  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <Link to="/customer" className="flex items-center gap-8"><ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Service History</span></Link>
      </div>
      <div className="flex flex-col gap-8" style={{ paddingBottom: 100 }}>
        {mockServiceHistory.map(s => (
          <div key={s.id} className="glass" style={{ padding: '16px 20px' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{s.service}</span>
              <span className={`chip ${s.status === 'Completed' ? 'chip-success' : s.status === 'Skipped' ? 'chip-ghost' : 'chip-error'}`}>{s.status}</span>
            </div>
            <div className="flex justify-between text-body-sm text-secondary">
              <span>{s.vehicle} · {s.date}</span>
              <span>{s.time !== '-' ? s.time : ''}</span>
            </div>
            {s.cleaner !== '-' && <div className="text-body-sm text-secondary" style={{ marginTop: 4 }}>Cleaner: {s.cleaner}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
