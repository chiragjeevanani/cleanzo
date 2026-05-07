import { useState, useEffect } from 'react'
import { Star, MapPin, MoreVertical } from 'lucide-react'
import apiClient from '../../services/apiClient'

export default function AdminCleaners() {
  const [cleaners, setCleaners] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCleaners = async () => {
      try {
        const res = await apiClient.get('/admin/cleaners')
        setCleaners(res.cleaners || [])
      } catch (err) {
        console.error('Error fetching cleaners:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCleaners()
  }, [])

  if (loading) return <div className="loader-overlay"><div className="loader"></div></div>

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
            {cleaners.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-4 text-secondary">No cleaners found.</td></tr>
            ) : cleaners.map(c => (
              <tr key={c._id}>
                <td style={{ fontWeight: 500 }}>{c.name || 'Cleaner'}</td>
                <td className="text-secondary"><span className="flex items-center gap-4"><MapPin size={12} />{c.area || 'Unassigned'}</span></td>
                <td><span className="flex items-center gap-4"><Star size={12} style={{ color: 'var(--accent-lime)' }} />{c.rating || '4.5'}</span></td>
                <td>
                  <div className="flex items-center gap-8">
                    <div className="progress-track" style={{ width: 60 }}><div className="progress-fill" style={{ width: `${c.completionRate || 90}%` }} /></div>
                    <span className="text-body-sm">{c.completionRate || 90}%</span>
                  </div>
                </td>
                <td>{(c.tasksCount || 0).toLocaleString()}</td>
                <td><span className={`chip ${c.status === 'active' ? 'chip-success' : 'chip-ghost'}`}>{c.status || 'Active'}</span></td>
                <td><button style={{ color: 'var(--text-tertiary)', padding: 4 }}><MoreVertical size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
