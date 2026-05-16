import PageLoader from '../../components/PageLoader'
import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, User, Package, Camera, CheckCircle2 } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useToast } from '../../context/ToastContext'

export default function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [task, setTask] = useState(null)
  const [status, setStatus] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [updateError, setUpdateError] = useState('')

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const res = await apiClient.get(`/cleaner/tasks/${id}`)
        setTask(res.task)
        setStatus(res.task.status)
      } catch (err) {
        setUpdateError('Failed to load task details. Please go back and try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchTask()
  }, [id])

  const handleUpdateStatus = async () => {
    if (status === 'completed') return
    
    // Linear Workflow Validation
    if (status === 'pending' && (!task.photos?.before || task.photos.before.length === 0)) {
      showToast('Please upload a "Before" photo first!', 'error')
      return
    }
    
    if (status === 'in-progress' && (!task.photos?.after || task.photos.after.length === 0)) {
      showToast('Please upload an "After" photo to complete the task!', 'error')
      return
    }

    const nextStatus = status === 'pending' ? 'in-progress' : 'completed'
    setUpdating(true)
    try {
      await apiClient.put(`/cleaner/tasks/${id}/status`, { status: nextStatus })
      setStatus(nextStatus)
      if (nextStatus === 'completed') {
        showToast('Task completed!')
        setTimeout(() => navigate('/cleaner/tasks'), 1500)
      } else {
        showToast('Cleaning started!')
        // Refresh task to ensure photos are up to date
        const res = await apiClient.get(`/cleaner/tasks/${id}`)
        setTask(res.task)
      }
    } catch (err) {
      setUpdateError('Failed to update status. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <PageLoader />
  if (!task) return <div style={{ padding: 20, textAlign: 'center' }}>Task not found</div>

  const statusFlow = { pending: 'in-progress', 'in-progress': 'completed' }
  const btnLabels = { pending: 'Start Cleaning', 'in-progress': 'Mark Complete', completed: 'Completed' }

  // Check photo status
  const hasBefore = task.photos?.before && task.photos.before.length > 0
  const hasAfter = task.photos?.after && task.photos.after.length > 0

  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <Link to="/cleaner/tasks" className="flex items-center gap-8"><ArrowLeft size={20} /></Link>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Task Detail</span>
        <div style={{ width: 20 }} />
      </div>

      {/* Car Info */}
      <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{task.vehicle?.model || 'Vehicle'}</div>
        <div className="text-body-sm" style={{ color: 'var(--accent-lime)', fontWeight: 600, marginBottom: 16 }}>{task.vehicle?.number || 'Plate'}</div>
        <div className="flex flex-col gap-12">
          {[
            { icon: User, label: 'Customer', value: task.customer?.name || task.customer?.phone || 'Customer' },
            { icon: Package, label: 'Package', value: task.packageName || task.subscription?.package?.name || 'Cleaning' },
            { icon: MapPin, label: 'Location', value: task.vehicle?.parking || 'Location' },
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
            const isBefore = label === 'Before'
            const hasPhoto = isBefore ? hasBefore : hasAfter
            const photoUrl = isBefore ? task.photos?.before?.[0] : task.photos?.after?.[0]
            
            // Logic to disable/enable links
            // "Before" always clickable if not completed
            // "After" only clickable if status is "in-progress"
            const isDisabled = (!isBefore && status === 'pending') || status === 'completed'

            return (
              <Link 
                key={i} 
                to={isDisabled ? '#' : `/cleaner/upload?taskId=${task._id}&type=${label.toLowerCase()}`} 
                className={`glass ${isDisabled ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                style={{ 
                  padding: hasPhoto ? 0 : 28, 
                  textAlign: 'center', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: 8, 
                  borderStyle: hasPhoto ? 'none' : 'dashed',
                  overflow: 'hidden',
                  position: 'relative',
                  minHeight: 120,
                  justifyContent: 'center'
                }}
              >
                {hasPhoto ? (
                  <>
                    <img src={photoUrl} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 10, padding: '4px 0', fontWeight: 600 }}>{label.toUpperCase()}</div>
                    <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--success)', borderRadius: '50%', padding: 4 }}>
                      <CheckCircle2 size={12} color="white" />
                    </div>
                  </>
                ) : (
                  <>
                    <Camera size={24} style={{ color: 'var(--text-tertiary)' }} />
                    <span className="text-body-sm text-secondary">{label}</span>
                  </>
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Status action */}
      <div style={{ paddingBottom: 100 }}>
        {updateError && (
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 12, fontSize: 14 }}>
            {updateError}
          </div>
        )}
        
        {status !== 'completed' ? (
          <button 
            disabled={updating || (status === 'pending' && !hasBefore) || (status === 'in-progress' && !hasAfter)} 
            className={`btn btn-primary w-full btn-lg ${(updating || (status === 'pending' && !hasBefore) || (status === 'in-progress' && !hasAfter)) ? 'opacity-50' : ''}`} 
            onClick={handleUpdateStatus}
          >
            {updating ? 'Updating...' : btnLabels[status]}
          </button>
        ) : (
          <div className="flex items-center justify-center gap-8" style={{ padding: 20, color: 'var(--success)' }}>
            <CheckCircle2 size={24} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Task Completed</span>
          </div>
        )}
        
        {(status === 'pending' && !hasBefore) && (
          <p className="text-center text-secondary text-xs mt-12">Upload "Before" photo to start cleaning</p>
        )}
        {(status === 'in-progress' && !hasAfter) && (
          <p className="text-center text-secondary text-xs mt-12">Upload "After" photo to mark as complete</p>
        )}
      </div>
    </div>
  )
}
