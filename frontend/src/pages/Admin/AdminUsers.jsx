import { useState, useEffect } from 'react'
import { Search, Filter, MoreVertical } from 'lucide-react'
import apiClient from '../../services/apiClient'

export default function AdminUsers() {
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await apiClient.get('/admin/users')
        setUsers(res.users || [])
      } catch (err) {
        console.error('Error fetching users:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const filtered = users.filter(u => 
    (u.name && u.name.toLowerCase().includes(search.toLowerCase())) || 
    (u.phone && u.phone.includes(search)) ||
    (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
  )

  if (loading) return <div className="loader-overlay"><div className="loader"></div></div>

  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>Users</h1>
        <button className="btn btn-primary btn-sm">+ Add User</button>
      </div>

      <div className="flex gap-12" style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input className="input-field" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
        </div>
        <button className="btn btn-glass"><Filter size={16} /> Filters</button>
      </div>

      <div className="glass" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Vehicles</th><th>Plan</th><th>Status</th><th>Joined</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-4 text-secondary">No users found.</td></tr>
            ) : filtered.map(u => (
              <tr key={u._id}>
                <td style={{ fontWeight: 500 }}>{u.name || 'User'}</td>
                <td className="text-secondary">{u.phone || u.email || 'N/A'}</td>
                <td>{u.vehiclesCount || 0}</td>
                <td><span className={`chip ${u.activePlan ? 'chip-lime' : 'chip-ghost'}`}>{u.activePlan || 'None'}</span></td>
                <td><span className={`chip ${u.status === 'active' ? 'chip-success' : u.status === 'paused' ? 'chip-ghost' : 'chip-error'}`}>{u.status || 'Active'}</span></td>
                <td className="text-secondary">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td><button style={{ color: 'var(--text-tertiary)', padding: 4 }}><MoreVertical size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
