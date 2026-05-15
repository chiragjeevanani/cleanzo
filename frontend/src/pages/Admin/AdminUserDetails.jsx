import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, User, Phone, Mail, MapPin, Calendar, Car, Box, ShoppingBag } from 'lucide-react'
import apiClient from '../../services/apiClient'
import PageLoader from '../../components/PageLoader'

export default function AdminUserDetails() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await apiClient.get(`/admin/users/${id}`)
        setData(res)
      } catch (err) {
        setError(err.message || 'Failed to fetch user details')
      } finally {
        setLoading(false)
      }
    }
    fetchDetails()
  }, [id])

  if (loading) return <PageLoader />
  if (error) return <div className="p-4 text-error">{error}</div>
  if (!data?.user) return <div className="p-4">User not found</div>

  const { user, vehicles, subscriptions, orders } = data

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div className="flex items-center gap-12" style={{ marginBottom: 24 }}>
        <Link to="/admin/users" className="btn-icon btn-glass">
          <ArrowLeft size={20} />
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700 }}>
          User Details
        </h1>
      </div>

      <div className="grid-2 gap-24">
        {/* Profile Card */}
        <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
          <div className="flex items-center gap-16" style={{ marginBottom: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-blue), var(--accent-lime))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#0A0A0A' }}>
              {user.firstName ? user.firstName[0].toUpperCase() : <User size={32} />}
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{user.firstName} {user.lastName}</h2>
              <span className={`chip mt-4 ${user.isActive !== false ? 'chip-success' : 'chip-error'}`}>
                {user.isActive !== false ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col gap-12">
            <div className="flex items-center gap-12 text-secondary">
              <Phone size={16} /> <span>{user.phone}</span>
            </div>
            {user.email && (
              <div className="flex items-center gap-12 text-secondary">
                <Mail size={16} /> <span>{user.email}</span>
              </div>
            )}
            {user.city && (
              <div className="flex items-center gap-12 text-secondary">
                <MapPin size={16} /> <span>{user.city}</span>
              </div>
            )}
            <div className="flex items-center gap-12 text-secondary">
              <Calendar size={16} /> <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Addresses */}
        <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} className="text-secondary" /> Saved Addresses
          </h3>
          {user.addresses?.length > 0 ? (
            <div className="flex flex-col gap-12">
              {user.addresses.map(a => (
                <div key={a._id} style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border-glass)' }}>
                  <div style={{ fontWeight: 600 }}>{a.label} {a.isDefault && <span className="chip chip-lime ml-8">Default</span>}</div>
                  <div className="text-secondary text-sm mt-4">{a.line1}, {a.line2}</div>
                  <div className="text-secondary text-sm">{a.city} - {a.pincode}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-secondary text-sm">No saved addresses.</div>
          )}
        </div>
      </div>

      {/* Vehicles */}
      <h3 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Car size={24} className="text-primary-blue" /> Vehicles ({vehicles?.length || 0})
      </h3>
      {vehicles?.length > 0 ? (
        <div className="grid-3 gap-16">
          {vehicles.map(v => (
            <div key={v._id} className="glass" style={{ padding: 16, borderRadius: 16 }}>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{v.brand} {v.model}</div>
                  <div className="chip chip-ghost mt-4">{v.number}</div>
                </div>
                <div className="chip chip-lime" style={{ textTransform: 'capitalize' }}>{v.category.replace('_', ' ')}</div>
              </div>
              <div className="text-sm text-secondary mb-12">
                Color: {v.color || 'N/A'} <br/>
                Parking: {v.parking || 'N/A'}
              </div>
              {v.photos && v.photos.length > 0 && (
                <div className="flex gap-8 overflow-x-auto" style={{ paddingBottom: 8 }}>
                  {v.photos.map((photo, i) => (
                    <img key={i} src={photo} alt="Vehicle" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-glass)' }} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass p-4 text-center text-secondary" style={{ borderRadius: 16 }}>No vehicles added.</div>
      )}

      {/* Subscriptions */}
      <h3 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Box size={24} className="text-accent-lime" /> Subscriptions ({subscriptions?.length || 0})
      </h3>
      {subscriptions?.length > 0 ? (
        <div className="grid-2 gap-16">
          {subscriptions.map(s => (
            <div key={s._id} className="glass" style={{ padding: 16, borderRadius: 16 }}>
              <div className="flex justify-between items-center mb-8">
                <div style={{ fontWeight: 600 }}>{s.package?.name || 'Trial Package'}</div>
                <div className={`chip ${s.status === 'Active' ? 'chip-success' : 'chip-ghost'}`}>{s.status}</div>
              </div>
              <div className="text-sm text-secondary flex flex-col gap-4">
                <div>Vehicle: {s.vehicle?.brand} {s.vehicle?.model} ({s.vehicle?.number})</div>
                <div>Expires: {new Date(s.endDate).toLocaleDateString()}</div>
                <div>Amount: ₹{s.amount}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass p-4 text-center text-secondary" style={{ borderRadius: 16 }}>No active subscriptions.</div>
      )}
      
      {/* Marketplace Orders */}
      <h3 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ShoppingBag size={24} className="text-primary-blue" /> Marketplace Orders ({orders?.length || 0})
      </h3>
      {orders?.length > 0 ? (
        <div className="grid-2 gap-16">
          {orders.map(o => (
            <div key={o._id} className="glass" style={{ padding: 16, borderRadius: 16 }}>
              <div className="flex justify-between items-center mb-8">
                <div style={{ fontWeight: 600 }}>Order #{o.orderId}</div>
                <div className={`chip ${o.status === 'Delivered' ? 'chip-success' : o.status === 'Cancelled' ? 'chip-error' : 'chip-warning'}`}>{o.status}</div>
              </div>
              <div className="text-sm text-secondary flex flex-col gap-4">
                <div>Date: {new Date(o.createdAt).toLocaleDateString()}</div>
                <div>Items: {o.items.map(i => `${i.product?.name} (x${i.quantity})`).join(', ')}</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>Total: ₹{o.totalAmount}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass p-4 text-center text-secondary" style={{ borderRadius: 16 }}>No marketplace orders.</div>
      )}
    </div>
  )
}
