import PageLoader from '../../components/PageLoader'
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Check, ArrowRight, ChevronRight, Car, Bike, X, ShoppingBag, Crown, RefreshCw, Clock } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useCustomerData } from '../../context/CustomerDataContext'
import { useAuth } from '../../context/AuthContext'
import { getPackagePricing } from '../../utils/pricing'
import { sortPackagesByTier, tierRank } from '../../utils/helpers'
import { FEATURES } from '../../config/features'

export default function PackageSelect() {
  const { packages, subscriptions, vehicles, discounts, settings, loading: dataLoading, refreshAll } = useCustomerData()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const [selectedVehicleId, setSelectedVehicleId] = useState(null)

  const activeSub = (subscriptions || []).find(s => s.status === 'Active') || null
  const activeSubForVehicle = (subscriptions || []).find(s => s.status === 'Active' && s.vehicle?._id === selectedVehicleId) || null

  // Razorpay skips its "Contact details" screen only when a valid contact is
  // prefilled — otherwise it asks the user to type their phone before showing
  // payment methods. Prefer the logged-in user's phone (they're the one paying).
  const prefillContact = (() => {
    const phone = user?.phone || activeSubForVehicle?.customer?.phone
    if (!phone) return ''
    const d = String(phone).replace(/\D/g, '')
    return d.length === 10 ? `+91${d}` : String(phone).startsWith('+') ? String(phone) : `+91${phone}`
  })()

  // Coupon state (extension flow)
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null) // { code, discountAmount }
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)

  // Upgrade flow
  const isUpgrade = queryParams.get('upgrade') === 'true'
  const [upgradeTarget, setUpgradeTarget] = useState(null)

  // Extension price reflects the CURRENT discount config for the sub's package + vehicle
  const extensionPricing = activeSubForVehicle
    ? getPackagePricing(activeSubForVehicle.package, activeSubForVehicle.vehicle, discounts)
    : null
  // Prefer the live discounted package price, but fall back to the subscription's
  // own stored amount when the package pricing yields 0 — e.g. subscriptions that
  // have no linked `package` (package === null) would otherwise extend at ₹0,
  // which the backend rejects with "Amount is required".
  const baseExtensionAmount = (extensionPricing && extensionPricing.effectivePrice > 0)
    ? extensionPricing.effectivePrice
    : (activeSubForVehicle?.amount || activeSubForVehicle?.package?.price || 0)
  const extensionCouponDiscount = appliedCoupon ? Math.min(appliedCoupon.discountAmount, baseExtensionAmount) : 0
  const extensionAmount = baseExtensionAmount - extensionCouponDiscount

  const loading = dataLoading.packages || dataLoading.subscriptions
  const error = '' // Handled by global context if needed

  // Determine initial extension step from URL query params (Razorpay redirect-back)
  const initialStatus = queryParams.get('status')
  const initialExtended = queryParams.get('extended')
  const initialError = queryParams.get('error')
  const [extensionStep, setExtensionStep] = useState(() => {
    if (initialExtended === 'true') {
      if (initialStatus === 'success') return 3
      if (initialStatus === 'failed') return 4
    }
    return 0
  })
  const [countdown, setCountdown] = useState(5)
  const [razorpayReady, setRazorpayReady] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState('')

  // Orders are pre-created while the user is reviewing the summary so tapping "Pay"
  // calls rzp.open() with zero network calls in between — any await before opening
  // checkout risks losing the click's "user gesture" status on mobile, which is what
  // blocks UPI apps (PayTM, GPay, etc.) from launching via intent on the first tap.
  const [preparedExtensionOrder, setPreparedExtensionOrder] = useState(null) // { key, order, amount }
  const [preparingExtensionOrder, setPreparingExtensionOrder] = useState(false)
  const preparingExtensionOrderRef = useRef(false)

  const [preparedUpgradeOrders, setPreparedUpgradeOrders] = useState({}) // { [packageId]: { key, order, amount } }
  const [preparingUpgradeIds, setPreparingUpgradeIds] = useState({})
  const preparingUpgradeIdsRef = useRef({})

  // Clear any applied coupon / upgrade selection when the selected vehicle changes
  useEffect(() => {
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponError('')
    setUpgradeTarget(null)
  }, [selectedVehicleId])

  const applyExtensionCoupon = async () => {
    if (!couponInput.trim() || !activeSubForVehicle) return
    setCouponLoading(true)
    setCouponError('')
    try {
      const res = await apiClient.post('/customer/coupons/validate', {
        code: couponInput.trim(),
        type: 'extension',
        subscriptionId: activeSubForVehicle._id,
        societyId: activeSubForVehicle.society?._id || activeSubForVehicle.society,
        baseAmount: baseExtensionAmount,
      })
      setAppliedCoupon({ code: res.code, discountAmount: res.discountAmount })
    } catch (err) {
      setAppliedCoupon(null)
      setCouponError(err?.message || 'Invalid coupon code')
    } finally {
      setCouponLoading(false)
    }
  }

  const removeExtensionCoupon = () => {
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponError('')
  }

  // Pre-select vehicle and open extension/upgrade flow if navigated from Subscription Detail page
  useEffect(() => {
    const initialVehicleId = queryParams.get('vehicleId')
    const initialExtend = queryParams.get('extend')
    const initialUpgrade = queryParams.get('upgrade')
    if (initialExtend === 'true' && initialVehicleId) {
      setSelectedVehicleId(initialVehicleId)
      setExtensionStep(1)
    } else if (initialUpgrade === 'true' && initialVehicleId) {
      setSelectedVehicleId(initialVehicleId)
    }
  }, [location.search])

  // On Razorpay redirect-back, trigger a data refresh so the updated subscription
  // appears when the user navigates to the dashboard after the countdown.
  useEffect(() => {
    if (initialExtended === 'true') {
      if (initialStatus === 'success') {
        refreshAll()
      } else if (initialStatus === 'failed') {
        setPaymentError(initialError || 'Payment failed')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 5-second countdown timer for success screen redirection
  useEffect(() => {
    if (extensionStep === 3) {
      setCountdown(5)
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            navigate('/customer/subscriptions')
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [extensionStep, navigate])

  // Load Razorpay script.
  // Only mark ready once `window.Razorpay` actually exists — not merely when the
  // <script> tag is present. On slower devices (notably iOS Safari) the tag can exist
  // before the SDK has parsed, and opening then throws "Failed to initiate payment".
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
      startPoll()
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

  // Pre-create the extension's Razorpay order as soon as the "Overview & Pay" screen
  // is showing a final amount. Re-runs whenever the amount changes (coupon applied).
  useEffect(() => {
    if (extensionStep !== 2 || !activeSubForVehicle) return
    if (!extensionAmount || extensionAmount < 1) return
    if (preparedExtensionOrder?.amount === extensionAmount) return
    if (preparingExtensionOrderRef.current) return

    preparingExtensionOrderRef.current = true
    setPreparingExtensionOrder(true)
    ;(async () => {
      try {
        const keyRes = await apiClient.get('/payment/key')
        const orderRes = await apiClient.post('/payment/create-order', {
          amount: extensionAmount,
          currency: 'INR',
          packageId: activeSubForVehicle.package?._id,
          vehicleId: activeSubForVehicle.vehicle?._id,
          societyId: activeSubForVehicle.society?._id || activeSubForVehicle.society,
          slotId: activeSubForVehicle.slot,
          type: 'extension',
          subscriptionId: activeSubForVehicle._id,
          couponCode: appliedCoupon?.code || undefined,
          frontendOrigin: window.location.origin,
        })
        setPreparedExtensionOrder({ key: keyRes.key, order: orderRes.order, amount: extensionAmount })
      } catch (err) {
        const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to prepare payment. Please try again.'
        setPaymentError(errMsg)
      } finally {
        preparingExtensionOrderRef.current = false
        setPreparingExtensionOrder(false)
      }
    })()
  }, [extensionStep, activeSubForVehicle?._id, extensionAmount])

  // Deliberately synchronous (no awaits before rzp.open()) — the order is already
  // pre-created by the effect above, so tapping Pay opens checkout immediately as
  // a direct response to the click, which UPI app-intent handoff depends on.
  const handleExtensionPayment = () => {
    if (!activeSubForVehicle) return
    if (!preparedExtensionOrder || preparedExtensionOrder.amount !== extensionAmount) {
      setPaymentError('Still preparing your payment — please wait a moment and tap Pay again.')
      return
    }
    setPaymentError('')

    // Extend the subscription once a paymentId exists (Razorpay-verified or a
    // Pay-to-Cleaner record). Shared by both checkout paths.
    const activateExtension = async (paymentId) => {
      try {
        await apiClient.post(`/customer/subscriptions/${activeSubForVehicle._id}/extend`, {
          paymentId,
          couponCode: appliedCoupon?.code || undefined
        })
        setProcessing(false)
        refreshAll()
        setExtensionStep(3)
      } catch (err) {
        setProcessing(false)
        const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Could not extend your plan.'
        setPaymentError(errMsg)
        setExtensionStep(4)
      }
    }

    const failExtension = (msg) => {
      setProcessing(false)
      setPaymentError(msg)
      setExtensionStep(4)
    }

    // ─── RAZORPAY FLOW (verify, then extend) ────────────────────────────────
    const completeExtension = async (response) => {
      try {
        await apiClient.post('/payment/verify', {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        })
        await activateExtension(response.razorpay_payment_id)
      } catch (verifyErr) {
        setProcessing(false)
        const errMsg = verifyErr.response?.data?.message || verifyErr.response?.data?.error || verifyErr.message || 'Payment verification or plan extension failed.'
        setPaymentError(errMsg)
        setExtensionStep(4)
      }
    }

    if (!window.Razorpay) {
      failExtension('Payment gateway is still loading. Please wait a moment and tap Pay again.')
      return
    }

    setProcessing(true)

    const { key, order } = preparedExtensionOrder
    const _apiBase = import.meta.env.VITE_API_URL || ''
    const ua = navigator.userAgent
    const isIOS = /iPhone|iPad|iPod/i.test(ua)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    // Redirect mode is required on Android (Chrome blocks UPI app-intent handoff
    // from inside the checkout iframe) but BREAKS iOS: the first tap on a UPI app
    // (PayTM/GPay) silently fails to launch the app, forcing the user to cancel
    // and tap Pay again. iOS launches the app reliably from the standard in-page
    // checkout, so never use redirect mode there.
    const useRedirect = !isIOS && (isMobile || _apiBase.startsWith('https://'))

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

    const options = {
      key,
      amount: order.amount,
      currency: order.currency,
      name: 'Cleanzo',
      description: `Plan Extension for ${activeSubForVehicle.vehicle?.model}`,
      order_id: order.id,
      // Use redirect mode on mobile web browsers to support UPI app handoff/deep-linking
      // (which browsers block inside standard iframe modals).
      ...(useRedirect ? {
        redirect: true,
        callback_url: getCallbackUrl(_apiBase),
      } : {}),
      handler: completeExtension,
      prefill: {
        name: activeSubForVehicle.customer?.firstName ? `${activeSubForVehicle.customer.firstName} ${activeSubForVehicle.customer.lastName || ''}` : '',
        email: activeSubForVehicle.customer?.email || '',
        contact: prefillContact,
      },
      modal: {
        ondismiss: () => setProcessing(false)
      },
    }

    const rzp = new window.Razorpay(options)
    rzp.on('payment.failed', function (response) {
      failExtension(`Payment failed: ${response.error.description}`)
    })
    rzp.open()
  }

  // ── Upgrade payment ─────────────────────────────────────────────────────────
  // Deliberately synchronous (no awaits before rzp.open()) — the order is already
  // pre-created by the effect above, so tapping Upgrade opens checkout immediately
  // as a direct response to the click, which UPI app-intent handoff depends on.
  const handleUpgradePayment = (targetPkg) => {
    if (!activeSubForVehicle || !targetPkg) return
    const targetPricing = getPackagePricing(targetPkg, activeSubForVehicle.vehicle, discounts)
    const amount = targetPricing.hasDiscount ? targetPricing.effectivePrice : targetPkg.price
    const prepared = preparedUpgradeOrders[targetPkg._id]
    if (!prepared || prepared.amount !== amount) {
      setPaymentError('Still preparing your payment — please wait a moment and tap Upgrade again.')
      return
    }
    setPaymentError('')

    // Apply the upgrade once a paymentId exists (Razorpay-verified or a
    // Pay-to-Cleaner record). Shared by both checkout paths.
    const activateUpgrade = async (paymentId) => {
      try {
        await apiClient.post(`/customer/subscriptions/${activeSubForVehicle._id}/upgrade`, {
          packageId: targetPkg._id,
          paymentId
        })
        setProcessing(false)
        refreshAll()
        navigate('/customer/subscriptions?status=success&upgraded=true')
      } catch (err) {
        setProcessing(false)
        const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Could not upgrade your plan.'
        setPaymentError(errMsg)
      }
    }

    const failUpgrade = (msg) => {
      setProcessing(false)
      setPaymentError(msg)
    }

    // ─── RAZORPAY FLOW (verify, then upgrade) ───────────────────────────────
    const completeUpgrade = async (response) => {
      try {
        await apiClient.post('/payment/verify', {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        })
        await activateUpgrade(response.razorpay_payment_id)
      } catch (verifyErr) {
        setProcessing(false)
        const errMsg = verifyErr.response?.data?.message || verifyErr.response?.data?.error || verifyErr.message || 'Payment verification or plan upgrade failed.'
        setPaymentError(errMsg)
      }
    }

    if (!window.Razorpay) {
      failUpgrade('Payment gateway is still loading. Please wait a moment and tap Pay again.')
      return
    }

    setProcessing(true)

    const { key, order } = prepared
    const _apiBase = import.meta.env.VITE_API_URL || ''
    const ua = navigator.userAgent
    const isIOS = /iPhone|iPad|iPod/i.test(ua)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    // Redirect mode is required on Android (Chrome blocks UPI app-intent handoff
    // from inside the checkout iframe) but BREAKS iOS: the first tap on a UPI app
    // (PayTM/GPay) silently fails to launch the app, forcing the user to cancel
    // and tap Pay again. iOS launches the app reliably from the standard in-page
    // checkout, so never use redirect mode there.
    const useRedirect = !isIOS && (isMobile || _apiBase.startsWith('https://'))

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

    const options = {
      key,
      amount: order.amount,
      currency: order.currency,
      name: 'Cleanzo',
      description: `Upgrade to ${targetPkg.name} for ${activeSubForVehicle.vehicle?.model}`,
      order_id: order.id,
      // Use redirect mode on mobile web browsers to support UPI app handoff/deep-linking
      // (which browsers block inside standard iframe modals).
      ...(useRedirect ? {
        redirect: true,
        callback_url: getCallbackUrl(_apiBase),
      } : {}),
      handler: completeUpgrade,
      prefill: {
        name: activeSubForVehicle.customer?.firstName ? `${activeSubForVehicle.customer.firstName} ${activeSubForVehicle.customer.lastName || ''}` : '',
        email: activeSubForVehicle.customer?.email || '',
        contact: prefillContact,
      },
      modal: { ondismiss: () => setProcessing(false) },
    }

    const rzp = new window.Razorpay(options)
    rzp.on('payment.failed', function (response) {
      failUpgrade(`Payment failed: ${response.error.description}`)
    })
    rzp.open()
  }

  useEffect(() => {
    if (vehicles && vehicles.length > 0) {
      const exists = vehicles.some(v => v._id === selectedVehicleId)
      if (!exists) {
        setSelectedVehicleId(vehicles[0]._id)
      }
    } else {
      setSelectedVehicleId(null)
    }
  }, [vehicles, selectedVehicleId])

  // NOTE: the following consts/effect must stay above the loading/error early
  // returns below — anything declared after them (including hooks) would only
  // run once `loading` flips to false, changing the hook count between renders.
  const selectedVehicle = vehicles?.find(v => v._id === selectedVehicleId) || null

  const isVehicleEligibleForPackage = (vehicle, pkg) => {
    if (!vehicle || !pkg) return false;
    // If the package has no restrictions, it applies to all vehicles.
    if (!pkg.applicableModels || pkg.applicableModels.length === 0) return true;

    const brandConfig = pkg.applicableModels.find(
      app => app.brand.toLowerCase() === vehicle.brand.toLowerCase()
    );
    if (!brandConfig) return false;
    // If the brand is found, check if models array is empty (all models covered) or includes the vehicle's model
    if (!brandConfig.models || brandConfig.models.length === 0) return true;
    return brandConfig.models.some(
      m => m.toLowerCase() === vehicle.model.toLowerCase()
    );
  };

  // Filter packages based on the selected vehicle, ordered Basic → Standard → Premium
  const displayPackages = selectedVehicle
    ? sortPackagesByTier(packages.filter(pkg => isVehicleEligibleForPackage(selectedVehicle, pkg)))
    : [];

  // Trial is offered once per vehicle — a customer with several vehicles can trial
  // each one independently, but not retake it for a vehicle that's already used it.
  const hasUsedTrial = (subscriptions || []).some(s => s.isTrial && (s.vehicle?._id || s.vehicle) === selectedVehicleId)
  const trialPrice = (() => {
    if (!selectedVehicle || packages.length === 0) return settings.trialPrice || 30
    const matched = displayPackages.filter(p => p.isActive !== false)
    const basic = matched.find(p => (p.tier || 'BASIC').toUpperCase() === 'BASIC' && p.trialPrice != null)
    if (basic) return basic.trialPrice
    const any = matched.find(p => p.trialPrice != null)
    if (any) return any.trialPrice
    return settings.trialPrice || 30
  })()

  // Pre-create a Razorpay order for each higher-tier plan shown on the Upgrade
  // screen, so tapping "Upgrade for ₹X" opens checkout with zero network calls
  // in between (same reasoning as the extension order above).
  useEffect(() => {
    if (!isUpgrade || !activeSubForVehicle) return
    const currentRank = tierRank(activeSubForVehicle.package)
    const targets = displayPackages.filter(p => tierRank(p) > currentRank)
    targets.forEach(pkg => {
      const pricing = getPackagePricing(pkg, activeSubForVehicle.vehicle, discounts)
      const amount = pricing.hasDiscount ? pricing.effectivePrice : pkg.price
      if (!amount || amount < 1) return
      if (preparedUpgradeOrders[pkg._id]?.amount === amount) return
      if (preparingUpgradeIdsRef.current[pkg._id]) return

      preparingUpgradeIdsRef.current[pkg._id] = true
      setPreparingUpgradeIds(prev => ({ ...prev, [pkg._id]: true }))
      ;(async () => {
        try {
          const keyRes = await apiClient.get('/payment/key')
          const orderRes = await apiClient.post('/payment/create-order', {
            amount,
            currency: 'INR',
            packageId: pkg._id,
            vehicleId: activeSubForVehicle.vehicle?._id,
            societyId: activeSubForVehicle.society?._id || activeSubForVehicle.society,
            slotId: activeSubForVehicle.slot,
            type: 'upgrade',
            subscriptionId: activeSubForVehicle._id,
            frontendOrigin: window.location.origin,
          })
          setPreparedUpgradeOrders(prev => ({ ...prev, [pkg._id]: { key: keyRes.key, order: orderRes.order, amount } }))
        } catch (err) {
          const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to prepare payment. Please try again.'
          setPaymentError(errMsg)
        } finally {
          preparingUpgradeIdsRef.current[pkg._id] = false
          setPreparingUpgradeIds(prev => ({ ...prev, [pkg._id]: false }))
        }
      })()
    })
  }, [isUpgrade, activeSubForVehicle?._id, displayPackages, discounts])

  // Success/failure screens don't need any data — skip the loading skeleton
  if (loading && extensionStep < 3) return (
    <div className="app-shell">
      <div className="app-header" style={{ padding: '16px var(--margin-side)', background: 'transparent' }}>
        <div className="skeleton" style={{ width: 150, height: 24, borderRadius: 8 }} />
      </div>
      <div className="container" style={{ padding: '0 20px' }}>
        <div className="flex flex-col gap-12 mt-12">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass" style={{ padding: 24, borderRadius: 28, marginBottom: 16 }}>
              <div className="flex justify-between items-start mb-20">
                <div>
                  <div className="skeleton" style={{ width: 120, height: 22, borderRadius: 6, marginBottom: 8 }} />
                  <div className="skeleton" style={{ width: 80, height: 12, borderRadius: 4 }} />
                </div>
                <div className="skeleton" style={{ width: 60, height: 24, borderRadius: 8 }} />
              </div>
              <div className="flex flex-col gap-10 mb-24">
                {[1, 2, 3].map(j => (
                  <div key={j} className="flex items-center gap-10">
                    <div className="skeleton" style={{ width: 16, height: 16, borderRadius: 4 }} />
                    <div className="skeleton" style={{ width: 180, height: 12, borderRadius: 4 }} />
                  </div>
                ))}
              </div>
              <div className="skeleton" style={{ height: 52, borderRadius: 18 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
  
  if (error) return <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--error)' }}>{error}</div>

  // ── Upgrade view ────────────────────────────────────────────────────────────
  if (isUpgrade && activeSubForVehicle) {
    const currentRank = tierRank(activeSubForVehicle.package)
    const higherPlans = displayPackages.filter(p => tierRank(p) > currentRank)

    return (
      <div style={{ padding: '0 20px', paddingBottom: 100 }}>
        {processing && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(20px)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24, textAlign: 'center' }} className="animate-fade-in">
            <div style={{ width: 64, height: 64, borderRadius: '50%', border: '4px solid rgba(var(--bg-accent-rgb),0.1)', borderTop: '4px solid var(--bg-accent)', animation: 'spin 1s linear infinite' }} />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#fff' }}>Securing Connection…</h3>
          </div>
        )}

        <div className="app-header" style={{ padding: '16px 0' }}>
          <button onClick={() => navigate(-1)} className="flex items-center gap-8 bg-transparent border-none text-[color:var(--text-primary)] cursor-pointer p-0">
            <ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Upgrade Plan</span>
          </button>
        </div>

        {paymentError && (
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 16, fontSize: 14 }}>
            {paymentError}
          </div>
        )}

        {higherPlans.length === 0 ? (
          /* Already on the top tier — appreciation + marketplace */
          <div className="glass flex flex-col items-center text-center animate-fade-in-up" style={{ padding: '40px 24px', borderRadius: 28, marginTop: 24, gap: 16, border: '1px solid var(--bg-accent)' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(var(--bg-accent-rgb),0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Crown size={34} className="text-lime" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800 }}>You're already Premium! 🎉</h2>
            <p className="text-secondary text-body-md" style={{ maxWidth: 320 }}>
              You're enjoying our highest tier of care for your {activeSubForVehicle.vehicle?.brand} {activeSubForVehicle.vehicle?.model}. Thank you for being a valued Cleanzo member.
            </p>
            <button className="btn btn-primary w-full" style={{ borderRadius: 16, padding: 16, fontWeight: 800, marginTop: 8 }} onClick={() => navigate('/customer/marketplace')}>
              <ShoppingBag size={18} /> Explore the Marketplace
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-12" style={{ marginTop: 8 }}>
            <div style={{ marginBottom: 4 }}>
              <h3 className="text-headline-sm" style={{ marginBottom: 4 }}>Upgrade your plan</h3>
              <p className="text-secondary text-body-sm">
                You're on <strong>{activeSubForVehicle.package?.name || 'your current plan'}</strong>. Pick a higher tier — upgrading starts a fresh 30-day term.
              </p>
            </div>

            {higherPlans.map(pkg => {
              const pricing = getPackagePricing(pkg, activeSubForVehicle.vehicle, discounts)
              return (
                <div key={pkg._id} className="glass animate-fade-in" style={{ padding: 24, borderRadius: 24, border: '1px solid var(--border-glass)', marginBottom: 4 }}>
                  <div className="flex justify-between items-start" style={{ marginBottom: 16 }}>
                    <div>
                      <div className="flex items-center gap-8 mb-4">
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>{pkg.name}</h2>
                        {pkg.popular && <span className="chip chip-lime" style={{ fontSize: 9 }}>Popular</span>}
                      </div>
                      <div className="text-label text-tertiary" style={{ fontSize: 10 }}>{pkg.tier || 'Standard'} Tier</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {pricing.hasDiscount && (
                        <div className="flex items-center gap-6" style={{ justifyContent: 'flex-end' }}>
                          <span className="text-body-sm text-secondary" style={{ textDecoration: 'line-through' }}>₹{pricing.originalPrice}</span>
                          <span className="chip chip-lime" style={{ fontSize: 9 }}>{pricing.percent}% OFF</span>
                        </div>
                      )}
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-accent)' }}>₹{pricing.effectivePrice}</div>
                      <div className="text-body-sm text-secondary">/month</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-10" style={{ marginBottom: 20 }}>
                    {(pkg.features || []).slice(0, 4).map((f, i) => (
                      <div key={i} className="flex items-center gap-10 text-body-sm">
                        <Check size={16} className="text-lime" strokeWidth={3} />
                        <span className="text-secondary">{f}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    className={`btn btn-primary w-full ${processing ? 'is-loading' : ''}`}
                    style={{ padding: 16, borderRadius: 16, fontWeight: 800 }}
                    disabled={processing || !razorpayReady || preparingUpgradeIds[pkg._id] || preparedUpgradeOrders[pkg._id]?.amount !== pricing.effectivePrice}
                    onClick={() => handleUpgradePayment(pkg)}
                  >
                    {processing ? 'Processing…' : !razorpayReady ? 'Loading…' : (preparingUpgradeIds[pkg._id] || preparedUpgradeOrders[pkg._id]?.amount !== pricing.effectivePrice) ? 'Preparing…' : `Upgrade for ₹${pricing.effectivePrice}`}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  if (extensionStep > 0) {
    return (
      <div className="animate-fade-in" style={{ padding: '0 20px', paddingBottom: 100 }}>
        {processing && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 10, 10, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
            padding: 24,
            textAlign: 'center'
          }} className="animate-fade-in">
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              border: '4px solid rgba(var(--bg-accent-rgb), 0.1)',
              borderTop: '4px solid var(--bg-accent)',
              animation: 'spin 1s linear infinite'
            }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                Securing Connection...
              </h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', maxWidth: 280, margin: '0 auto', lineHeight: 1.5 }}>
                Connecting to the secure payment gateway. Please do not close or refresh this page.
              </p>
            </div>
          </div>
        )}
        {extensionStep < 3 && (
          <div className="app-header" style={{ padding: '16px 0', background: 'transparent' }}>
            <button 
              onClick={() => setExtensionStep(extensionStep - 1)} 
              className="flex items-center gap-8 bg-transparent border-none text-[color:var(--text-primary)] cursor-pointer p-0"
            >
              <ArrowLeft size={20} /> 
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>
                {extensionStep === 1 ? 'Plan Extension Summary' : 'Confirm Extension'}
              </span>
            </button>
          </div>
        )}

        {extensionStep === 1 && (
          <div className="flex flex-col gap-24 animate-fade-in-up" style={{ marginTop: 12 }}>
            <div>
              <h3 className="text-headline-sm" style={{ marginBottom: 4 }}>Extend Plan</h3>
              <p className="text-secondary text-body-sm">Extend your active clean plan for another 30 days.</p>
            </div>

            <div className="glass" style={{ padding: 24, borderRadius: 28 }}>
              <div className="flex flex-col gap-16">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-label" style={{ color: 'var(--text-tertiary)', marginBottom: 4, fontSize: 9 }}>VEHICLE</div>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{activeSubForVehicle?.vehicle?.brand} {activeSubForVehicle?.vehicle?.model}</div>
                    <div className="text-body-sm text-secondary">{activeSubForVehicle?.vehicle?.number}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="text-label" style={{ color: 'var(--text-tertiary)', marginBottom: 4, fontSize: 9 }}>CURRENT PLAN</div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-accent)' }}>{activeSubForVehicle?.package?.name || 'Standard Plan'}</div>
                    <div className="text-body-sm text-secondary">Active</div>
                  </div>
                </div>

                <div className="divider" style={{ opacity: 0.3 }} />

                <div className="flex flex-col gap-10">
                  <div className="flex justify-between text-body-sm">
                    <span className="text-secondary">Current End Date</span>
                    <span style={{ fontWeight: 700 }}>
                      {activeSubForVehicle && new Date(activeSubForVehicle.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between text-body-sm">
                    <span className="text-secondary">New End Date (Extended)</span>
                    <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                      {activeSubForVehicle && new Date(new Date(activeSubForVehicle.endDate).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between text-body-sm">
                    <span className="text-secondary">Extra Service Days Added</span>
                    <span style={{ fontWeight: 700, color: 'var(--success)' }}>+30 Days</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-12 mt-12">
              <button className="btn btn-ghost" style={{ flex: 1, borderRadius: 16 }} onClick={() => setExtensionStep(0)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 2, borderRadius: 18, fontWeight: 800 }} 
                onClick={() => setExtensionStep(2)}
              >
                Extend the current plan
              </button>
            </div>
          </div>
        )}

        {extensionStep === 2 && (
          <div className="flex flex-col gap-24 animate-fade-in-up" style={{ marginTop: 12 }}>
            <div>
              <h3 className="text-headline-sm" style={{ marginBottom: 4 }}>Overview & Pay</h3>
              <p className="text-secondary text-body-sm">Review extension payment details</p>
            </div>

            <div className="glass" style={{ padding: 24, borderRadius: 28 }}>
              <div className="flex flex-col gap-16">
                <div className="flex justify-between items-center">
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>Plan Extension (30 Days)</div>
                    <div className="text-body-sm text-secondary">{activeSubForVehicle?.package?.name || 'Standard'} Package</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {extensionPricing?.hasDiscount && (
                      <div className="text-body-sm text-secondary" style={{ textDecoration: 'line-through' }}>₹{extensionPricing.originalPrice}</div>
                    )}
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>
                      ₹{baseExtensionAmount}
                    </div>
                  </div>
                </div>

                {extensionPricing?.hasDiscount && extensionPricing.note && (
                  <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>
                    {extensionPricing.note}
                  </div>
                )}

                {extensionCouponDiscount > 0 && (
                  <div className="flex justify-between items-center" style={{ fontSize: 14, color: 'var(--success)' }}>
                    <span>Coupon ({appliedCoupon.code})</span>
                    <span style={{ fontWeight: 700 }}>−₹{extensionCouponDiscount}</span>
                  </div>
                )}

                <div className="divider" style={{ opacity: 0.3 }} />

                <div className="flex justify-between items-center">
                  <span style={{ fontWeight: 800, fontSize: 18 }}>Total Amount</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color: 'var(--text-accent)' }}>
                    ₹{extensionAmount}
                  </span>
                </div>
              </div>
            </div>

            {/* Coupon */}
            <div className="flex flex-col gap-10">
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', paddingLeft: 4, letterSpacing: '0.06em' }}>
                HAVE A COUPON?
              </label>
              {appliedCoupon ? (
                <div className="glass" style={{ padding: '14px 18px', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(50,215,75,0.3)', background: 'rgba(50,215,75,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Check size={16} color="var(--success)" strokeWidth={3} />
                    <span style={{ fontWeight: 800, letterSpacing: '0.05em' }}>{appliedCoupon.code}</span>
                    <span style={{ color: 'var(--success)', fontSize: 13 }}>−₹{extensionCouponDiscount} applied</span>
                  </div>
                  <button onClick={removeExtensionCoupon} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Remove</button>
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
                    onClick={applyExtensionCoupon}
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

            <div className="glass" style={{ padding: '20px 24px', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 16, border: '1px solid rgba(50,215,75,0.2)' }}>
              <div style={{ width: 40, height: 40, background: 'rgba(50,215,75,0.1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={20} color="var(--success)" strokeWidth={3} />
              </div>
              <span className="text-body-sm text-secondary font-medium leading-relaxed">
                Secured payment via Razorpay. Your transaction is encrypted & 100% safe.
              </span>
            </div>

            {paymentError && (
              <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginTop: 8, fontSize: 14 }}>
                {paymentError}
              </div>
            )}

            <div className="flex gap-16" style={{ marginTop: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1, borderRadius: 20, padding: 18 }} onClick={() => setExtensionStep(1)}>Back</button>
              <button
                disabled={processing || !razorpayReady || preparingExtensionOrder || preparedExtensionOrder?.amount !== extensionAmount}
                className={`btn btn-primary ${processing ? 'is-loading' : ''}`}
                style={{ flex: 2, borderRadius: 20, fontWeight: 800, fontSize: 18, padding: 18, boxShadow: '0 0 30px rgba(var(--bg-accent-rgb), 0.25)' }}
                onClick={handleExtensionPayment}
              >
                {processing ? 'Processing…' : !razorpayReady ? 'Loading…' : (preparingExtensionOrder || preparedExtensionOrder?.amount !== extensionAmount) ? 'Preparing…' : `Pay ₹${extensionAmount}`}
              </button>
            </div>
          </div>
        )}

        {extensionStep === 3 && (
          <div className="flex flex-col items-center justify-center text-center gap-24 py-40 animate-fade-in">
            <div style={{ 
              width: 80, height: 80, borderRadius: '50%', background: 'rgba(50,215,75,0.1)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--success)', boxShadow: '0 0 30px rgba(50,215,75,0.25)',
              margin: '0 auto'
            }}>
              <Check size={40} color="var(--success)" strokeWidth={3} />
            </div>
            
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: 'var(--success)', marginBottom: 8 }}>
                Plan Extended!
              </h2>
              <p className="text-secondary text-body-md" style={{ maxWidth: 360, margin: '0 auto' }}>
                Your subscription has been extended successfully. Your clean service days have been increased.
              </p>
            </div>

            <div className="glass" style={{ padding: '16px 24px', borderRadius: 16, border: '1px solid var(--border-glass)', width: '100%' }}>
              <p className="text-secondary text-body-sm">
                Redirecting to active plan page in <span style={{ color: 'var(--text-accent)', fontWeight: 800 }}>{countdown}s</span>...
              </p>
            </div>

            <button 
              className="btn btn-primary w-full" 
              style={{ borderRadius: 18, padding: 18, fontWeight: 800 }}
              onClick={() => navigate('/customer/subscriptions')}
            >
              Go to Active Plan Page
            </button>
          </div>
        )}

        {extensionStep === 4 && (
          <div className="flex flex-col items-center justify-center text-center gap-24 py-40 animate-fade-in">
            <div style={{ 
              width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,69,58,0.1)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--error)', boxShadow: '0 0 30px rgba(255,69,58,0.25)',
              margin: '0 auto'
            }}>
              <X size={40} color="var(--error)" strokeWidth={3} />
            </div>
            
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: 'var(--error)', marginBottom: 8 }}>
                Payment Failed
              </h2>
              <p className="text-secondary text-body-md" style={{ maxWidth: 360, margin: '0 auto', wordBreak: 'break-word' }}>
                {paymentError || 'Something went wrong during the checkout process. Please try again.'}
              </p>
            </div>

            <div className="flex flex-col gap-12 w-full">
              <button 
                className="btn btn-primary w-full" 
                style={{ borderRadius: 18, padding: 18, fontWeight: 800 }}
                onClick={() => {
                  setPaymentError('');
                  setExtensionStep(2);
                  handleExtensionPayment();
                }}
              >
                Retry Payment
              </button>
              <button 
                className="btn btn-ghost w-full" 
                style={{ borderRadius: 18, padding: 18 }}
                onClick={() => setExtensionStep(0)}
              >
                Go to Plans
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '0 20px' }}>
      {processing && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(10, 10, 10, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          padding: 24,
          textAlign: 'center'
        }} className="animate-fade-in">
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            border: '4px solid rgba(var(--bg-accent-rgb), 0.1)',
            borderTop: '4px solid var(--bg-accent)',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              Securing Connection...
            </h3>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', maxWidth: 280, margin: '0 auto', lineHeight: 1.5 }}>
              Connecting to the secure payment gateway. Please do not close or refresh this page.
            </p>
          </div>
        </div>
      )}
      <div className="app-header" style={{ padding: '16px 0' }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-8 bg-transparent border-none text-[color:var(--text-primary)] cursor-pointer p-0">
          <ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Subscription Plans</span>
        </button>
        <button
          onClick={() => refreshAll()}
          aria-label="Refresh plans"
          disabled={dataLoading.packages}
          className="glass flex items-center justify-center"
          style={{ width: 40, height: 40, borderRadius: 12, border: '1px solid var(--border-glass)', cursor: dataLoading.packages ? 'default' : 'pointer' }}
        >
          <RefreshCw size={18} className={dataLoading.packages ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex flex-col gap-12" style={{ paddingBottom: 100 }}>
        {/* Vehicle Selection Header & Horizontal List */}
        {vehicles && vehicles.length > 0 && (
          <div style={{ marginTop: 8, marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Select Vehicle
            </div>
            <div 
              style={{ 
                display: 'flex', 
                gap: 12, 
                overflowX: 'auto', 
                paddingBottom: 12,
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch'
              }}
              className="no-scrollbar"
            >
              {vehicles.map(v => {
                const isSelected = v._id === selectedVehicleId;
                const isTwoWheeler = ['scooty', 'bike'].includes(v.category);
                const VehicleIcon = isTwoWheeler ? Bike : Car;
                return (
                  <button
                    key={v._id}
                    onClick={() => {
                      setSelectedVehicleId(v._id);
                      setExtensionStep(0);
                    }}
                    style={{
                      flex: '0 0 auto',
                      width: 150,
                      padding: '12px 14px',
                      borderRadius: 16,
                      border: isSelected ? '1.5px solid var(--text-accent)' : '1px solid var(--border-glass)',
                      background: isSelected ? 'rgba(var(--bg-accent-rgb), 0.08)' : 'var(--bg-glass)',
                      boxShadow: isSelected ? '0 0 30px rgba(var(--bg-accent-rgb), 0.25)' : 'var(--shadow-sm)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <VehicleIcon size={16} className={isSelected ? 'text-lime' : 'text-secondary'} />
                      {isSelected && (
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={10} color="var(--text-on-accent)" strokeWidth={4} />
                        </div>
                      )}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, marginTop: 4, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
                      {v.brand} {v.model}
                    </div>
                    <div className="text-secondary" style={{ fontSize: 10, letterSpacing: '0.3px' }}>
                      {v.number}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!activeSubForVehicle && (
          <div style={{ marginTop: 4, marginBottom: 8 }}>
            <h3 className="text-label text-secondary">
              {(!vehicles || vehicles.length === 0) 
                ? 'No vehicles available' 
                : displayPackages.length > 0 
                  ? `Plans compatible with ${selectedVehicle?.brand} ${selectedVehicle?.model}` 
                  : 'No compatible plans available'
              }
            </h3>
          </div>
        )}

        {activeSubForVehicle && (
          <div className="glass animate-fade-in-up" style={{ padding: 24, borderRadius: 24, border: '1.5px solid var(--border-glass)', marginBottom: 16 }}>
            <div className="flex justify-between items-start" style={{ marginBottom: 20 }}>
              <div>
                <div className="chip chip-lime" style={{ marginBottom: 10 }}>ACTIVE PLAN</div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800 }}>{activeSubForVehicle.package?.name || 'Standard Plan'}</h2>
                <div className="text-body-sm text-secondary" style={{ marginTop: 4 }}>
                  For {activeSubForVehicle.vehicle?.brand} {activeSubForVehicle.vehicle?.model} ({activeSubForVehicle.vehicle?.number})
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-accent)' }}>₹{activeSubForVehicle.amount || activeSubForVehicle.package?.price || 0}</div>
                <div className="text-body-sm text-secondary">/month</div>
              </div>
            </div>
            
            <div className="divider" style={{ margin: '16px 0', opacity: 0.3 }} />
            
            <div className="flex flex-col gap-12" style={{ marginBottom: 24 }}>
              <div className="flex justify-between text-body-sm">
                <span className="text-secondary">Start Date</span>
                <span style={{ fontWeight: 600 }}>{new Date(activeSubForVehicle.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="flex justify-between text-body-sm">
                <span className="text-secondary">End Date</span>
                <span style={{ fontWeight: 600 }}>{new Date(activeSubForVehicle.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="flex justify-between text-body-sm">
                <span className="text-secondary">Time Slot</span>
                <span style={{ fontWeight: 600 }}>{activeSubForVehicle.slot || 'N/A'}</span>
              </div>
            </div>
            
            <button 
              onClick={() => setExtensionStep(1)} 
              className="btn btn-primary w-full" 
              style={{ padding: 16, borderRadius: 16, fontWeight: 800, fontSize: 16, boxShadow: '0 0 30px rgba(var(--bg-accent-rgb), 0.2)' }}
            >
              Extend Plan
            </button>
          </div>
        )}
        
        {(!vehicles || vehicles.length === 0) && (
          <div className="glass flex flex-col items-center justify-center gap-12" style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Car size={28} className="text-secondary" />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Add a Vehicle</div>
              <p className="text-body-sm text-secondary">Please add a vehicle to your garage to see available subscription plans.</p>
            </div>
            <Link to="/customer/vehicles" className="btn btn-primary mt-8">Add Vehicle</Link>
          </div>
        )}

        {vehicles && vehicles.length > 0 && !activeSubForVehicle && displayPackages.length === 0 && (
          <div className="glass flex flex-col items-center justify-center gap-12" style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Car size={28} className="text-secondary" />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No Compatible Plans</div>
              <p className="text-body-sm text-secondary">There are no active packages matching your selected vehicle ({selectedVehicle?.brand} {selectedVehicle?.model}).</p>
            </div>
          </div>
        )}

        {!activeSubForVehicle && !hasUsedTrial && selectedVehicle && (
          <Link
            to={`/customer/booking?vehicleId=${selectedVehicleId}&trial=true`}
            className="glass animate-fade-in"
            style={{
              padding: 24,
              display: 'block',
              marginBottom: 16,
              border: '1px dashed var(--bg-accent)',
            }}
          >
            <div className="flex justify-between items-start" style={{ marginBottom: 20 }}>
              <div>
                <div className="flex items-center gap-8 mb-4">
                  <Clock size={18} color="var(--text-accent)" />
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>1-Day Trial</h2>
                  <span className="chip chip-lime" style={{ fontSize: 9 }}>NO COMMITMENT</span>
                </div>
                <div className="text-label text-tertiary" style={{ fontSize: 10 }}>Try Cleanzo once before you subscribe</div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-accent)' }}>₹{trialPrice}</div>
                <div className="text-body-sm text-secondary">one-time</div>
              </div>
            </div>

            <button className="btn btn-primary w-full py-16 rounded-2xl shadow-lg shadow-primary/10">
              Try It Out
            </button>
          </Link>
        )}

        {!activeSubForVehicle && displayPackages.map(pkg => {
          const isElite = pkg.name.toLowerCase() === 'elite';
          const pricing = getPackagePricing(pkg, selectedVehicle, discounts);

          const cardContent = (
            <>
              <div className="flex justify-between items-start" style={{ marginBottom: pricing.hasDiscount && pricing.note ? 12 : 20 }}>
                <div>
                  <div className="flex items-center gap-8 mb-4">
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>{pkg.name}</h2>
                    {pkg.popular && <span className="chip chip-lime" style={{ fontSize: 9 }}>Popular</span>}
                  </div>
                  <div className="text-label text-tertiary" style={{ fontSize: 10 }}>{pkg.tier || 'Standard'} Tier</div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  {pricing.hasDiscount && (
                    <div className="flex items-center gap-6" style={{ justifyContent: 'flex-end' }}>
                      <span className="text-body-sm text-secondary" style={{ textDecoration: 'line-through' }}>₹{pricing.originalPrice}</span>
                      <span className="chip chip-lime" style={{ fontSize: 9 }}>{pricing.percent}% OFF</span>
                    </div>
                  )}
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-accent)' }}>₹{pricing.effectivePrice}</div>
                  <div className="text-body-sm text-secondary">/month</div>
                </div>
              </div>

              {pricing.hasDiscount && pricing.note && (
                <div style={{ fontSize: 12, color: 'var(--success)', marginBottom: 16, fontWeight: 600 }}>
                  {pricing.note}
                </div>
              )}

              <div className="flex flex-col gap-10" style={{ marginBottom: 24 }}>
                {(pkg.features || []).slice(0, 4).map((f, i) => (
                  <div key={i} className="flex items-center gap-10 text-body-sm">
                    <Check size={16} className="text-lime" strokeWidth={3} />
                    <span className="text-secondary">{f}</span>
                  </div>
                ))}
              </div>

              <button
                className="btn btn-primary w-full py-16 rounded-2xl shadow-lg shadow-primary/10"
              >
                Get Started with {pkg.name}
              </button>
            </>
          );

          return (
            <Link 
              key={pkg._id} 
              to={`/customer/plan/${pkg._id}?vehicleId=${selectedVehicleId}`} 
              className="glass animate-fade-in"
              style={{ 
                padding: 24, 
                display: 'block', 
                marginBottom: 16,
                border: isElite ? '1px solid var(--bg-accent)' : '1px solid var(--border-glass)',
                boxShadow: isElite ? '0 0 40px rgba(var(--bg-accent-rgb), 0.2)' : 'var(--shadow-sm)'
              }}
            >
              {cardContent}
            </Link>
          );
        })}
      </div>
    </div>
  )
}
