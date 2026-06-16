import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Check, Car, ShieldCheck, Clock, X, ChevronRight, MapPin, ChevronDown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import apiClient from '../../services/apiClient'
import { useCustomerData } from '../../context/CustomerDataContext'
import { useTheme } from '../../context/ThemeContext'
import { getPackagePricing } from '../../utils/pricing'
import { sortPackagesByTier } from '../../utils/helpers'
import { FEATURES } from '../../config/features'

// ─── Step labels ──────────────────────────────────────────────────────────────
const STEPS = ['Plan', 'Slot', 'Pay']

// sessionStorage key — lets a page refresh stay on the current wizard step
const WIZARD_KEY = 'cleanzo_booking_wizard'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isVehicleEligibleForPackage = (vehicle, pkg) => {
  if (!vehicle || !pkg) return false
  if (pkg.isTrial) return true
  if (!pkg.applicableModels || pkg.applicableModels.length === 0)
    return vehicle.category === pkg.category
  const brandMatch = pkg.applicableModels.find(
    app => app.brand.toLowerCase() === vehicle.brand.toLowerCase()
  )
  if (!brandMatch) return false
  if (!brandMatch.models || brandMatch.models.length === 0) return true
  return brandMatch.models.some(m => m.toLowerCase() === vehicle.model.toLowerCase())
}

const getLocalDateString = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ─── Slot card (reused in Step 1) ────────────────────────────────────────────
function SlotCard({ slot: s, selected, onSelect, prioritySlotFee }) {
  const isFull    = s.currentCount >= s.maxVehicles
  const isClosed  = s.status === 'Closed'
  const isBlocked = s.status === 'Blocked'
  const isUnavailable = isFull || isClosed || isBlocked

  const badge = isClosed  ? { text: 'CLOSED',         color: 'var(--error)',      bg: 'rgba(255,69,58,0.1)' }
              : isBlocked ? { text: 'BLOCKED',         color: 'var(--text-tertiary)', bg: 'var(--border-glass)' }
              : isFull    ? { text: 'FULL · PRIORITY', color: '#FF9500',           bg: 'rgba(255,149,0,0.1)' }
              :             { text: 'AVAILABLE',        color: 'var(--success)',    bg: 'rgba(50,215,75,0.1)' }

  const accentColor = selected
    ? (isUnavailable ? '#FF9500' : 'var(--text-accent)')
    : 'var(--text-tertiary)'

  return (
    <button
      className="glass"
      onClick={() => onSelect(s)}
      style={{
        padding: '18px 20px', display: 'flex', flexDirection: 'column', textAlign: 'left',
        borderColor: selected ? (isUnavailable ? '#FF9500' : 'var(--text-accent)') : 'var(--border-glass)',
        borderRadius: 18,
        background: selected ? (isUnavailable ? 'rgba(255,149,0,0.04)' : 'rgba(var(--bg-accent-rgb),0.05)') : 'var(--bg-glass)',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Clock size={16} style={{ color: accentColor, flexShrink: 0 }} />
          <span style={{ fontWeight: 700, lineHeight: 1 }}>{s.timeWindow}</span>
        </div>
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: '0.05em',
          color: badge.color, background: badge.bg, padding: '4px 10px', borderRadius: 8,
        }}>
          {badge.text}
        </span>
      </div>
      {isUnavailable && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, paddingLeft: 26, lineHeight: 1.4 }}>
          Priority override booking — a surcharge of <b>₹{prioritySlotFee}</b> applies.
        </div>
      )}
    </button>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function BookingFlow() {
  const navigate    = useNavigate()
  const location    = useLocation()
  const { user }    = useAuth()
  const { theme }   = useTheme()

  const queryParams     = new URLSearchParams(location.search)
  const initialPackageId = queryParams.get('packageId')
  const initialVehicleId = queryParams.get('vehicleId')
  const initialStatus    = queryParams.get('status')
  const initialError     = queryParams.get('error')

  const {
    vehicles, packages, societies, subscriptions: activeSubscriptions, settings, discounts,
    loading: dataLoading, refreshAll,
  } = useCustomerData()

  const hasUsedTrial = activeSubscriptions?.some(s => s.isTrial)

  // Dynamic trial price based on selected vehicle
  const getDynamicTrialPrice = () => {
    if (!selectedVehicle || packages.length === 0) return settings.trialPrice || 30
    const matched = packages.filter(
      p => p.isActive !== false && isVehicleEligibleForPackage(selectedVehicle, p)
    )
    const basic = matched.find(
      p => (p.tier || 'BASIC').toUpperCase() === 'BASIC' && p.trialPrice != null
    )
    if (basic) return basic.trialPrice
    const any = matched.find(p => p.trialPrice != null)
    if (any) return any.trialPrice
    return settings.trialPrice || 30
  }

  // Restore a saved wizard snapshot on plain refresh (but NOT during a Razorpay return).
  const restoreAppliedRef = useRef(false)
  const restoredRef = useRef(undefined)
  if (restoredRef.current === undefined) {
    restoredRef.current = initialStatus
      ? null
      : (() => { try { return JSON.parse(sessionStorage.getItem(WIZARD_KEY) || 'null') } catch { return null } })()
  }
  const restored = restoredRef.current

  // Step index: 0=Plan, 1=Slot, 2=Pay, 3=Success, 4=Failed
  const [step, setStep] = useState(() => {
    if (initialStatus === 'success' || initialStatus === 'payment_return') return 3
    if (initialStatus === 'failed') return 4
    if (restored && (restored.step === 1 || restored.step === 2)) return restored.step
    return 0
  })
  const [countdown, setCountdown] = useState(5)

  // Selections
  const [selectedSociety, setSelectedSociety] = useState(null)
  const [selectedSlot, setSelectedSlot]       = useState(null)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [selectedPkg, setSelectedPkg]         = useState(null)
  const [selectedTrialDate, setSelectedTrialDate] = useState(null)
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [isPremiumOverride, setIsPremiumOverride] = useState(false)
  const [overrideReason, setOverrideReason]   = useState('')

  const [razorpayReady, setRazorpayReady] = useState(false)
  const [processing, setProcessing]       = useState(false)
  const [paymentError, setPaymentError]   = useState('')

  // Coupon state
  const [couponInput, setCouponInput]   = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null) // { code, discountAmount }
  const [couponError, setCouponError]   = useState('')
  const [couponLoading, setCouponLoading] = useState(false)

  // Countdown on success/failure screens
  useEffect(() => {
    if (step === 3 || step === 4) {
      setCountdown(5)
      const t = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { clearInterval(t); navigate('/customer'); return 0 }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(t)
    }
  }, [step, navigate])

  // Handle initial page load when arriving via Razorpay redirect
  useEffect(() => {
    if (initialStatus === 'success') refreshAll()
    else if (initialStatus === 'failed') setPaymentError(initialError || 'Payment failed')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle Razorpay's mobile redirect-back via Vercel /api/payment-callback
  // On mobile, card 3DS always redirects — the Vercel function receives the POST
  // and redirects back to /customer/booking?status=payment_return&razorpay_payment_id=...
  useEffect(() => {
    const status  = queryParams.get('status')
    const orderId = queryParams.get('razorpay_order_id')
    const pmtId   = queryParams.get('razorpay_payment_id')
    const sig     = queryParams.get('razorpay_signature')
    const err     = queryParams.get('error')

    if (status === 'payment_return' && pmtId && user) {
      let ctx = null
      try { ctx = JSON.parse(localStorage.getItem('cleanzo_pending_booking') || 'null') } catch {}

      if (!ctx) {
        setPaymentError('Booking context lost after redirect. Please try again.')
        setStep(4)
        return
      }

      setProcessing(true)
      ;(async () => {
        try {
          await apiClient.post('/payment/verify', {
            razorpay_order_id: orderId,
            razorpay_payment_id: pmtId,
            razorpay_signature: sig,
          })
          await apiClient.post('/customer/subscriptions', { ...ctx, paymentId: pmtId })
          localStorage.removeItem('cleanzo_pending_booking')
          setProcessing(false)
          refreshAll()
          setStep(3)
        } catch (e) {
          localStorage.removeItem('cleanzo_pending_booking')
          setProcessing(false)
          setPaymentError(e.message || 'Payment verification failed.')
          setStep(4)
        }
      })()
    } else if (status === 'failed') {
      setPaymentError(err || 'Payment failed')
      setStep(4)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Auto-select default society + vehicle on data load (restored snapshot takes priority)
  useEffect(() => {
    if (dataLoading.vehicles || dataLoading.packages || dataLoading.societies) return
    if (societies.length > 0 && !selectedSociety) {
      const rs = restored?.societyId ? societies.find(s => s._id === restored.societyId) : null
      setSelectedSociety(rs || societies[0])
    }
    if (vehicles.length > 0 && !selectedVehicle) {
      const rv = restored?.vehicleId ? vehicles.find(v => v._id === restored.vehicleId) : null
      if (rv) {
        setSelectedVehicle(rv)
      } else if (initialVehicleId) {
        const v = vehicles.find(v => v._id === initialVehicleId)
        setSelectedVehicle(v || vehicles[0])
      } else if (initialPackageId) {
        const pkg = packages.find(p => p._id === initialPackageId)
        setSelectedVehicle(vehicles.find(v => isVehicleEligibleForPackage(v, pkg)) || vehicles[0])
      } else {
        setSelectedVehicle(vehicles[0])
      }
    }
    if (!selectedPkg) {
      if (restored?.isTrial) {
        setSelectedPkg({ isTrial: true, name: '1-Day Trial', price: trialPrice, _id: null })
      } else if (restored?.packageId) {
        const pkg = packages.find(p => p._id === restored.packageId)
        if (pkg) setSelectedPkg(pkg)
      } else if (initialPackageId && packages.length > 0) {
        const pkg = packages.find(p => p._id === initialPackageId)
        if (pkg) setSelectedPkg(pkg)
      }
    }
    // One-time restore of scalar fields (slot is restored once the society is set, below)
    if (restored && !restoreAppliedRef.current) {
      restoreAppliedRef.current = true
      if (restored.selectedTrialDate) setSelectedTrialDate(restored.selectedTrialDate)
      if (restored.specialInstructions) setSpecialInstructions(restored.specialInstructions)
      if (restored.couponCode) setCouponInput(restored.couponCode)
    }
  }, [dataLoading, societies, packages, vehicles, initialPackageId, initialVehicleId])

  // Restore the selected slot from the snapshot once the society (with its slots) is loaded
  useEffect(() => {
    if (!restored?.slotId || selectedSlot || !selectedSociety) return
    const sl = selectedSociety.slots?.find(s => s.slotId === restored.slotId)
    if (sl) setSelectedSlot(sl)
  }, [selectedSociety, selectedSlot])

  // Persist the wizard so a page refresh stays on the same step (Slot/Pay) with selections intact
  useEffect(() => {
    if ((step === 1 || step === 2) && selectedVehicle && selectedSociety) {
      try {
        sessionStorage.setItem(WIZARD_KEY, JSON.stringify({
          step,
          vehicleId: selectedVehicle?._id || null,
          packageId: selectedPkg?.isTrial ? null : (selectedPkg?._id || null),
          isTrial: !!selectedPkg?.isTrial,
          societyId: selectedSociety?._id || null,
          slotId: selectedSlot?.slotId || null,
          selectedTrialDate,
          specialInstructions,
          couponCode: appliedCoupon?.code || null,
        }))
      } catch {}
    } else if (step === 0 || step >= 3) {
      // Plan step / success / failure — clear so a later refresh doesn't resurrect a stale step
      try { sessionStorage.removeItem(WIZARD_KEY) } catch {}
    }
  }, [step, selectedVehicle, selectedPkg, selectedSociety, selectedSlot, selectedTrialDate, specialInstructions, appliedCoupon])

  // Load Razorpay script
  useEffect(() => {
    if (window.Razorpay) { setRazorpayReady(true); return }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
    if (existing) { setRazorpayReady(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => setRazorpayReady(true)
    script.onerror = () => setPaymentError('Failed to load payment gateway. Please refresh.')
    document.body.appendChild(script)
  }, [])

  // ── Pricing ────────────────────────────────────────────────────────────────
  const trialPrice = getDynamicTrialPrice()
  const prioritySlotFee = settings.prioritySlotFee || 99
  const listPrice = selectedPkg ? (selectedPkg.isTrial ? trialPrice : selectedPkg.price) : 0

  // Package discount (individual override or global) — never applies to trials
  const pkgPricing = (selectedPkg && !selectedPkg.isTrial)
    ? getPackagePricing(selectedPkg, selectedVehicle, discounts)
    : null
  const packageDiscount = pkgPricing?.hasDiscount ? (pkgPricing.originalPrice - pkgPricing.effectivePrice) : 0
  const basePrice = pkgPricing?.hasDiscount ? pkgPricing.effectivePrice : listPrice

  const isSelectedSlotUnavailable = selectedSlot
    ? (selectedSlot.status === 'Closed' || selectedSlot.status === 'Blocked' || selectedSlot.currentCount >= selectedSlot.maxVehicles)
    : false
  const activeOverride  = isPremiumOverride || isSelectedSlotUnavailable
  const priorityFee     = (activeOverride && !selectedPkg?.isTrial) ? prioritySlotFee : 0
  const subtotal        = basePrice + priorityFee
  const hasReferralDiscount = user?.referralDiscount?.isActive && !selectedPkg?.isTrial
  const discountAmount  = hasReferralDiscount ? Math.round(subtotal * (user.referralDiscount.percentage / 100)) : 0
  const amountBeforeCoupon = subtotal - discountAmount
  const couponDiscount  = appliedCoupon ? Math.min(appliedCoupon.discountAmount, amountBeforeCoupon) : 0
  const finalAmount     = amountBeforeCoupon - couponDiscount

  // Clear any applied coupon when the chosen plan/vehicle changes (it may no longer be valid)
  useEffect(() => {
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponError('')
  }, [selectedPkg?._id, selectedVehicle?._id])

  const applyCoupon = async () => {
    if (!couponInput.trim() || !selectedPkg || selectedPkg.isTrial) return
    setCouponLoading(true)
    setCouponError('')
    try {
      const res = await apiClient.post('/customer/coupons/validate', {
        code: couponInput.trim(),
        type: 'first_purchase', // server reclassifies first_purchase vs renewal
        packageId: selectedPkg._id,
        vehicleId: selectedVehicle?._id,
        societyId: selectedSociety?._id,
        baseAmount: amountBeforeCoupon,
      })
      setAppliedCoupon({ code: res.code, discountAmount: res.discountAmount })
    } catch (err) {
      setAppliedCoupon(null)
      setCouponError(err?.message || 'Invalid coupon code')
    } finally {
      setCouponLoading(false)
    }
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponError('')
  }

  // ── Payment handler ────────────────────────────────────────────────────────
  const handlePayment = async () => {
    if (!selectedPkg || !selectedVehicle || !selectedSociety || !selectedSlot) return
    setProcessing(true)
    setPaymentError('')

    // Activate the subscription once a paymentId exists (Razorpay-verified or
    // a Pay-to-Cleaner record). Shared by both checkout paths.
    const activateBooking = async (paymentId) => {
      try {
        await apiClient.post('/customer/subscriptions', {
          vehicleId: selectedVehicle._id,
          packageId: selectedPkg._id || null,
          isTrial: selectedPkg.isTrial || false,
          societyId: selectedSociety._id,
          slotId: selectedSlot.slotId,
          specialInstructions,
          paymentId,
          startDate: selectedPkg.isTrial ? selectedTrialDate : undefined,
          isPremiumOverride: activeOverride,
          overrideReason: activeOverride ? overrideReason : undefined,
          couponCode: appliedCoupon?.code || undefined,
        })
        localStorage.removeItem('cleanzo_pending_booking')
        setProcessing(false)
        refreshAll()
        setStep(3)
      } catch (e) {
        localStorage.removeItem('cleanzo_pending_booking')
        setProcessing(false)
        setPaymentError(e.message || 'Could not activate your subscription.')
        setStep(4)
      }
    }

    const failBooking = (msg) => {
      localStorage.removeItem('cleanzo_pending_booking')
      setProcessing(false)
      setPaymentError(msg)
      setStep(4)
    }

    // ─── RAZORPAY FLOW (verify, then activate) ──────────────────────────────
    const completeBooking = async (response) => {
      try {
        await apiClient.post('/payment/verify', {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        })
        await activateBooking(response.razorpay_payment_id)
      } catch (e) {
        localStorage.removeItem('cleanzo_pending_booking')
        setProcessing(false)
        setPaymentError(e.message || 'Payment verification failed.')
        setStep(4)
      }
    }

    // Save booking context so the Razorpay redirect-back (Vercel function) can complete it
    localStorage.setItem('cleanzo_pending_booking', JSON.stringify({
      vehicleId: selectedVehicle._id,
      packageId: selectedPkg._id || null,
      isTrial: selectedPkg.isTrial || false,
      societyId: selectedSociety._id,
      slotId: selectedSlot.slotId,
      specialInstructions,
      isPremiumOverride: activeOverride,
      overrideReason: activeOverride ? overrideReason : undefined,
      startDate: selectedPkg.isTrial ? selectedTrialDate : undefined,
      couponCode: appliedCoupon?.code || undefined,
    }))

    try {
      const keyRes = await apiClient.get('/payment/key')

      const orderRes = await apiClient.post('/payment/create-order', {
        amount: finalAmount,
        currency: 'INR',
        packageId: selectedPkg._id || 'trial',
        vehicleId: selectedVehicle._id,
        societyId: selectedSociety._id,
        slotId: selectedSlot.slotId,
        specialInstructions: specialInstructions || '',
        isTrial: selectedPkg.isTrial || false,
        startDate: selectedPkg.isTrial ? selectedTrialDate : undefined,
        isPremiumOverride: activeOverride,
        overrideReason: activeOverride ? overrideReason : undefined,
        couponCode: appliedCoupon?.code || undefined,
        frontendOrigin: window.location.origin,
      })

      const order   = orderRes.order
      const apiBase = import.meta.env.VITE_API_URL || ''

      const options = {
        key: keyRes.key,
        amount: order.amount,
        currency: order.currency,
        name: 'Cleanzo',
        description: `${selectedPkg.name} for ${selectedVehicle.model}`,
        order_id: order.id,
        // Use redirect mode ONLY when the backend is publicly reachable (HTTPS / production).
        // In development (HTTP / localhost), Razorpay's servers can't reach the callback URL,
        // so we always use the inline modal handler which works on both desktop and mobile.
        ...(apiBase.startsWith('https://') ? {
          redirect: true,
          callback_url: `${apiBase}/payment/callback?frontendOrigin=${encodeURIComponent(window.location.origin)}`,
        } : {}),
        handler: completeBooking,
        prefill: {
          name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
          contact: (() => {
            if (!user?.phone) return ''
            const d = user.phone.replace(/\D/g, '')
            return d.length === 10 ? `+91${d}` : user.phone.startsWith('+') ? user.phone : `+91${user.phone}`
          })(),
          email: user?.email || '',
        },
        theme: { color: theme === 'light' ? '#0056B3' : '#DFFF00' },
        modal: { ondismiss: () => setProcessing(false) },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (r) => failBooking(`Payment failed: ${r.error.description}`))
      rzp.open()
    } catch (err) {
      failBooking(err.message || 'Failed to initiate payment. Please try again.')
    }
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  const isLoading = dataLoading.vehicles || dataLoading.packages || dataLoading.societies || dataLoading.subscriptions || dataLoading.settings
  if (isLoading && step < 3) return (
    <div className="app-shell">
      <div className="app-header" style={{ padding: '16px var(--margin-side)', background: 'transparent' }}>
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 14 }} />
        <div className="skeleton" style={{ width: 140, height: 24, borderRadius: 8 }} />
        <div style={{ width: 40 }} />
      </div>
      <div className="container" style={{ padding: '0 20px' }}>
        <div className="flex items-center gap-12" style={{ margin: '12px 0 32px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-12" style={{ flex: i < 3 ? 1 : 'none' }}>
              <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 12 }} />
              {i < 3 && <div className="skeleton" style={{ flex: 1, height: 3, borderRadius: 4 }} />}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-16">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass" style={{ padding: '20px 24px', borderRadius: 24 }}>
              <div className="skeleton" style={{ width: '60%', height: 20, borderRadius: 6, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: '40%', height: 14, borderRadius: 6 }} />
            </div>
          ))}
          <div className="skeleton" style={{ height: 56, borderRadius: 18, marginTop: 12 }} />
        </div>
      </div>
    </div>
  )

  // ── Eligible vehicles/packages for current selection ───────────────────────
  const eligibleVehicles = selectedPkg
    ? vehicles.filter(v => isVehicleEligibleForPackage(v, selectedPkg))
    : vehicles
  const eligiblePackages = sortPackagesByTier(
    vehicles.length > 0 && selectedVehicle
      ? packages.filter(p => isVehicleEligibleForPackage(selectedVehicle, p))
      : packages
  )

  return (
    <div className="app-shell animate-fade-in" style={{ paddingBottom: 120 }}>

      {/* ── Processing overlay ────────────────────────────────────────────── */}
      {processing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.85)',
          backdropFilter: 'blur(20px)', zIndex: 9999,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 24, padding: 24, textAlign: 'center',
        }} className="animate-fade-in">
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            border: '4px solid rgba(var(--bg-accent-rgb),0.1)',
            borderTop: '4px solid var(--bg-accent)',
            animation: 'spin 1s linear infinite',
          }} />
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
              Securing Connection…
            </h3>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', maxWidth: 280, margin: '0 auto', lineHeight: 1.5 }}>
              Connecting to the secure payment gateway. Please do not close this page.
            </p>
          </div>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      {step < 3 && (
        <div className="app-header" style={{ background: 'transparent', border: 'none' }}>
          <button
            onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)}
            className="btn-icon glass" style={{ borderRadius: 14 }}
          >
            <ArrowLeft size={20} />
          </button>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>
            Book a Service
          </span>
          <div style={{ width: 40 }} />
        </div>
      )}

      <div className="container">
        {/* ── Step indicator (3 steps) ──────────────────────────────────── */}
        {step < 3 && (
          <div className="flex items-center gap-12" style={{ margin: '12px 0 28px' }}>
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-12" style={{ flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 12, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 12, fontWeight: 800, fontFamily: 'var(--font-display)',
                    background: i <= step ? 'var(--bg-accent)' : 'var(--bg-glass)',
                    color: i <= step ? 'var(--text-on-accent)' : 'var(--text-tertiary)',
                    border: `1px solid ${i <= step ? 'transparent' : 'var(--border-glass)'}`,
                    boxShadow: i === step ? '0 0 20px rgba(var(--bg-accent-rgb),0.3)' : 'none',
                    transition: 'all 0.3s var(--ease-out)',
                  }}>
                    {i < step ? <Check size={15} strokeWidth={3} /> : i + 1}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: i === step ? 'var(--text-accent)' : 'var(--text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 3, background: i < step ? 'var(--bg-accent)' : 'var(--divider)', borderRadius: 4, marginBottom: 16, transition: 'background 0.4s' }} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 0 — Choose Plan + Vehicle
        ══════════════════════════════════════════════════════════════════ */}
        {step === 0 && (
          <div className="flex flex-col gap-24 animate-fade-in-up">

            {/* Vehicle selector — compact chips */}
            {vehicles.length > 0 && (
              <div>
                <p className="text-label" style={{ color: 'var(--text-tertiary)', marginBottom: 10, paddingLeft: 4, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>
                  SELECT VEHICLE
                </p>
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                  {vehicles.map(v => {
                    const hasSub   = activeSubscriptions.some(s => s.vehicle?._id === v._id && s.status === 'Active')
                    const isChosen = selectedVehicle?._id === v._id
                    return (
                      <button
                        key={v._id}
                        disabled={hasSub}
                        onClick={() => {
                          setSelectedVehicle(v)
                          // Clear plan if it's no longer eligible for the new vehicle
                          if (selectedPkg && !selectedPkg.isTrial && !isVehicleEligibleForPackage(v, selectedPkg)) {
                            setSelectedPkg(null)
                          }
                        }}
                        style={{
                          flexShrink: 0, padding: '10px 16px', borderRadius: 14, cursor: hasSub ? 'default' : 'pointer',
                          border: `1.5px solid ${isChosen ? 'var(--text-accent)' : 'var(--border-glass)'}`,
                          background: isChosen ? 'rgba(var(--bg-accent-rgb),0.08)' : 'var(--bg-glass)',
                          opacity: hasSub ? 0.45 : 1,
                          display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
                        }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                          background: isChosen ? 'var(--bg-accent)' : 'rgba(255,255,255,0.06)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Car size={16} color={isChosen ? 'var(--text-on-accent)' : 'var(--text-secondary)'} />
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{v.brand} {v.model}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                            {hasSub ? 'Subscribed' : v.number}
                          </div>
                        </div>
                        {isChosen && <Check size={14} color="var(--text-accent)" strokeWidth={3} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Society Selector */}
            {vehicles.length > 0 && societies.length > 0 && (
              <div>
                <p className="text-label" style={{ color: 'var(--text-tertiary)', marginBottom: 10, paddingLeft: 4, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>
                  SELECT SOCIETY
                </p>
                <div style={{ position: 'relative' }}>
                  <select 
                    className="input-field" 
                    style={{ width: '100%', boxSizing: 'border-box', appearance: 'none', cursor: 'pointer', paddingRight: 36, fontWeight: 700 }} 
                    value={selectedSociety?._id || ''} 
                    onChange={e => {
                      const soc = societies.find(s => s._id === e.target.value)
                      if (soc) {
                        setSelectedSociety(soc)
                        setSelectedSlot(null) // clear selected slot since slots belong to society
                      }
                    }}
                  >
                    {societies.map(s => (
                      <option key={s._id} value={s._id}>{s.name} ({s.city})</option>
                    ))}
                  </select>
                  <ChevronDown size={16} style={{ position: 'absolute', right: 14, bottom: 14, opacity: 0.4, pointerEvents: 'none' }} />
                </div>
              </div>
            )}

            {vehicles.length === 0 && (
              <div className="glass" style={{ padding: 40, textAlign: 'center', borderRadius: 28 }}>
                <Car size={36} className="text-tertiary" style={{ margin: '0 auto 12px' }} />
                <p className="text-secondary" style={{ marginBottom: 20 }}>No vehicles in your profile.</p>
                <button className="btn btn-primary w-full" style={{ borderRadius: 16 }} onClick={() => navigate('/customer/profile')}>
                  Add Your First Vehicle
                </button>
              </div>
            )}

            {/* Plans section */}
            {vehicles.length > 0 && (
              <>
                <div>
                  <h3 className="text-headline-sm" style={{ marginBottom: 4 }}>Choose Plan</h3>
                  <p className="text-secondary text-body-sm">
                    {selectedVehicle
                      ? `Best for your ${selectedVehicle.brand} ${selectedVehicle.model}`
                      : 'Select a plan to get started'}
                  </p>
                </div>

                <div className="flex flex-col gap-14">
                  {eligiblePackages.length === 0 && !hasUsedTrial && (
                    <div className="glass" style={{ padding: 28, textAlign: 'center', borderRadius: 24 }}>
                      <p className="text-secondary text-body-sm">No monthly plans available for this vehicle yet.</p>
                    </div>
                  )}

                  {eligiblePackages.map((p, i) => {
                    const isChosen = selectedPkg?._id === p._id
                    const pPricing = getPackagePricing(p, selectedVehicle, discounts)
                    return (
                      <button
                        key={p._id}
                        className="glass"
                        onClick={() => setSelectedPkg(p)}
                        style={{
                          padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          textAlign: 'left', borderRadius: 24,
                          borderColor: isChosen ? 'var(--text-accent)' : 'var(--border-glass)',
                          background: isChosen ? 'rgba(var(--bg-accent-rgb),0.06)' : 'var(--bg-glass)',
                          boxShadow: isChosen ? '0 0 24px rgba(var(--bg-accent-rgb),0.2)' : 'none',
                          animationDelay: `${i * 80}ms`,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontWeight: 800, fontSize: 17 }}>{p.name}</span>
                            {p.popular && <span className="chip chip-lime" style={{ fontSize: 9 }}>BEST VALUE</span>}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {p.features?.slice(0, 3).map((f, idx) => (
                              <span key={idx} style={{ fontSize: 10, color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 6 }}>{f}</span>
                            ))}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                          {pPricing.hasDiscount && (
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>₹{pPricing.originalPrice}</div>
                          )}
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>₹{pPricing.effectivePrice}</div>
                          <div style={{ fontSize: 9, color: pPricing.hasDiscount ? 'var(--success)' : 'var(--text-tertiary)', fontWeight: 700 }}>
                            {pPricing.hasDiscount ? `${pPricing.percent}% OFF` : 'PER MONTH'}
                          </div>
                          {isChosen && <Check size={16} color="var(--text-accent)" strokeWidth={3} style={{ marginTop: 6 }} />}
                        </div>
                      </button>
                    )
                  })}

                  {/* Trial option */}
                  {!hasUsedTrial && (
                    <>
                      {eligiblePackages.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
                          <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
                          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 700, whiteSpace: 'nowrap' }}>OR TRY FIRST</span>
                          <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
                        </div>
                      )}
                      <button
                        className="glass"
                        onClick={() => {
                          setSelectedPkg({ isTrial: true, name: '1-Day Trial', price: trialPrice, _id: null })
                          const tm = new Date(); tm.setDate(tm.getDate() + 1)
                          setSelectedTrialDate(getLocalDateString(tm))
                        }}
                        style={{
                          padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          borderRadius: 20,
                          borderColor: selectedPkg?.isTrial ? 'var(--text-accent)' : 'var(--border-glass)',
                          background: selectedPkg?.isTrial ? 'rgba(var(--bg-accent-rgb),0.06)' : 'transparent',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 38, height: 38, background: 'rgba(var(--bg-accent-rgb),0.1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Clock size={18} color="var(--text-accent)" />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 15 }}>1-Day Trial</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Try Cleanzo, no commitment</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>₹{trialPrice}</span>
                          {selectedPkg?.isTrial && <Check size={16} color="var(--text-accent)" strokeWidth={3} />}
                        </div>
                      </button>

                      {/* Trial date picker inline */}
                      {selectedPkg?.isTrial && (
                        <div className="animate-slide-up flex flex-col gap-10" style={{ marginTop: 20 }}>
                          <p className="text-label" style={{ color: 'var(--text-tertiary)', fontSize: 10, paddingLeft: 4, fontWeight: 700, letterSpacing: '0.06em' }}>
                            CHOOSE TRIAL DATE
                          </p>
                          <div style={{ display: 'flex', gap: 12 }}>
                            {(() => {
                              const today = new Date()
                              return [1, 2].map(daysAhead => {
                                const d = new Date(); d.setDate(today.getDate() + daysAhead)
                                const val = getLocalDateString(d)
                                const label = daysAhead === 1 ? 'Tomorrow' : 'Day After'
                                const dateStr = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
                                const isSel = selectedTrialDate === val
                                return (
                                  <button
                                    key={val}
                                    onClick={() => setSelectedTrialDate(val)}
                                    className="glass"
                                    style={{
                                      flex: 1, padding: '14px', borderRadius: 16, textAlign: 'center',
                                      borderColor: isSel ? 'var(--text-accent)' : 'var(--border-glass)',
                                      background: isSel ? 'rgba(var(--bg-accent-rgb),0.08)' : 'var(--bg-glass)',
                                      boxShadow: isSel ? '0 0 20px rgba(var(--bg-accent-rgb),0.2)' : 'none',
                                      transition: 'all 0.25s',
                                    }}
                                  >
                                    <div style={{ fontWeight: 800, fontSize: 14, color: isSel ? 'var(--text-accent)' : 'var(--text-primary)' }}>{label}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{dateStr}</div>
                                  </button>
                                )
                              })
                            })()}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <button
                  disabled={!selectedPkg || !selectedVehicle || (selectedPkg?.isTrial && !selectedTrialDate)}
                  className="btn btn-primary w-full"
                  style={{ marginTop: 8, padding: 18, borderRadius: 18, fontWeight: 800, fontSize: 16 }}
                  onClick={() => setStep(1)}
                >
                  Choose Time Slot <ChevronRight size={18} style={{ marginLeft: 4 }} />
                </button>
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 1 — Time Slot
        ══════════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="flex flex-col gap-24 animate-fade-in-up">
            <div>
              <h3 className="text-headline-sm" style={{ marginBottom: 4 }}>Select Time Slot</h3>
              <p className="text-secondary text-body-sm">
                When should we arrive at{' '}
                <span style={{ fontWeight: 700, color: 'var(--text-accent)' }}>{selectedSociety?.name}</span>?
              </p>
            </div>

            {selectedSociety && (
              <>
                {/* All slots unavailable notice */}
                {selectedSociety.slots?.every(s => s.status === 'Closed' || s.status === 'Blocked' || s.currentCount >= s.maxVehicles) && (
                  <div className="glass animate-slide-up" style={{
                    padding: '14px 18px', borderRadius: 16,
                    border: '1.5px solid rgba(255,149,0,0.3)', background: 'rgba(255,149,0,0.04)', color: '#FF9500',
                  }}>
                    <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>✨ Premium Priority Booking Available</div>
                    <p style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.4 }}>
                      Standard slots are full. You can still book via Priority Override — a surcharge of <b>₹{prioritySlotFee}</b> applies.
                    </p>
                  </div>
                )}

                {/* Slot list */}
                <div className="flex flex-col gap-10">
                  {selectedSociety.slots.map(s => (
                    <SlotCard
                      key={s.slotId}
                      slot={s}
                      selected={selectedSlot?.slotId === s.slotId}
                      prioritySlotFee={prioritySlotFee}
                      onSelect={(sl) => {
                        setSelectedSlot(sl)
                        const unavail = sl.status === 'Closed' || sl.status === 'Blocked' || sl.currentCount >= sl.maxVehicles
                        setIsPremiumOverride(unavail)
                        if (!unavail) setOverrideReason('')
                      }}
                    />
                  ))}
                </div>

                {/* Priority reason */}
                {activeOverride && (
                  <div className="glass animate-slide-up flex flex-col gap-8" style={{
                    padding: '16px 20px', borderRadius: 16,
                    border: '1.5px solid rgba(255,149,0,0.3)', background: 'rgba(255,149,0,0.01)',
                  }}>
                    <label style={{ color: '#FF9500', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      ✨ PRIORITY BOOKING REASON *
                    </label>
                    <textarea
                      className="input-field"
                      style={{ minHeight: 72, padding: 12, borderColor: overrideReason.trim() ? 'var(--border-glass)' : 'rgba(255,149,0,0.3)' }}
                      value={overrideReason}
                      onChange={e => setOverrideReason(e.target.value)}
                      placeholder="e.g. Morning office rush, urgent cleaning…"
                    />
                  </div>
                )}
              </>
            )}

            <div className="flex gap-12 mt-24">
              <button className="btn btn-ghost" style={{ flex: 1, borderRadius: 16 }} onClick={() => setStep(0)}>Back</button>
              <button
                disabled={!selectedSlot || (activeOverride && !overrideReason.trim())}
                className="btn btn-primary"
                style={{ flex: 2, borderRadius: 18, fontWeight: 800 }}
                onClick={() => setStep(2)}
              >
                Review & Pay <ChevronRight size={16} style={{ marginLeft: 4 }} />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 2 — Purchase Overview
        ══════════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="flex flex-col gap-32 animate-fade-in-up">
            <div>
              <h3 className="text-headline-sm" style={{ marginBottom: 4 }}>Booking Summary</h3>
              <p className="text-secondary text-body-sm">Review before payment</p>
            </div>

            {/* Summary card */}
            <div className="glass" style={{ padding: 24, borderRadius: 28, border: '1px solid var(--border-glass)' }}>
              <div className="flex flex-col gap-16">

                {/* Vehicle + Plan row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 4, letterSpacing: '0.06em' }}>VEHICLE</div>
                    <div style={{ fontWeight: 800, fontSize: 17 }}>{selectedVehicle?.brand} {selectedVehicle?.model}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{selectedVehicle?.number}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 4, letterSpacing: '0.06em' }}>PLAN</div>
                    <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-accent)' }}>{selectedPkg?.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{selectedPkg?.isTrial ? 'Trial' : 'Monthly'}</div>
                  </div>
                </div>

                <div className="divider" style={{ opacity: 0.3 }} />

                {/* Slot row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 4, letterSpacing: '0.06em' }}>LOCATION</div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedSociety?.name}</div>
                    {(selectedVehicle?.flatNumber || selectedVehicle?.blockTower) && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
                        {[
                          selectedVehicle?.flatNumber ? `Flat ${selectedVehicle.flatNumber}` : null,
                          selectedVehicle?.blockTower || null,
                        ].filter(Boolean).join(', ')}
                      </div>
                    )}
                    {selectedSociety?.address && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
                        {selectedSociety.address}{selectedSociety.city ? `, ${selectedSociety.city}` : ''}
                      </div>
                    )}
                    {(selectedVehicle?.slotPillar || selectedVehicle?.parking) && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, lineHeight: 1.4 }}>
                        <MapPin size={12} /> Parking: {selectedVehicle?.slotPillar || selectedVehicle?.parking}
                      </div>
                    )}
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <Clock size={12} style={{ flexShrink: 0 }} /> {selectedSlot?.timeWindow}
                    </div>
                  </div>
                  {selectedPkg?.isTrial && selectedTrialDate && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 4, letterSpacing: '0.06em' }}>TRIAL DATE</div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-accent)' }}>
                        {(() => {
                          const [y, m, d] = selectedTrialDate.split('-')
                          return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                <div className="divider" style={{ opacity: 0.3 }} />

                {/* Price breakdown */}
                <div className="flex flex-col gap-8">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Base Price</span>
                    <span style={{ fontWeight: 700 }}>₹{listPrice}</span>
                  </div>
                  {packageDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--success)' }}>
                      <span>Discount{pkgPricing?.percent ? ` (${pkgPricing.percent}%)` : ''}</span>
                      <span style={{ fontWeight: 700 }}>−₹{packageDiscount}</span>
                    </div>
                  )}
                  {priorityFee > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#FF9500' }}>
                      <span>Priority Override Fee</span>
                      <span style={{ fontWeight: 700 }}>+₹{priorityFee}</span>
                    </div>
                  )}
                  {hasReferralDiscount && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--success)' }}>
                      <span>Referral Discount</span>
                      <span style={{ fontWeight: 700 }}>−₹{discountAmount}</span>
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--success)' }}>
                      <span>Coupon ({appliedCoupon.code})</span>
                      <span style={{ fontWeight: 700 }}>−₹{couponDiscount}</span>
                    </div>
                  )}
                </div>

                <div className="divider" />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: 18 }}>Total</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 30, color: 'var(--text-accent)' }}>₹{finalAmount}</span>
                </div>
              </div>
            </div>

            {/* Coupon */}
            {!selectedPkg?.isTrial && (
              <div className="flex flex-col gap-10">
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', paddingLeft: 4, letterSpacing: '0.06em' }}>
                  HAVE A COUPON?
                </label>
                {appliedCoupon ? (
                  <div className="glass" style={{ padding: '14px 18px', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(50,215,75,0.3)', background: 'rgba(50,215,75,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Check size={16} color="var(--success)" strokeWidth={3} />
                      <span style={{ fontWeight: 800, letterSpacing: '0.05em' }}>{appliedCoupon.code}</span>
                      <span className="text-success text-body-sm" style={{ color: 'var(--success)' }}>−₹{couponDiscount} applied</span>
                    </div>
                    <button onClick={removeCoupon} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Remove</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      value={couponInput}
                      onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError('') }}
                      placeholder="Enter coupon code"
                      className="glass"
                      style={{ flex: 1, padding: '14px 18px', borderRadius: 16, fontSize: 15, border: '1px solid var(--divider)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}
                    />
                    <button
                      disabled={!couponInput.trim() || couponLoading}
                      onClick={applyCoupon}
                      className="btn btn-primary"
                      style={{ borderRadius: 16, padding: '0 24px', fontWeight: 800 }}
                    >
                      {couponLoading ? '…' : 'Apply'}
                    </button>
                  </div>
                )}
                {couponError && (
                  <span style={{ fontSize: 12, color: 'var(--error)', paddingLeft: 4 }}>{couponError}</span>
                )}
              </div>
            )}

            {/* Special instructions */}
            <div className="flex flex-col gap-10">
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', paddingLeft: 4, letterSpacing: '0.06em' }}>
                SPECIAL INSTRUCTIONS (OPTIONAL)
              </label>
              <textarea
                value={specialInstructions}
                onChange={e => setSpecialInstructions(e.target.value)}
                placeholder="e.g. Key with security, parked at B-12…"
                className="glass"
                style={{ padding: '16px 20px', borderRadius: 20, minHeight: 90, fontSize: 15, border: '1px solid var(--divider)', resize: 'none' }}
              />
            </div>

            {/* Security badge */}
            <div className="glass" style={{ padding: '16px 20px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 14, border: '1px solid rgba(50,215,75,0.2)' }}>
              <div style={{ width: 40, height: 40, background: 'rgba(50,215,75,0.1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShieldCheck size={22} color="var(--success)" />
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Secured by Razorpay. Your payment is encrypted and 100% safe.
              </span>
            </div>

            {paymentError && (
              <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', fontSize: 14 }}>
                {paymentError}
              </div>
            )}

            <div className="flex gap-14">
              <button className="btn btn-ghost" style={{ flex: 1, borderRadius: 18, padding: 18 }} onClick={() => setStep(1)}>Back</button>
              <button
                disabled={processing || !razorpayReady}
                className="btn btn-primary"
                style={{ flex: 2, borderRadius: 22, fontWeight: 800, fontSize: 18, padding: 20, boxShadow: '0 0 24px rgba(var(--bg-accent-rgb),0.25)' }}
                onClick={handlePayment}
              >
                {processing ? 'Processing…' : !razorpayReady ? 'Loading…' : `Pay ₹${finalAmount}`}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 3 — Payment Success
        ══════════════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="flex flex-col items-center justify-center text-center gap-24 py-40 animate-fade-in">
            <div style={{
              width: 80, height: 80, borderRadius: '50%', background: 'rgba(50,215,75,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--success)', boxShadow: '0 0 30px rgba(50,215,75,0.25)', margin: '0 auto',
            }}>
              <Check size={40} color="var(--success)" strokeWidth={3} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: 'var(--success)', marginBottom: 8 }}>
                Booking Confirmed!
              </h2>
              <p className="text-secondary text-body-md" style={{ maxWidth: 320, margin: '0 auto' }}>
                Your subscription is now active. Your cleaner will arrive at the selected time.
              </p>
            </div>
            <div className="glass" style={{ padding: '14px 24px', borderRadius: 16, border: '1px solid var(--border-glass)', width: '100%' }}>
              <p className="text-secondary text-body-sm">
                Going to dashboard in <span style={{ color: 'var(--text-accent)', fontWeight: 800 }}>{countdown}s</span>…
              </p>
            </div>
            <button className="btn btn-primary w-full" style={{ borderRadius: 18, padding: 18, fontWeight: 800 }} onClick={() => navigate('/customer')}>
              Go to Dashboard
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 4 — Payment Failed
        ══════════════════════════════════════════════════════════════════ */}
        {step === 4 && (
          <div className="flex flex-col items-center justify-center text-center gap-24 py-40 animate-fade-in">
            <div style={{
              width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,69,58,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--error)', boxShadow: '0 0 30px rgba(255,69,58,0.25)', margin: '0 auto',
            }}>
              <X size={40} color="var(--error)" strokeWidth={3} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: 'var(--error)', marginBottom: 8 }}>
                Payment Failed
              </h2>
              <p className="text-secondary text-body-md" style={{ maxWidth: 320, margin: '0 auto', wordBreak: 'break-word' }}>
                {paymentError || 'Something went wrong. Please try again.'}
              </p>
            </div>
            <div className="glass" style={{ padding: '14px 24px', borderRadius: 16, border: '1px solid var(--border-glass)', width: '100%' }}>
              <p className="text-secondary text-body-sm">
                Going to dashboard in <span style={{ color: 'var(--text-accent)', fontWeight: 800 }}>{countdown}s</span>…
              </p>
            </div>
            <div className="flex gap-12 w-full">
              <button className="btn btn-ghost w-full" style={{ borderRadius: 18, padding: 16 }} onClick={() => navigate('/customer')}>
                Dashboard
              </button>
              <button className="btn btn-primary w-full" style={{ borderRadius: 18, padding: 16, fontWeight: 800 }} onClick={() => { setStep(0); setPaymentError('') }}>
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
