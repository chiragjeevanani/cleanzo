import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Award, CheckCircle2, Clock, AlertCircle, ArrowRight, IndianRupee, Calendar } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import apiClient from '../../services/apiClient'

export default function CleanerDashboard() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await apiClient.get('/cleaner/tasks')
        setTasks(res.tasks || [])
      } catch (err) {
        setError('Failed to load tasks.')
      } finally {
        setLoading(false)
      }
    }
    fetchTasks()
  }, [])

  const pending = tasks.filter(t => t.status === 'pending').length
  const inProgress = tasks.filter(t => t.status === 'in-progress').length
  const completed = tasks.filter(t => t.status === 'completed').length

  if (loading) return (
    <div style={{ padding: '0 20px' }}>
      {/* Header */}
      <div style={{ padding: '20px 0' }}>
        <div className="flex justify-between items-center">
          <div>
            <div className="skeleton" style={{ width: 90, height: 12, borderRadius: 6, marginBottom: 10 }} />
            <div className="skeleton" style={{ width: 140, height: 22, borderRadius: 8 }} />
          </div>
          <div className="skeleton" style={{ width: 72, height: 26, borderRadius: 20 }} />
        </div>
      </div>
      {/* Big count card */}
      <div className="glass" style={{ padding: 28, textAlign: 'center', marginBottom: 20 }}>
        <div className="skeleton" style={{ width: 100, height: 11, borderRadius: 6, margin: '0 auto 12px' }} />
        <div className="skeleton" style={{ width: 80, height: 64, borderRadius: 12, margin: '0 auto 10px' }} />
        <div className="skeleton" style={{ width: 120, height: 12, borderRadius: 6, margin: '0 auto' }} />
      </div>
      {/* Stats grid */}
      <div className="grid-3" style={{ gap: 10, marginBottom: 24 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="glass" style={{ padding: 16, textAlign: 'center' }}>
            <div className="skeleton" style={{ width: 18, height: 18, borderRadius: '50%', margin: '0 auto 8px' }} />
            <div className="skeleton" style={{ width: 32, height: 24, borderRadius: 6, margin: '0 auto 6px' }} />
            <div className="skeleton" style={{ width: 56, height: 11, borderRadius: 6, margin: '0 auto' }} />
          </div>
        ))}
      </div>
      {/* Operations grid */}
      <div className="grid-2" style={{ gap: 12, marginBottom: 20 }}>
        {[1, 2].map(i => (
          <div key={i} className="glass" style={{ padding: 20 }}>
            <div className="flex justify-between items-start" style={{ marginBottom: 10 }}>
              <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 12 }} />
              <div className="skeleton" style={{ width: 16, height: 16, borderRadius: 4 }} />
            </div>
            <div className="skeleton" style={{ width: 60, height: 11, borderRadius: 6, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 100, height: 18, borderRadius: 6 }} />
          </div>
        ))}
      </div>
      {/* Performance card */}
      <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
        <div className="skeleton" style={{ width: 90, height: 11, borderRadius: 6, marginBottom: 16 }} />
        <div className="flex justify-between" style={{ marginBottom: 8 }}>
          <div className="skeleton" style={{ width: 110, height: 13, borderRadius: 6 }} />
          <div className="skeleton" style={{ width: 36, height: 13, borderRadius: 6 }} />
        </div>
        <div className="skeleton" style={{ width: '100%', height: 6, borderRadius: 3, marginBottom: 14 }} />
        <div className="flex justify-between">
          <div className="skeleton" style={{ width: 80, height: 13, borderRadius: 6 }} />
          <div className="skeleton" style={{ width: 100, height: 13, borderRadius: 6 }} />
        </div>
      </div>
      {/* CTA button */}
      <div className="skeleton" style={{ width: '100%', height: 52, borderRadius: 'var(--radius)', marginBottom: 100 }} />
    </div>
  )

  return (
    <div style={{ padding: '0 20px' }}>
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', margin: '12px 0', fontSize: 14 }}>
          {error}
        </div>
      )}
      {/* Header */}
      <div style={{ padding: '24px 0 20px' }}>
        <div className="flex justify-between items-end">
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4 }}>Good Morning,</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>{user?.name || 'Crew Member'}</div>
          </div>
          {user?.kycStatus === 'approved' ? (
            <div style={{ 
              padding: '6px 12px', 
              borderRadius: 10, 
              background: 'var(--accent-lime)', 
              color: '#000', 
              fontSize: 11, 
              fontWeight: 800, 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em',
              boxShadow: '0 4px 12px rgba(var(--accent-lime-rgb), 0.2)'
            }}>
              Crew Active
            </div>
          ) : user?.kycStatus === 'pending' ? (
            <div style={{ 
              padding: '6px 12px', 
              borderRadius: 10, 
              background: 'rgba(var(--primary-blue-rgb), 0.15)', 
              color: 'var(--primary-blue)', 
              fontSize: 11, 
              fontWeight: 800, 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em', 
              border: '1px solid rgba(var(--primary-blue-rgb), 0.2)' 
            }}>
              Verifying Profile
            </div>
          ) : user?.kycStatus === 'rejected' ? (
            <div style={{ 
              padding: '6px 12px', 
              borderRadius: 10, 
              background: 'rgba(255, 50, 50, 0.1)', 
              color: '#ff5555', 
              fontSize: 11, 
              fontWeight: 800, 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em', 
              border: '1px solid rgba(255, 50, 50, 0.2)' 
            }}>
              KYC Rejected
            </div>
          ) : (
            <Link to="/cleaner/kyc" style={{ 
              padding: '6px 12px', 
              borderRadius: 10, 
              background: 'var(--accent-lime)', 
              color: '#000', 
              fontSize: 11, 
              fontWeight: 800, 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(var(--accent-lime-rgb), 0.2)'
            }}>
              Submit KYC
            </Link>
          )}
        </div>
      </div>

      {/* KYC Status Banners */}
      {user?.kycStatus === 'pending' && (
        <div className="animate-fade-in" style={{ 
          margin: '0 0 20px', 
          padding: '16px', 
          borderRadius: 20, 
          background: 'linear-gradient(135deg, rgba(var(--primary-blue-rgb), 0.08) 0%, rgba(var(--primary-blue-rgb), 0.03) 100%)', 
          border: '1px solid rgba(var(--primary-blue-rgb), 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.05)'
        }}>
          <div style={{ 
            width: 42, height: 42, borderRadius: 12, background: 'rgba(var(--primary-blue-rgb), 0.1)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-blue)' 
          }}>
            <Clock size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Verification in Progress</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, opacity: 0.8 }}>Our operations team is reviewing your documents.</div>
          </div>
        </div>
      )}

      {user?.kycStatus === 'rejected' && (
        <Link to="/cleaner/kyc" style={{ 
          margin: '0 0 20px', 
          padding: '16px', 
          borderRadius: 20, 
          background: 'linear-gradient(135deg, rgba(255, 50, 50, 0.08) 0%, rgba(255, 50, 50, 0.03) 100%)', 
          border: '1px solid rgba(255, 50, 50, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          textDecoration: 'none',
          boxShadow: '0 8px 32px rgba(255,0,0,0.05)'
        }}>
          <div style={{ 
            width: 42, height: 42, borderRadius: 12, background: 'rgba(255, 50, 50, 0.1)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff5555' 
          }}>
            <AlertCircle size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>KYC Action Required</div>
            <div style={{ fontSize: 12, color: '#ff7777', marginTop: 2, fontWeight: 500 }}>{user?.kycRejectionNote || 'Documents were rejected. Tap to resubmit.'}</div>
          </div>
          <ArrowRight size={16} color="var(--text-tertiary)" />
        </Link>
      )}

      {!user?.kycStatus && (
        <Link to="/cleaner/kyc" style={{ 
          margin: '0 0 20px', 
          padding: '16px', 
          borderRadius: 20, 
          background: 'linear-gradient(135deg, rgba(var(--accent-lime-rgb), 0.1) 0%, rgba(var(--accent-lime-rgb), 0.03) 100%)', 
          border: '1px solid rgba(var(--accent-lime-rgb), 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          textDecoration: 'none',
          boxShadow: '0 8px 32px rgba(var(--accent-lime-rgb), 0.05)'
        }}>
          <div style={{ 
            width: 42, height: 42, borderRadius: 12, background: 'var(--accent-lime)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' 
          }}>
            <Award size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Complete Your Profile</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Submit KYC documents to start accepting tasks.</div>
          </div>
          <ArrowRight size={16} color="var(--text-tertiary)" />
        </Link>
      )}

      {/* Today's count */}
      <div className="glass" style={{ padding: '32px 24px', textAlign: 'center', marginBottom: 20, position: 'relative', overflow: 'hidden', border: '1px solid var(--border-glass-hover)' }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 140, height: 140, background: 'var(--accent-lime)', filter: 'blur(80px)', opacity: 0.1, pointerEvents: 'none' }} />
        <div className="text-label text-secondary" style={{ marginBottom: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Today's Tasks</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 72, fontWeight: 900, color: 'var(--accent-lime)', lineHeight: 1, letterSpacing: '-0.04em', textShadow: '0 0 30px rgba(var(--accent-lime-rgb), 0.3)' }}>
          {tasks.length}
        </div>
        <div className="text-body-sm text-secondary" style={{ marginTop: 10, fontWeight: 500 }}>vehicles assigned for today</div>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ gap: 10, marginBottom: 24 }}>
        {[
          { icon: AlertCircle, value: pending, label: 'Pending', color: 'var(--warning)' },
          { icon: Clock, value: inProgress, label: 'In Progress', color: 'var(--primary-blue)' },
          { icon: CheckCircle2, value: completed, label: 'Done', color: 'var(--success)' },
        ].map((s, i) => (
          <div key={i} className="glass" style={{ padding: 16, textAlign: 'center' }}>
            <s.icon size={18} style={{ color: s.color, margin: '0 auto 6px' }} />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800 }}>{s.value}</div>
            <div className="text-body-sm text-secondary" style={{ fontSize: 11 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Operations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <Link to="/cleaner/earnings" className="glass" style={{ padding: '18px 16px', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 14, border: '1px solid var(--border-glass)' }}>
          <div className="flex justify-between items-start">
            <div style={{ width: 38, height: 38, background: 'var(--accent-lime)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', boxShadow: '0 4px 12px rgba(var(--accent-lime-rgb), 0.25)' }}>
               <IndianRupee size={18} />
            </div>
            <ArrowRight size={14} style={{ opacity: 0.5 }} />
          </div>
          <div>
            <div className="text-label text-secondary" style={{ fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 2 }}>Earnings</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Check Payout</div>
          </div>
        </Link>
        <Link to="/cleaner/attendance" className="glass" style={{ padding: '18px 16px', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 14, border: '1px solid var(--border-glass)' }}>
          <div className="flex justify-between items-start">
            <div style={{ width: 38, height: 38, background: 'rgba(var(--primary-blue-rgb), 0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-blue)', boxShadow: '0 4px 12px rgba(var(--primary-blue-rgb), 0.1)' }}>
               <Calendar size={18} />
            </div>
            <ArrowRight size={14} style={{ opacity: 0.5 }} />
          </div>
          <div>
            <div className="text-label text-secondary" style={{ fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 2 }}>Attendance</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>View History</div>
          </div>
        </Link>
      </div>

      {/* Performance */}
      <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
        <div className="text-label text-secondary" style={{ marginBottom: 14 }}>Performance</div>
        <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
          <span className="text-body-sm text-secondary">Completion Rate</span>
          <span style={{ fontWeight: 600, color: 'var(--success)' }}>{tasks.length > 0 ? Math.round((completed/tasks.length)*100) : 0}%</span>
        </div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${tasks.length > 0 ? (completed/tasks.length)*100 : 0}%`, background: 'var(--success)' }} /></div>
        <div className="flex justify-between text-body-sm text-secondary" style={{ marginTop: 14 }}>
          <span>Rating: ★ {user?.rating?.toFixed(1) || 'N/A'}</span>
          <span>{completed} total completed</span>
        </div>
      </div>

      {/* Quick start */}
      <Link to="/cleaner/tasks" className="btn btn-primary w-full btn-lg" style={{ marginBottom: 100 }}>
        Start Tasks <ArrowRight size={18} />
      </Link>
    </div>
  )
}
