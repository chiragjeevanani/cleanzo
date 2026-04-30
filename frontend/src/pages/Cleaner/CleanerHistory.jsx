import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const history = [
  { date: 'Apr 18', tasks: 6, completed: 6 },
  { date: 'Apr 17', tasks: 5, completed: 5 },
  { date: 'Apr 16', tasks: 7, completed: 6 },
  { date: 'Apr 15', tasks: 5, completed: 5 },
  { date: 'Apr 14', tasks: 6, completed: 6 },
]

export default function CleanerHistory() {
  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <Link to="/cleaner" className="flex items-center gap-8"><ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>History</span></Link>
      </div>
      <div className="flex flex-col gap-8" style={{ paddingBottom: 100 }}>
        {history.map((h, i) => (
          <div key={i} className="glass" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{h.date}</div>
              <div className="text-body-sm text-secondary">{h.tasks} tasks assigned</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: h.completed === h.tasks ? 'var(--success)' : 'var(--warning)' }}>
                {h.completed}/{h.tasks}
              </div>
              <div className="text-body-sm text-secondary">completed</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
