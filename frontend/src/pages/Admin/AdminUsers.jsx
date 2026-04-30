import { useState } from 'react'
import { Search, Filter, MoreVertical } from 'lucide-react'
import { mockAdminUsers } from '../../data/mockData'

export default function AdminUsers() {
  const [search, setSearch] = useState('')
  const filtered = mockAdminUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search))

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
            {filtered.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500 }}>{u.name}</td>
                <td className="text-secondary">{u.phone}</td>
                <td>{u.vehicles}</td>
                <td><span className={`chip ${u.plan === 'Elite' ? 'chip-lime' : u.plan === 'Premium' ? 'chip-blue' : 'chip-ghost'}`}>{u.plan}</span></td>
                <td><span className={`chip ${u.status === 'Active' ? 'chip-success' : u.status === 'Paused' ? 'chip-ghost' : 'chip-error'}`}>{u.status}</span></td>
                <td className="text-secondary">{u.joined}</td>
                <td><button style={{ color: 'var(--text-tertiary)', padding: 4 }}><MoreVertical size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
