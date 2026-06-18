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

  const formatDateSpacing = (dateString) => {
    if (!dateString) return 'DD / MM / YYYY'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'DD / MM / YYYY'
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day} / ${month} / ${year}`
  }

  const formatAmount = (num) => {
    return `₹ ${Number(num).toFixed(2)}`
  }

  const formatPhone = (phoneStr) => {
    if (!phoneStr) return 'XXXXX XXXXX'
    let clean = phoneStr.replace(/^\+?91/, '').trim()
    if (clean.length === 10) {
      return `${clean.slice(0, 5)} ${clean.slice(5)}`
    }
    return phoneStr
  }

  const priorityFee = payment.subscription?.priorityFee || 0
  const discount = (payment.subscription?.couponDiscount || 0) + (payment.subscription?.referralDiscountAmount || 0)
  const subtotal = payment.amount
    ? ((payment.amount / 100) - priorityFee + discount)
    : (payment.package?.price || 0)
  const total = payment.amount ? (payment.amount / 100) : (subtotal + priorityFee - discount)

  const customerName = payment.customer?.firstName
    ? `${payment.customer.firstName} ${payment.customer.lastName || ''}`.trim()
    : 'Customer Name'
  const customerPhone = formatPhone(payment.customer?.phone)
  const customerEmail = payment.customer?.email || 'customer@email.com'

  const subSocietyId = payment.subscription?.society?._id || payment.subscription?.society
  const matchingAddress = payment.customer?.addresses?.find(addr => 
    addr.society && subSocietyId && addr.society.toString() === subSocietyId.toString()
  ) || payment.customer?.addresses?.find(addr => addr.isDefault) || payment.customer?.addresses?.[0]
  const societyName = matchingAddress?.societyName || payment.subscription?.society?.name || 'Society Name'

  const blockTower = payment.vehicle?.blockTower || payment.customer?.addresses?.[0]?.tower || 'Tower X'
  const flatNumber = payment.vehicle?.flatNumber || payment.customer?.addresses?.[0]?.flat || 'Flat XXX'
  
  const city = payment.subscription?.society?.city || payment.customer?.addresses?.[0]?.city || payment.customer?.city || 'Noida'
  const state = payment.subscription?.society?.state || payment.customer?.addresses?.[0]?.state || 'Uttar Pradesh'
  const cityState = `${city}, ${state}`

  const invoiceYear = payment.createdAt ? new Date(payment.createdAt).getFullYear() : '2026'
  const invoiceSeq = payment.paymentId ? payment.paymentId.slice(-3).toUpperCase() : '001'
  const invoiceNo = `CZ-${invoiceYear}-${invoiceSeq}`
  const invoiceDate = formatDateSpacing(payment.createdAt)

  const paymentDate = formatDateSpacing(payment.createdAt)
  const paymentMode = payment.method || 'UPI / Card'
  const transactionId = payment.paymentId || 'XXXXXXXXXXXXXXXX'

  const planName = payment.package?.name
    ? `${payment.package.name} — Monthly Subscription`
    : 'Sedan Plan — Monthly Subscription'

  const vehicleBrand = payment.vehicle?.brand
  const vehicleModel = payment.vehicle?.model
  const vehicleName = [vehicleBrand, vehicleModel].filter(Boolean).join(' ') || 'N/A'
  const vehicleNumber = payment.vehicle?.number || 'XX 00 XX 0000'

  const planStartDate = formatDateSpacing(payment.subscription?.startDate)
  const totalDays = payment.subscription?.totalDays || 30
  const isOneDay = payment.subscription?.isTrial || totalDays === 1
  const planEndDate = isOneDay
    ? planStartDate
    : formatDateSpacing(payment.subscription?.endDate)
  const planEndDateText = isOneDay
    ? `${planStartDate} (1 day from start date)`
    : `${planEndDate} (${totalDays} days from start date)`

  const serviceSchedule = 'Daily — 7 days a week'

  return (
    <div className="receipt-page" style={{ background: '#FAFBF8', minHeight: '100vh', color: '#1A1A1A', padding: '40px 20px', fontFamily: "'Inter', sans-serif" }}>
      {/* Action Buttons (Hidden during printing) */}
      <div className="no-print" style={{ maxWidth: 750, margin: '0 auto 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button 
          onClick={() => navigate(-1)} 
          className="btn" 
          style={{ background: '#EAECE6', color: '#1A1A1A', padding: '10px 18px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', border: 'none' }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button 
          onClick={handlePrint} 
          className="btn" 
          style={{ background: '#1A4FDF', color: '#FFFFFF', padding: '10px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none' }}
        >
          <Printer size={16} /> Print / Save PDF
        </button>
      </div>

      {/* Invoice Container */}
      <div className="invoice-container" style={{ 
        maxWidth: 750, 
        margin: '0 auto', 
        background: '#FFFFFF', 
        padding: '36px', 
        boxSizing: 'border-box',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        borderRadius: '12px'
      }}>
        
        {/* Logo Header Box */}
        <div style={{ display: 'grid', gridTemplateColumns: '70% 30%', border: '1.5px solid #000000', marginBottom: '36px' }}>
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <img src="/logo.png" alt="Cleanzo Logo" style={{ height: '44px', objectFit: 'contain', alignSelf: 'flex-start' }} />
            <div style={{ color: '#00A854', fontStyle: 'italic', fontWeight: 'bold', fontSize: '13px', marginTop: '8px' }}>
              Redefining Urban Car Care!
            </div>
            <div style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>
              {cityState} &middot; www.trycleanzo.com
            </div>
          </div>
          <div style={{ background: '#1A4FDF', color: '#FFFFFF', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', borderLeft: '1.5px solid #000000' }}>
            <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '900', letterSpacing: '1px' }}>INVOICE</h2>
            <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '8px' }}>
              Invoice No: <span style={{ fontFamily: 'monospace' }}>{invoiceNo}</span>
            </div>
            <div style={{ fontSize: '11px', marginTop: '4px' }}>
              Invoice Date: {invoiceDate}
            </div>
          </div>
        </div>

        {/* Billed To & Payment Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1.5px solid #000000', marginBottom: '36px' }}>
          {/* Headers */}
          <div style={{ padding: '12px 16px', fontWeight: 'bold', fontSize: '13px', borderBottom: '1.5px solid #000000', borderRight: '1.5px solid #000000' }}>
            BILLED TO
          </div>
          <div style={{ padding: '12px 16px', fontWeight: 'bold', fontSize: '13px', borderBottom: '1.5px solid #000000' }}>
            PAYMENT DETAILS
          </div>
          {/* Contents */}
          <div style={{ padding: '24px 20px', borderRight: '1.5px solid #000000', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1A4FDF', marginBottom: '6px' }}>
              {customerName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#333' }}>
              <span>📱</span> +91 {customerPhone}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#333' }}>
              <span>✉</span> {customerEmail}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#333' }}>
              <span>🏢</span> <span>{societyName}, {blockTower}, {flatNumber}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888', fontSize: '11px', marginTop: '4px' }}>
              <span>📍</span> {cityState}
            </div>
          </div>
          <div style={{ padding: '24px 20px', background: '#F4F7FC', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <div style={{ color: '#666', fontWeight: 'bold', fontSize: '11px' }}>Payment Date</div>
              <div style={{ color: '#000', fontSize: '12px', marginTop: '2px' }}>{paymentDate}</div>
            </div>
            <div>
              <div style={{ color: '#666', fontWeight: 'bold', fontSize: '11px' }}>Payment Mode</div>
              <div style={{ color: '#000', fontSize: '12px', marginTop: '2px' }}>{paymentMode}</div>
            </div>
            <div>
              <div style={{ color: '#666', fontWeight: 'bold', fontSize: '11px' }}>Transaction / Reference ID</div>
              <div style={{ color: '#000', fontSize: '12px', marginTop: '2px', wordBreak: 'break-all', fontFamily: 'monospace' }}>{transactionId}</div>
            </div>
          </div>
        </div>

        {/* Subscription Details Table */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{ background: '#1A4FDF', color: '#FFFFFF', padding: '10px 16px', fontWeight: 'bold', fontSize: '12px', border: '1.5px solid #000000', borderBottom: 'none', display: 'inline-block', letterSpacing: '0.5px' }}>
            SUBSCRIPTION DETAILS
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000000' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ width: '30%', background: '#F2F2F2', padding: '12px 16px', fontWeight: 'bold', fontSize: '12px', borderRight: '1px solid #000000' }}>Plan Name</td>
                <td style={{ padding: '12px 16px', fontSize: '12px' }}>{planName}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ background: '#F2F2F2', padding: '12px 16px', fontWeight: 'bold', fontSize: '12px', borderRight: '1px solid #000000' }}>Vehicle Name</td>
                <td style={{ padding: '12px 16px', fontSize: '12px' }}>{vehicleName}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ background: '#F2F2F2', padding: '12px 16px', fontWeight: 'bold', fontSize: '12px', borderRight: '1px solid #000000' }}>Vehicle Number</td>
                <td style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 'bold' }}>{vehicleNumber}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ background: '#F2F2F2', padding: '12px 16px', fontWeight: 'bold', fontSize: '12px', borderRight: '1px solid #000000' }}>Plan Start Date</td>
                <td style={{ padding: '12px 16px', fontSize: '12px' }}>{planStartDate}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ background: '#F2F2F2', padding: '12px 16px', fontWeight: 'bold', fontSize: '12px', borderRight: '1px solid #000000' }}>Plan End Date</td>
                <td style={{ padding: '12px 16px', fontSize: '12px' }}>{planEndDateText}</td>
              </tr>
              <tr>
                <td style={{ background: '#F2F2F2', padding: '12px 16px', fontWeight: 'bold', fontSize: '12px', borderRight: '1px solid #000000' }}>Service Schedule</td>
                <td style={{ padding: '12px 16px', fontSize: '12px' }}>{serviceSchedule}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount Summary Table */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{ background: '#1A4FDF', color: '#FFFFFF', padding: '10px 16px', fontWeight: 'bold', fontSize: '12px', border: '1.5px solid #000000', borderBottom: 'none', display: 'inline-block', letterSpacing: '0.5px' }}>
            AMOUNT SUMMARY
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000000' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ padding: '14px 18px', fontSize: '13px', color: '#000' }}>Subscription Plan Amount</td>
                <td style={{ padding: '14px 18px', fontSize: '13px', color: '#000', borderLeft: '1px solid #000000', textAlign: 'right', width: '20%', fontWeight: 'bold' }}>{formatAmount(subtotal)}</td>
              </tr>
              {priorityFee > 0 && (
                <tr style={{ borderBottom: '1px solid #000000' }}>
                  <td style={{ padding: '14px 18px', fontSize: '13px', color: '#000' }}>Premium Priority Fee</td>
                  <td style={{ padding: '14px 18px', fontSize: '13px', color: '#000', borderLeft: '1px solid #000000', textAlign: 'right', fontWeight: 'bold' }}>{formatAmount(priorityFee)}</td>
                </tr>
              )}
              {discount > 0 && (
                <tr style={{ borderBottom: '1px solid #000000' }}>
                  <td style={{ padding: '14px 18px', fontSize: '13px', color: '#000' }}>Referral / Coupon Discount</td>
                  <td style={{ padding: '14px 18px', fontSize: '13px', borderLeft: '1px solid #000000', textAlign: 'right', fontWeight: 'bold', color: '#d32f2f' }}>-{formatAmount(discount)}</td>
                </tr>
              )}
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <td style={{ padding: '14px 18px', fontSize: '11px', color: '#666' }}>
                  GST <span style={{ color: '#888', fontStyle: 'italic' }}>(Registration in progress &mdash; not applicable currently)</span>
                </td>
                <td style={{ padding: '14px 18px', fontSize: '12px', color: '#666', borderLeft: '1px solid #000000', textAlign: 'right' }}>₹ 0.00</td>
              </tr>
              <tr style={{ background: '#1A4FDF', color: '#FFFFFF', fontWeight: 'bold' }}>
                <td style={{ padding: '16px 18px', fontSize: '14px', letterSpacing: '0.5px' }}>TOTAL AMOUNT PAID</td>
                <td style={{ padding: '16px 18px', fontSize: '15px', borderLeft: '1px solid #000000', textAlign: 'right' }}>{formatAmount(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Customer Support & Thank You note */}
        <div style={{ display: 'grid', gridTemplateColumns: '35% 65%', border: '1.5px solid #000000', marginBottom: '32px' }}>
          <div style={{ padding: '20px 16px', borderRight: '1.5px solid #000000', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
            <div style={{ color: '#1A4FDF', fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>CUSTOMER SUPPORT</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📞</span> +91 95586 03622
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>✉</span> hello@trycleanzo.com
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🌐</span> www.trycleanzo.com
            </div>
          </div>
          <div style={{ padding: '24px 16px', background: '#F4F7FC', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ color: '#1A4FDF', fontWeight: 'bold', fontSize: '15px', marginBottom: '6px' }}>
              Thank you for choosing Cleanzo! 🚗✨
            </div>
            <div style={{ color: '#555', fontStyle: 'italic', fontSize: '11px', lineHeight: '1.4' }}>
              Your car is in great hands. We show up every morning so you never have to worry about a dirty car again.
            </div>
          </div>
        </div>

        {/* Terms fine print */}
        <div style={{ textAlign: 'center', fontSize: '9px', color: '#888', fontStyle: 'italic', marginTop: '40px', lineHeight: '1.4', padding: '0 10px' }}>
          Terms: This invoice is valid for the subscription period stated above. For cancellations, plan changes, or disputes, please contact us within 7 days of the invoice date. Cleanzo is an early-stage startup. GST registration is in progress and will be updated on future invoices once obtained.
        </div>

      </div>

      {/* Styled print CSS block */}
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            background: #FFFFFF !important;
            padding: 0 !important;
            margin: 0 !important;
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
        }
      `}</style>
    </div>
  )
}
