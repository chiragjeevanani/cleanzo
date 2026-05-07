import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, User, Package, Camera, CheckCircle2 } from 'lucide-react'
import apiClient from '../../services/apiClient'

export default function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [task, setTask] = useState(null)
  const [status, setStatus] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const res = await apiClient.get(`/cleaner/tasks/${id}`)
        setTask(res.task)
        setStatus(res.task.status)
      } catch (err) {
        console.error('Error fetching task details', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTask()
  }, [id])

  const handleUpdateStatus = async () => {
    if (status === 'completed') return
    const nextStatus = status === 'pending' ? 'in-progress' : 'completed'
    setUpdating(true)
    try {
      await apiClient.put(`/cleaner/tasks/${id}/status`, { status: nextStatus })
      setStatus(nextStatus)
      if (nextStatus === 'completed') {
        setTimeout(() => navigate('/cleaner/tasks'), 1500)
      }
    } catch (err) {
      console.error('Failed to update status', err)
      alert('Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <div className="loader-overlay"><div className="loader"></div></div>
  if (!task) return <div style={{ padding: 20, textAlign: 'center' }}>Task not found</div>

  const statusFlow = { pending: 'in-progress', 'in-progress': 'completed' }
  const btnLabels = { pending: 'Start Cleaning', 'in-progress': 'Mark Complete', completed: 'Completed' }

  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <Link to="/cleaner/tasks" className="flex items-center gap-8"><ArrowLeft size={20} /></Link>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Task Detail</span>
        <div style={{ width: 20 }} />
      </div>

      {/* Car Info */}
      <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{task.vehicleName || 'Vehicle'}</div>
        <div className="text-body-sm" style={{ color: 'var(--accent-lime)', fontWeight: 600, marginBottom: 16 }}>{task.vehicleName || 'Plate'}</div>
        <div className="flex flex-col gap-12">
          {[
            { icon: User, label: 'Customer', value: task.customerName || 'Customer' },
            { icon: Package, label: 'Package', value: task.packageName || 'Cleaning' },
            { icon: MapPin, label: 'Location', value: task.location || 'Location' },
          ].map((r, i) => (
            <div key={i} className="flex items-center gap-12">
              <r.icon size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              <span className="text-body-sm text-secondary">{r.label}:</span>
              <span className="text-body-sm" style={{ fontWeight: 500 }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Photo upload */}
      <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
        <div className="text-label text-secondary" style={{ marginBottom: 12 }}>Service Photos</div>
        <div className="grid-2" style={{ gap: 10 }}>
          {['Before', 'After'].map((label, i) => {
            // Using a simple query param to pass the upload type (before/after) to PhotoUpload
            return (
              <Link key={i} to={`/cleaner/upload?taskId=${task._id}&type=${label.toLowerCase()}`} className="glass" style={{ padding: 28, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, borderStyle: 'dashed' }}>
                <Camera size={24} style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-body-sm text-secondary">{label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Status action */}
      <div style={{ paddingBottom: 100 }}>
        {status !== 'completed' ? (
          <button disabled={updating} className={`btn btn-primary w-full btn-lg ${updating ? 'opacity-50' : ''}`} onClick={handleUpdateStatus}>
            {updating ? 'Updating...' : btnLabels[status]}
          </button>
        ) : (
          <div className="flex items-center justify-center gap-8" style={{ padding: 20, color: 'var(--success)' }}>
            <CheckCircle2 size={24} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Task Completed</span>
          </div>
        )}
      </div>
    </div>
  )
}
