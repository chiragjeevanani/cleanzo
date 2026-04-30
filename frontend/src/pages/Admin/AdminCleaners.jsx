import { Star, MapPin, MoreVertical } from 'lucide-react'

const cleaners = [
  { id: 1, name: 'Raj Kumar', area: 'Sector 42-48', rating: 4.8, completion: 96, tasks: 1247, status: 'Active' },
  { id: 2, name: 'Amit Singh', area: 'Sector 50-55', rating: 4.5, completion: 89, tasks: 934, status: 'Active' },
  { id: 3, name: 'Suresh Yadav', area: 'Sector 30-36', rating: 4.9, completion: 98, tasks: 1532, status: 'Active' },
  { id: 4, name: 'Mohan Lal', area: 'Sector 60-65', rating: 4.2, completion: 82, tasks: 678, status: 'On Leave' },
  { id: 5, name: 'Deepak Sharma', area: 'Sector 70-75', rating: 4.6, completion: 91, tasks: 1105, status: 'Active' },
]

export default function AdminCleaners() {
  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>Cleaners</h1>
        <button className="btn btn-primary btn-sm">+ Add Cleaner</button>
      </div>
      <div className="glass" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Area</th><th>Rating</th><th>Completion</th><th>Total Tasks</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {cleaners.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td className="text-secondary"><span className="flex items-center gap-4"><MapPin size={12} />{c.area}</span></td>
                <td><span className="flex items-center gap-4"><Star size={12} style={{ color: 'var(--accent-lime)' }} />{c.rating}</span></td>
                <td>
                  <div className="flex items-center gap-8">
                    <div className="progress-track" style={{ width: 60 }}><div className="progress-fill" style={{ width: `${c.completion}%` }} /></div>
                    <span className="text-body-sm">{c.completion}%</span>
                  </div>
                </td>
                <td>{c.tasks.toLocaleString()}</td>
                <td><span className={`chip ${c.status === 'Active' ? 'chip-success' : 'chip-ghost'}`}>{c.status}</span></td>
                <td><button style={{ color: 'var(--text-tertiary)', padding: 4 }}><MoreVertical size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
