import PageLoader from '../../components/PageLoader'
import { useState, useEffect } from 'react'
import { IndianRupee, TrendingUp, Calendar, AlertCircle, ShieldCheck, Download } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useToast } from '../../context/ToastContext'

export default function CleanerEarnings() {
  const { showToast } = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const res = await apiClient.get('/cleaner/earnings')
        setData(res)
      } catch (err) {
        setError('Failed to load earnings.')
      } finally {
        setLoading(false)
      }
    }
    fetchEarnings()
  }, [])

  if (loading) return <PageLoader />

  return (
    <div style={{ padding: '0 20px 100px' }}>
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between" style={{ padding: '24px 0 20px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>My Earnings</h1>
          <p className="text-secondary" style={{ fontSize: 13, marginTop: 3 }}>Current month payout</p>
        </div>
        <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(var(--accent-lime-rgb, 223,255,0), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-lime)' }}>
          <TrendingUp size={22} />
        </div>
      </div>

      {/* Hero Earnings Card */}
      <div style={{
        borderRadius: 36,
        padding: '36px 32px',
        marginBottom: 20,
        background: 'linear-gradient(145deg, #0d0d0d 0%, #1a1a1a 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background icon watermark */}
        <div style={{ position: 'absolute', top: -10, right: -10, opacity: 0.06, color: 'var(--accent-lime)', pointerEvents: 'none' }}>
          <IndianRupee size={140} />
        </div>

        <div style={{ position: 'relative' }}>
          <span style={{ color: 'var(--accent-lime)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Total Earned</span>
          <div className="flex items-end" style={{ gap: 6, marginBottom: 28 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-2px' }}>
              ₹{data?.totalEarnings?.toLocaleString() ?? '—'}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 700, marginBottom: 6 }}>.00</span>
          </div>

          <div className="grid-2" style={{ gap: 12 }}>
            <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', padding: '14px 18px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Present Days</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#fff' }}>{data?.presentDays ?? 0} Days</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', padding: '14px 18px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Daily Rate</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#fff' }}>₹{data?.dailyRate ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Breakdown */}
      <div className="glass" style={{ padding: 24, borderRadius: 28, marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Payment Breakdown</div>

        <div className="flex justify-between items-center" style={{ paddingBottom: 14 }}>
          <div className="flex items-center gap-12">
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={16} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <span className="text-body-sm" style={{ fontWeight: 600 }}>Standard Service</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>₹{data?.totalEarnings ?? 0}</span>
        </div>

        <div className="flex justify-between items-center" style={{ paddingTop: 14, paddingBottom: 14, borderTop: '1px solid var(--divider)' }}>
          <div className="flex items-center gap-12">
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={16} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <span className="text-body-sm text-tertiary" style={{ fontWeight: 600 }}>Bonus / Incentives</span>
          </div>
          <span className="text-tertiary" style={{ fontWeight: 700, fontSize: 15 }}>₹0</span>
        </div>

        <div className="flex justify-between items-center" style={{ paddingTop: 16, borderTop: '2px dashed var(--divider)' }}>
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-tertiary)' }}>Net Payable</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--accent-lime)' }}>₹{data?.totalEarnings ?? 0}</span>
        </div>
      </div>

      {/* Info Banner */}
      <div style={{ background: 'rgba(var(--accent-lime-rgb, 223,255,0), 0.05)', borderRadius: 24, padding: '20px 20px', marginBottom: 16, border: '1px solid rgba(var(--accent-lime-rgb, 223,255,0), 0.12)', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-lime)', flexShrink: 0 }}>
          <ShieldCheck size={22} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Secure Payout</div>
          <p className="text-secondary" style={{ fontSize: 13, lineHeight: 1.6 }}>Payments are processed on the 1st of every month directly to your registered bank account.</p>
        </div>
      </div>

      {/* Download Button */}
      <button className="btn btn-ghost w-full" style={{ borderRadius: 24, padding: '18px', fontWeight: 800, fontSize: 15, gap: 8 }} onClick={() => showToast('Statement download coming soon', 'info')}>
        <Download size={18} /> Download Statement
      </button>
    </div>
  )
}
