import PageLoader from '../../components/PageLoader'
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useCustomerData } from '../../context/CustomerDataContext'
import { useToast } from '../../context/ToastContext'
import { getPackagePricing } from '../../utils/pricing'

export default function PlanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const vehicleId = searchParams.get('vehicleId')
  const [pkg, setPkg] = useState(null)
  const [loading, setLoading] = useState(true)
  const { subscriptions, vehicles, discounts } = useCustomerData()

  const activeSubForVehicle = (subscriptions || []).find(
    s => s.status === 'Active' && s.vehicle?._id === vehicleId
  );

  const selectedVehicle = (vehicles || []).find(v => v._id === vehicleId) || null;

  useEffect(() => {
    const fetchPkg = async () => {
      try {
        const res = await apiClient.get(`/packages/${id}`)
        setPkg(res.package)
      } catch (err) {
        console.error('Error fetching plan:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPkg()
  }, [id])

  if (loading) return <PageLoader />
  if (!pkg) return <div style={{ padding: 20, textAlign: 'center' }}>Plan not found</div>

  if (!pkg) return null

  const pricing = getPackagePricing(pkg, selectedVehicle, discounts)
  const includes = pkg.features || []
  const doesNotInclude = pkg.excludedFeatures || []

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', paddingBottom: 100 }}>
      {/* Header */}
      <div className="app-header" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ArrowLeft size={20} /> 
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Plan Details</span>
        </button>
      </div>

      <div style={{ padding: '24px 20px' }}>
        <div className="flex justify-between items-start" style={{ marginBottom: 8 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>{pkg.name}</h1>
          <div className="flex flex-col items-end">
            {pricing.hasDiscount && (
              <div className="flex items-center gap-6" style={{ marginBottom: 2 }}>
                <span className="chip chip-lime" style={{ fontSize: 9 }}>{pricing.percent}% OFF</span>
                <span className="text-secondary text-body-sm" style={{ textDecoration: 'line-through' }}>₹{pricing.originalPrice}</span>
              </div>
            )}
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-accent)' }}>₹{pricing.effectivePrice}</div>
          </div>
        </div>

        {pricing.hasDiscount && pricing.note && (
          <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600, marginBottom: 8 }}>
            {pricing.note}
          </div>
        )}

        <div className="divider" style={{ marginBottom: 32 }} />

        {/* Includes */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Includes</h2>
          <div className="flex flex-col gap-12">
            {includes.map((item, i) => (
              <div key={i} className="flex gap-12 items-start">
                <CheckCircle2 size={20} style={{ color: 'var(--success)', flexShrink: 0 }} />
                <span className="text-secondary" style={{ fontSize: 15 }}>{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Does not include */}
        {doesNotInclude.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Does not include</h2>
            <div className="flex flex-col gap-12">
              {doesNotInclude.map((item, i) => (
                <div key={i} className="flex gap-12 items-start">
                  <XCircle size={20} style={{ color: 'var(--error)', opacity: 0.6, flexShrink: 0 }} />
                  <span className="text-secondary" style={{ fontSize: 15 }}>{item}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Floating Bottom Button */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: 'var(--bg-primary)', borderTop: '1px solid var(--border-glass)', zIndex: 100, maxWidth: 480, margin: '0 auto' }}>
        {activeSubForVehicle ? (
          <div className="flex flex-col gap-8 w-full">
            <div style={{ fontSize: 12, color: 'var(--text-accent)', textAlign: 'center', fontWeight: 600 }}>
              You already have an active plan for this vehicle.
            </div>
            <button disabled className="btn btn-primary w-full btn-lg" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
              Already Subscribed
            </button>
          </div>
        ) : (
          <Link to={`/customer/booking?packageId=${pkg._id}${vehicleId ? `&vehicleId=${vehicleId}` : ''}`} className="btn btn-primary w-full btn-lg">
            Subscribe to {pkg.name}
          </Link>
        )}
      </div>
    </div>
  )
}
