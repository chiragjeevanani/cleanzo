import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, User, Phone, MapPin, Calendar, Star, FileText, CheckCircle } from 'lucide-react'
import apiClient from '../../services/apiClient'
import PageLoader from '../../components/PageLoader'

export default function AdminCleanerDetails() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await apiClient.get(`/admin/cleaners/${id}`)
        setData(res)
      } catch (err) {
        setError(err.message || 'Failed to fetch cleaner details')
      } finally {
        setLoading(false)
      }
    }
    fetchDetails()
  }, [id])

  if (loading) return <PageLoader />
  if (error) return <div className="p-4 text-error">{error}</div>
  if (!data?.cleaner) return <div className="p-4">Cleaner not found</div>

  const { cleaner, recentTasks, recentRatings } = data

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div className="flex items-center gap-12" style={{ marginBottom: 24 }}>
        <Link to="/admin/cleaners" className="btn-icon btn-glass">
          <ArrowLeft size={20} />
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700 }}>
          Cleaner Details
        </h1>
      </div>

      <div className="grid-2 gap-24">
        {/* Profile Card */}
        <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
          <div className="flex items-center gap-16" style={{ marginBottom: 24 }}>
            {cleaner.avatar ? (
              <img src={cleaner.avatar} alt="Avatar" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-glass)' }} />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-blue), var(--accent-lime))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#0A0A0A' }}>
                {cleaner.name ? cleaner.name[0].toUpperCase() : <User size={32} />}
              </div>
            )}
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700 }}>{cleaner.name}</h2>
              <div className="flex gap-8 mt-4">
                <span className={`chip ${cleaner.isActive ? 'chip-success' : 'chip-error'}`}>
                  {cleaner.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="chip chip-lime flex items-center gap-4">
                  <Star size={12} fill="currentColor" /> {cleaner.rating}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-12">
            <div className="flex items-center gap-12 text-secondary">
              <Phone size={16} /> <span>{cleaner.phone}</span>
            </div>
            {cleaner.area && (
              <div className="flex items-center gap-12 text-secondary">
                <MapPin size={16} /> <span>{cleaner.area}</span>
              </div>
            )}
            <div className="flex items-center gap-12 text-secondary">
              <Calendar size={16} /> <span>Joined {new Date(cleaner.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* KYC & Societies */}
        <div className="glass flex flex-col gap-24" style={{ padding: 24, borderRadius: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} className="text-secondary" /> KYC Documents
            </h3>
            <div className="flex gap-16">
              {cleaner.kycDocuments?.aadhaarPhoto ? (
                <a href={cleaner.kycDocuments.aadhaarPhoto} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-8 text-sm text-primary-blue">
                  <div style={{ width: 60, height: 60, borderRadius: 12, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-glass)' }}>
                    <FileText size={24} />
                  </div>
                  Aadhaar
                </a>
              ) : <span className="text-secondary text-sm">No Aadhaar</span>}
              
              {cleaner.kycDocuments?.panPhoto ? (
                <a href={cleaner.kycDocuments.panPhoto} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-8 text-sm text-primary-blue">
                  <div style={{ width: 60, height: 60, borderRadius: 12, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-glass)' }}>
                    <FileText size={24} />
                  </div>
                  PAN Card
                </a>
              ) : <span className="text-secondary text-sm">No PAN</span>}
            </div>
            <div className="mt-8">
              <span className={`text-sm ${cleaner.kycStatus === 'approved' ? 'text-success' : cleaner.kycStatus === 'rejected' ? 'text-error' : 'text-warning'}`}>
                KYC Status: <strong style={{ textTransform: 'capitalize' }}>{cleaner.kycStatus}</strong>
              </span>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={18} className="text-secondary" /> Assigned Societies
            </h3>
            {cleaner.assignedSocieties?.length > 0 ? (
              <div className="flex flex-wrap gap-8">
                {cleaner.assignedSocieties.map(s => (
                  <span key={s._id} className="chip chip-ghost">{s.name}, {s.city}</span>
                ))}
              </div>
            ) : (
              <div className="text-secondary text-sm">No societies assigned.</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Tasks */}
      <h3 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <CheckCircle size={24} className="text-primary-blue" /> Recent Tasks (Last 20)
      </h3>
      {recentTasks?.length > 0 ? (
        <div className="glass" style={{ overflow: 'hidden', borderRadius: 16 }}>
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Customer</th><th>Vehicle</th><th>Status</th></tr>
            </thead>
            <tbody>
              {recentTasks.map(t => (
                <tr key={t._id}>
                  <td>{new Date(t.date).toLocaleDateString()}</td>
                  <td>{t.customer ? `${t.customer.firstName} ${t.customer.lastName}` : 'N/A'}</td>
                  <td>{t.vehicle ? `${t.vehicle.brand} ${t.vehicle.model} (${t.vehicle.number})` : 'N/A'}</td>
                  <td>
                    <span className={`chip ${t.status === 'completed' ? 'chip-success' : t.status === 'skipped' ? 'chip-ghost' : 'chip-warning'}`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass p-4 text-center text-secondary" style={{ borderRadius: 16 }}>No recent tasks.</div>
      )}

      {/* Ratings & Reviews */}
      <h3 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Star size={24} className="text-accent-lime" /> Recent Ratings
      </h3>
      {recentRatings?.length > 0 ? (
        <div className="grid-2 gap-16">
          {recentRatings.map(r => (
            <div key={r._id} className="glass" style={{ padding: 16, borderRadius: 16 }}>
              <div className="flex justify-between items-center mb-8">
                <div style={{ fontWeight: 600 }}>{r.customer ? `${r.customer.firstName} ${r.customer.lastName}` : 'Unknown'}</div>
                <div className="flex gap-4 text-accent-lime">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill={i < r.score ? 'currentColor' : 'none'} color={i < r.score ? 'currentColor' : 'var(--border-glass)'} />
                  ))}
                </div>
              </div>
              {r.feedback && <div className="text-sm text-secondary italic">"{r.feedback}"</div>}
              <div className="text-xs text-tertiary mt-8">{new Date(r.createdAt).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass p-4 text-center text-secondary" style={{ borderRadius: 16 }}>No ratings yet.</div>
      )}
    </div>
  )
}
