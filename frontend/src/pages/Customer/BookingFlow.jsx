import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Check, ShieldCheck, Clock, X, ChevronRight, MapPin, ChevronDown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import apiClient from '../../services/apiClient'
import { useCustomerData } from '../../context/CustomerDataContext'
import { useTheme } from '../../context/ThemeContext'
import { getPackagePricing } from '../../utils/pricing'
import { FEATURES } from '../../config/features'
import { isIOSStandalone, openCheckoutInSafari } from '../../utils/iosPwaPayment'
import ExternalPaymentWaiting from '../../components/ExternalPaymentWaiting'

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
  const initialTrial     = queryParams.get('trial') === 'true'
  const initialStatus    = queryParams.get('status')
  const initialError     = queryParams.get('error')

  const {
    vehicles, packages, societies, subscriptions: activeSubscriptions, settings, discounts,
    loading: dataLoading, refreshAll,
  } = useCustomerData()

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
    // A fresh "Subscribe" link carries its own packageId — that's a deliberate new
    // choice and should win over a stale snapshot left behind by an earlier, abandoned
    // booking attempt (otherwise the old society/vehicle/step silently resurrects).
    restoredRef.current = (initialStatus || initialPackageId || initialTrial)
      ? null
      : (() => { try { return JSON.parse(sessionStorage.getItem(WIZARD_KEY) || 'null') } catch { return null } })()
  }
  const restored = restoredRef.current

  // Step index: 0=Plan, 1=Slot, 2=Pay, 3=Success, 4=Failed
  const [step, setStep] = useState(() => {
    if (initialStatus === 'success' || initialStatus === 'payment_return') return 3
    if (initialStatus === 'failed') return 4
    if (restored && (restored.step === 1 || restored.step === 2)) return restored.step
    // Plan + vehicle are chosen on the previous screen. A trial still needs a
    // lightweight first step to pick its date (Step 0); a paid plan has nothing
    // left to configure, so it goes straight to slot selection (now Step 1).
    if (initialTrial) return 0
    return 1
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

  // Trial is offered once per vehicle — a customer with several vehicles can trial
  // each one independently, but not retake it for a vehicle that's already used it.
  const hasUsedTrial = activeSubscriptions?.some(s => s.isTrial && (s.vehicle?._id || s.vehicle) === selectedVehicle?._id)

  const [razorpayReady, setRazorpayReady] = useState(false)
  const [processing, setProcessing]       = useState(false)
  const [paymentError, setPaymentError]   = useState('')

  // iOS standalone PWA: checkout runs in a Safari tab (UPI handoff is blocked in
  // the installed-app WebView). While that happens we show a waiting overlay and
  // finalize the UI once the new subscription shows up on return. The baseline
  // ref captures the active-subscription count at hand-off so we can detect it.
  const [awaitingExternalPayment, setAwaitingExternalPayment] = useState(false)
  const externalPayBaselineRef = useRef(null)

  // Order is pre-created while the user is still reviewing the summary so that
  // tapping "Pay" can call rzp.open() synchronously with zero network calls in
  // between — any await before opening checkout risks losing the click's "user
  // gesture" status on mobile, which is what blocks UPI apps (PayTM, GPay, etc.)
  // from being launched via intent on the first tap.
  const [preparedOrder, setPreparedOrder] = useState(null) // { key, order, amount }
  const [preparingOrder, setPreparingOrder] = useState(false)
  const preparingOrderRef = useRef(false)

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

  // No booking context at all (e.g. a stale/bookmarked /customer/booking link):
  // there's no plan or trial to configure, so send the user to plan selection.
  useEffect(() => {
    if (!initialStatus && !initialTrial && !initialPackageId &&
        !restored?.packageId && !restored?.isTrial && !restored?.step) {
      navigate('/customer/packages', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Constrain society choices to the customer's own city so a Noida customer can't
  // accidentally book a society in another city (the society's city drives the admin
  // city filter and the cleaner pool — a cross-city society leaves them unserviceable).
  const bookingCity = (
    (user?.addresses?.find(a => a.isDefault) || user?.addresses?.[0])?.city || user?.city || ''
  ).trim().toLowerCase()
  const citySocieties = bookingCity
    ? societies.filter(s => (s.city || '').trim().toLowerCase() === bookingCity)
    : societies
  // Fall back to the full list only if the customer's city has no societies yet,
  // so they're never hard-blocked from booking.
  const societyOptions = citySocieties.length > 0 ? citySocieties : societies

  // Distinct societies drawn from the customer's own saved addresses. The society
  // normally comes implicitly from the address, so we only surface a picker when the
  // customer actually has addresses across more than one society.
  const addressSocieties = (user?.addresses || [])
    .map(a => {
      const id = (a.society?._id || a.society)?.toString()
      let soc = id ? societies.find(s => s._id === id) : null
      if (!soc && a.societyName) {
        const wanted = a.societyName.trim().toLowerCase()
        soc = societies.find(s => s.name?.trim().toLowerCase() === wanted)
      }
      return soc
    })
    .filter(Boolean)
  const societyChoices = [...new Map(addressSocieties.map(s => [s._id, s])).values()]
  const hasMultipleSocieties = societyChoices.length > 1

  // Auto-select default society + vehicle on data load (restored snapshot takes priority)
  useEffect(() => {
    if (dataLoading.vehicles || dataLoading.packages || dataLoading.societies) return
    if (societies.length > 0 && !selectedSociety) {
      const rs = restored?.societyId ? societies.find(s => s._id === restored.societyId) : null
      if (rs) {
        setSelectedSociety(rs)
      } else {
        const defaultAddr = user?.addresses?.find(a => a.isDefault) || user?.addresses?.[0]
        const userSocId = defaultAddr?.society?._id || defaultAddr?.society
        let userSoc = userSocId ? societies.find(s => s._id === userSocId.toString()) : null
        // Addresses added/edited from the Profile screen only capture a free-text
        // "societyName" (no Society document ref) — fall back to a name match so
        // those customers still land on their own society instead of an arbitrary one.
        if (!userSoc && defaultAddr?.societyName) {
          const wanted = defaultAddr.societyName.trim().toLowerCase()
          userSoc = societies.find(s => s.name?.trim().toLowerCase() === wanted)
        }
        setSelectedSociety(userSoc || societyOptions[0])
      }
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
      } else if (initialTrial && !hasUsedTrial) {
        setSelectedPkg({ isTrial: true, name: '1-Day Trial', price: trialPrice, _id: null })
        if (!selectedTrialDate) {
          const tm = new Date(); tm.setDate(tm.getDate() + 1)
          setSelectedTrialDate(getLocalDateString(tm))
        }
      }
    }
    // One-time restore of scalar fields (slot is restored once the society is set, below)
    if (restored && !restoreAppliedRef.current) {
      restoreAppliedRef.current = true
      if (restored.selectedTrialDate) setSelectedTrialDate(restored.selectedTrialDate)
      if (restored.specialInstructions) setSpecialInstructions(restored.specialInstructions)
      if (restored.couponCode) setCouponInput(restored.couponCode)
    }
  }, [dataLoading, societies, packages, vehicles, initialPackageId, initialVehicleId, initialTrial, hasUsedTrial])

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

  // Load Razorpay script.
  // IMPORTANT: only mark ready once `window.Razorpay` actually exists — not merely
  // when the <script> tag is present. On slower devices (notably iOS Safari) the tag
  // can exist before the SDK has parsed; opening then throws "Failed to initiate
  // payment". We wait for the real load event and poll as a safety net.
  useEffect(() => {
    if (window.Razorpay) { setRazorpayReady(true); return }
    const SRC = 'https://checkout.razorpay.com/v1/checkout.js'
    const markReady = () => { if (window.Razorpay) setRazorpayReady(true) }
    let poll = null
    const startPoll = () => {
      poll = setInterval(() => { if (window.Razorpay) { clearInterval(poll); setRazorpayReady(true) } }, 200)
      setTimeout(() => poll && clearInterval(poll), 10000)
    }
    let script = document.querySelector(`script[src="${SRC}"]`)
    if (script) {
      script.addEventListener('load', markReady)
      startPoll() // in case 'load' already fired before this listener attached
      return () => { script.removeEventListener('load', markReady); poll && clearInterval(poll) }
    }
    script = document.createElement('script')
    script.src = SRC
    script.async = true
    script.onload = markReady
    script.onerror = () => setPaymentError('Failed to load payment gateway. Please refresh.')
    document.body.appendChild(script)
    return () => { poll && clearInterval(poll) }
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

  // Pre-create the Razorpay order as soon as the Pay step is showing a final amount,
  // so the "Pay" tap itself never has to await a network call (see note above).
  // Re-runs whenever the amount changes (coupon applied/removed, priority override).
  useEffect(() => {
    if (step !== 2) return
    if (!selectedPkg || !selectedVehicle || !selectedSociety || !selectedSlot) return
    if (!finalAmount || finalAmount < 1) return
    if (preparedOrder?.amount === finalAmount) return
    if (preparingOrderRef.current) return

    preparingOrderRef.current = true
    setPreparingOrder(true)
    ;(async () => {
      try {
        const keyRes = await apiClient.get('/payment/key')
        const orderRes = await apiClient.post('/payment/create-order', {
          amount: finalAmount,
          currency: 'INR',
          packageId: selectedPkg._id || null,
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
        setPreparedOrder({ key: keyRes.key, order: orderRes.order, amount: finalAmount })
      } catch (err) {
        setPaymentError(err.message || 'Failed to prepare payment. Please try again.')
      } finally {
        preparingOrderRef.current = false
        setPreparingOrder(false)
      }
    })()
  }, [step, selectedPkg?._id, selectedPkg?.isTrial, selectedVehicle?._id, selectedSociety?._id, selectedSlot?.slotId, finalAmount])

  // While waiting on a Safari-tab payment (iOS PWA), a new Active subscription
  // appearing means the backend callback finalized the booking — jump to success.
  useEffect(() => {
    if (!awaitingExternalPayment) return
    const baseline = externalPayBaselineRef.current
    const activeCount = (activeSubscriptions || []).filter(s => s.status === 'Active').length
    if (baseline != null && activeCount > baseline) {
      setAwaitingExternalPayment(false)
      setProcessing(false)
      setStep(3)
    }
  }, [activeSubscriptions, awaitingExternalPayment])

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
  // Deliberately synchronous (no awaits before rzp.open()) — the order is already
  // pre-created by the effect above, so tapping Pay opens checkout immediately as
  // a direct response to the click, which UPI app-intent handoff depends on.
  const handlePayment = () => {
    if (!selectedPkg || !selectedVehicle || !selectedSociety || !selectedSlot) return
    if (!preparedOrder || preparedOrder.amount !== finalAmount) {
      setPaymentError('Still preparing your payment — please wait a moment and tap Pay again.')
      return
    }
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

    if (!window.Razorpay) {
      failBooking('Payment gateway is still loading. Please wait a moment and tap Pay again.')
      return
    }

    setProcessing(true)

    const { key, order } = preparedOrder
    const apiBase  = import.meta.env.VITE_API_URL || ''
    const ua = navigator.userAgent
    const isIOS = /iPhone|iPad|iPod/i.test(ua)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    // Redirect mode is required on Android (Chrome blocks UPI app-intent handoff
    // from inside the checkout iframe) but BREAKS iOS: the first tap on a UPI app
    // (PayTM/GPay) silently fails to launch the app, forcing the user to cancel
    // and tap Pay again. iOS launches the app reliably from the standard in-page
    // checkout, so never use redirect mode there.
    const useRedirect = !isIOS && (isMobile || apiBase.startsWith('https://'))

    const getCallbackUrl = (base) => {
      const origin = window.location.origin;
      let cleanBase = base;
      if (cleanBase && !cleanBase.startsWith('http')) {
        if (!cleanBase.startsWith('/')) {
          cleanBase = '/' + cleanBase;
        }
        cleanBase = origin + cleanBase;
      }
      if (cleanBase.endsWith('/')) {
        cleanBase = cleanBase.slice(0, -1);
      }
      return `${cleanBase}/payment/callback?frontendOrigin=${encodeURIComponent(origin)}`;
    }

    const prefillContact = (() => {
      if (!user?.phone) return ''
      const d = user.phone.replace(/\D/g, '')
      return d.length === 10 ? `+91${d}` : user.phone.startsWith('+') ? user.phone : `+91${user.phone}`
    })()
    const themeColor = theme === 'light' ? '#0056B3' : '#DFFF00'
    const description = `${selectedPkg.name} for ${selectedVehicle.model}`

    // Installed iOS PWA: the WebView can't launch UPI apps, so run checkout in a
    // real Safari tab. The backend callback finalizes the booking server-side; we
    // just wait for the new subscription to appear on return.
    if (isIOSStandalone()) {
      externalPayBaselineRef.current = (activeSubscriptions || []).filter(s => s.status === 'Active').length
      openCheckoutInSafari({
        key, order,
        callbackUrl: getCallbackUrl(apiBase),
        name: 'Cleanzo', description, contact: prefillContact,
        email: user?.email || '', color: themeColor,
      })
      setProcessing(false)
      setAwaitingExternalPayment(true)
      return
    }

    const options = {
      key,
      amount: order.amount,
      currency: order.currency,
      name: 'Cleanzo',
      description,
      order_id: order.id,
      // Use redirect mode on mobile web browsers to support UPI app handoff/deep-linking
      // (which browsers block inside standard iframe modals).
      ...(useRedirect ? {
        redirect: true,
        callback_url: getCallbackUrl(apiBase),
      } : {}),
      handler: completeBooking,
      prefill: {
        name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
        contact: prefillContact,
        email: user?.email || '',
      },
      theme: { color: themeColor },
      modal: { ondismiss: () => setProcessing(false) },
    }

    const rzp = new window.Razorpay(options)
    rzp.on('payment.failed', (r) => failBooking(`Payment failed: ${r.error.description}`))
    rzp.open()
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

  // ── Wizard steps ───────────────────────────────────────────────────────────
  // Trials keep a date-picker first step; paid plans go straight to slot selection.
  const isTrialFlow = selectedPkg?.isTrial ?? initialTrial
  const wizardSteps = isTrialFlow
    ? [{ i: 0, label: 'Trial' }, { i: 1, label: 'Slot' }, { i: 2, label: 'Pay' }]
    : [{ i: 1, label: 'Slot' }, { i: 2, label: 'Pay' }]
  const minStep = isTrialFlow ? 0 : 1

  return (
    <div className="app-shell animate-fade-in" style={{ paddingBottom: 120 }}>

      {/* ── Safari-tab payment overlay (iOS PWA) ──────────────────────────── */}
      {awaitingExternalPayment && (
        <ExternalPaymentWaiting
          onRefresh={refreshAll}
          onCancel={() => { setAwaitingExternalPayment(false); setProcessing(false) }}
        />
      )}

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
            onClick={() => step > minStep ? setStep(step - 1) : navigate(-1)}
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
        {/* ── Step indicator ────────────────────────────────────────────── */}
        {step < 3 && (
          <div className="flex items-center gap-12" style={{ margin: '12px 0 28px' }}>
            {wizardSteps.map((s, j) => (
              <div key={s.i} className="flex items-center gap-12" style={{ flex: j < wizardSteps.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 12, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 12, fontWeight: 800, fontFamily: 'var(--font-display)',
                    background: s.i <= step ? 'var(--bg-accent)' : 'var(--bg-glass)',
                    color: s.i <= step ? 'var(--text-on-accent)' : 'var(--text-tertiary)',
                    border: `1px solid ${s.i <= step ? 'transparent' : 'var(--border-glass)'}`,
                    boxShadow: s.i === step ? '0 0 20px rgba(var(--bg-accent-rgb),0.3)' : 'none',
                    transition: 'all 0.3s var(--ease-out)',
                  }}>
                    {s.i < step ? <Check size={15} strokeWidth={3} /> : j + 1}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: s.i === step ? 'var(--text-accent)' : 'var(--text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {s.label}
                  </span>
                </div>
                {j < wizardSteps.length - 1 && (
                  <div style={{ flex: 1, height: 3, background: s.i < step ? 'var(--bg-accent)' : 'var(--divider)', borderRadius: 4, marginBottom: 16, transition: 'background 0.4s' }} />
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
            <div>
              <h3 className="text-headline-sm" style={{ marginBottom: 4 }}>Schedule Your Trial</h3>
              <p className="text-secondary text-body-sm">
                {selectedVehicle
                  ? `1-Day Trial for your ${selectedVehicle.brand} ${selectedVehicle.model}`
                  : 'Pick a date for your 1-Day Trial'}
              </p>
            </div>

            {/* Trial date picker */}
            <div className="flex flex-col gap-10">
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

            <button
              disabled={!selectedTrialDate || !selectedVehicle || !selectedSociety}
              className="btn btn-primary w-full"
              style={{ marginTop: 8, padding: 18, borderRadius: 18, fontWeight: 800, fontSize: 16 }}
              onClick={() => setStep(1)}
            >
              Choose Time Slot <ChevronRight size={18} style={{ marginLeft: 4 }} />
            </button>
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

            {/* Society picker — only when the customer has saved addresses in >1 society */}
            {hasMultipleSocieties && (
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
                    {societyChoices.map(s => (
                      <option key={s._id} value={s._id}>{s.name} ({s.city})</option>
                    ))}
                  </select>
                  <ChevronDown size={16} style={{ position: 'absolute', right: 14, bottom: 14, opacity: 0.4, pointerEvents: 'none' }} />
                </div>
              </div>
            )}

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
              <button className="btn btn-ghost" style={{ flex: 1, borderRadius: 16 }} onClick={() => isTrialFlow ? setStep(0) : navigate(-1)}>Back</button>
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
                disabled={processing || !razorpayReady || preparingOrder || preparedOrder?.amount !== finalAmount}
                className={`btn btn-primary ${processing ? 'is-loading' : ''}`}
                style={{ flex: 2, borderRadius: 22, fontWeight: 800, fontSize: 18, padding: 20, boxShadow: '0 0 24px rgba(var(--bg-accent-rgb),0.25)' }}
                onClick={handlePayment}
              >
                {processing ? 'Processing…' : !razorpayReady ? 'Loading…' : (preparingOrder || preparedOrder?.amount !== finalAmount) ? 'Preparing…' : `Pay ₹${finalAmount}`}
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
              <button className="btn btn-primary w-full" style={{ borderRadius: 18, padding: 16, fontWeight: 800 }} onClick={() => { setStep(minStep); setPaymentError('') }}>
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
