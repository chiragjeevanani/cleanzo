import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, ShieldCheck, Loader2 } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { formatINR } from '../../utils/helpers'

export default function Receipt() {
  const { paymentId } = useParams()
  const navigate = useNavigate()
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await apiClient.get(`/customer/payment-history/${paymentId}`)
        setPayment(res.payment)
      } catch (err) {
        setError('Failed to load receipt details.')
      } finally {
        setLoading(false)
      }
    }
    fetchDetails()
  }, [paymentId])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 12 }}>
        <Loader2 size={36} className="animate-spin text-lime" />
        <span className="text-secondary text-body-sm">Generating Invoice...</span>
      </div>
    )
  }

  if (error || !payment) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--error)' }}>
        {error || 'Receipt not found.'}
      </div>
    )
  }

  const subtotal = payment.package?.price || payment.amount / 100
  const priorityFee = payment.subscription?.priorityFee || 0
  const discount = payment.subscription?.referralDiscountAmount || 0 
  const total = subtotal + priorityFee - discount

  return (
    <div className="receipt-page" style={{ background: '#FAFBF8', minHeight: '100vh', color: '#1A1A1A', padding: '40px 20px', fontFamily: "'Inter', sans-serif" }}>
      {/* Action Buttons (Hidden during printing) */}
      <div className="no-print" style={{ maxWidth: 700, margin: '0 auto 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button 
          onClick={() => navigate(-1)} 
          className="btn" 
          style={{ background: '#EAECE6', color: '#1A1A1A', padding: '10px 18px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button 
          onClick={handlePrint} 
          className="btn" 
          style={{ background: '#0056B3', color: '#FFFFFF', padding: '10px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700 }}
        >
          <Printer size={16} /> Print / Save PDF
        </button>
      </div>

      {/* Invoice Layout */}
      <div className="invoice-container" style={{ maxWidth: 700, margin: '0 auto', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 24, padding: 48, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
        
        {/* Invoice Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
          <div>
            {/* Cleanzo Premium Branding */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#0056B3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 900 }}>C</span>
              </div>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.02em' }}>Cleanzo</span>
            </div>
            <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.4 }}>
              Premium Doorstep Car Clean Services<br />
              support@cleanzo.in • www.cleanzo.in
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: 800, color: '#111827', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Receipt</h1>
            <p style={{ fontSize: 13, color: '#4B5563', marginTop: 6, fontWeight: 600 }}>Invoice #: INV-{payment.paymentId?.slice(-6).toUpperCase()}</p>
            <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Date: {new Date(payment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        <div style={{ height: 1, background: '#F3F4F6', width: '100%', marginBottom: 32 }} />

        {/* Customer & Transaction Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 40 }}>
          <div>
            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF', letterSpacing: '1px', marginBottom: 12 }}>Billed To:</h3>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
              {payment.customer?.firstName ? `${payment.customer.firstName} ${payment.customer.lastName || ''}`.trim() : 'Cleanzo Customer'}
            </p>
            <p style={{ fontSize: 13, color: '#4B5563', marginTop: 4 }}>{payment.customer?.email}</p>
            <p style={{ fontSize: 13, color: '#4B5563', marginTop: 2 }}>+91 {payment.customer?.phone}</p>
          </div>
          <div>
            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF', letterSpacing: '1px', marginBottom: 12 }}>Vehicle Details:</h3>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
              {payment.vehicle?.brand} {payment.vehicle?.model}
            </p>
            <p style={{ fontSize: 13, color: '#4B5563', marginTop: 4, textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 600, background: '#F3F4F6', padding: '3px 8px', borderRadius: 6, display: 'inline-block' }}>
              {payment.vehicle?.number}
            </p>
          </div>
        </div>

        {/* Billing Particulars Table */}
        <div style={{ border: '1px solid #E5E7EB', borderRadius: 16, overflow: 'hidden', marginBottom: 32 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ padding: '16px 20px', fontSize: 11, fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Item Description</th>
                <th style={{ padding: '16px 20px', fontSize: 11, fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Validity</th>
                <th style={{ padding: '16px 20px', fontSize: 11, fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '20px', fontSize: 14 }}>
                  <div style={{ fontWeight: 700, color: '#111827' }}>{payment.package?.name || 'Subscription Plan'} Extension</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Dynamic doorstep car cleaning subscription</div>
                </td>
                <td style={{ padding: '20px', fontSize: 13, color: '#4B5563', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  30 Service Days
                </td>
                <td style={{ padding: '20px', fontSize: 14, fontWeight: 700, color: '#111827', textAlign: 'right' }}>
                  {formatINR(subtotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pricing Summary Breakdown */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 40 }}>
          <div style={{ width: 280 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#4B5563' }}>
              <span>Base Package Price</span>
              <span>{formatINR(subtotal)}</span>
            </div>
            {priorityFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#4B5563' }}>
                <span>Premium Priority Fee</span>
                <span>+{formatINR(priorityFee)}</span>
              </div>
            )}
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#10B981', fontWeight: 600 }}>
                <span>Referral Discount</span>
                <span>-{formatINR(discount)}</span>
              </div>
            )}
            <div style={{ height: 1, background: '#E5E7EB', margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 16, fontWeight: 800, color: '#111827' }}>
              <span>Total Paid</span>
              <span style={{ fontSize: 20, color: '#0056B3' }}>{formatINR(total)}</span>
            </div>
          </div>
        </div>

        {/* Payment Gateway details */}
        <div className="glass" style={{ border: '1px solid #D1D5DB', borderRadius: 16, padding: '16px 20px', background: '#F9FAFB', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={20} color="#10B981" strokeWidth={3} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Payment Secured via Razorpay</div>
            <div style={{ fontSize: 12, color: '#4B5563', marginTop: 2 }}>
              Method: <b>{payment.method || 'Online'}</b> • Source: <b>{payment.payVia || 'Razorpay'}</b> • Payment ID: <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{payment.paymentId}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <p style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.4 }}>
            Cleanzo is a registered trademark of Cleanzo Inc.<br />
            This is a computer-generated tax invoice and requires no physical signature.<br />
            Thank you for your business!
          </p>
        </div>

      </div>

      {/* Styled print CSS block */}
      <style>{`
        @media print {
          body {
            background: #FFFFFF !important;
            padding: 0 !important;
            color: #000000 !important;
          }
          .receipt-page {
            background: #FFFFFF !important;
            padding: 0 !important;
          }
          .invoice-container {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .no-print {
            display: none !important;
          }
          table {
            border-color: #000000 !important;
          }
          th, td {
            border-color: #000000 !important;
          }
        }
      `}</style>
    </div>
  )
}
