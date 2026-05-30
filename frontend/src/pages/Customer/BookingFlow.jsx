import Skeleton from '../../components/Skeleton'
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Car, CreditCard, ShieldCheck, MapPin, Clock, Info, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import apiClient from '../../services/apiClient'
import { useCustomerData } from '../../context/CustomerDataContext'
import { useLocation } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'

const steps = ['Vehicle', 'Location', 'Plan', 'Confirm']

const isVehicleEligibleForPackage = (vehicle, pkg) => {
  if (!vehicle || !pkg) return false;
  if (pkg.isTrial) return true;

  // Fallback to category check if applicableModels is not defined or empty (legacy support)
  if (!pkg.applicableModels || pkg.applicableModels.length === 0) {
    return vehicle.category === pkg.category;
  }

  const brandMatch = pkg.applicableModels.find(
    app => app.brand.toLowerCase() === vehicle.brand.toLowerCase()
  );

  if (!brandMatch) return false;
  if (!brandMatch.models || brandMatch.models.length === 0) return true;

  return brandMatch.models.some(
    m => m.toLowerCase() === vehicle.model.toLowerCase()
  );
};

const getLocalDateString = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}


export default function BookingFlow() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { theme } = useTheme()
  
  const queryParams = new URLSearchParams(location.search)
  const initialPackageId = queryParams.get('packageId')
  const initialVehicleId = queryParams.get('vehicleId')
  
  const { 
    vehicles, packages, societies, subscriptions: activeSubscriptions, settings,
    loading: dataLoading, refreshAll 
  } = useCustomerData()

  const hasUsedTrial = activeSubscriptions?.some(sub => sub.isTrial);
  
  // Dynamic Trial Price lookup based on selectedVehicle
  const getDynamicTrialPrice = () => {
    if (!selectedVehicle || packages.length === 0) {
      return settings.trialPrice || 30
    }
    
    // Find packages that are active and match the selected vehicle
    const matchedPackages = packages.filter(pkg => 
      pkg.isActive !== false && isVehicleEligibleForPackage(selectedVehicle, pkg)
    )
    
    // 1. Prioritize BASIC tier package matching the vehicle with a trialPrice
    const basicPkg = matchedPackages.find(
      pkg => (pkg.tier || 'BASIC').toUpperCase() === 'BASIC' && pkg.trialPrice !== undefined && pkg.trialPrice !== null
    )
    
    if (basicPkg) {
      return basicPkg.trialPrice
    }
    
    // 2. Fallback to any matched package with a trialPrice
    const anyPkgWithTrial = matchedPackages.find(
      pkg => pkg.trialPrice !== undefined && pkg.trialPrice !== null
    )
    if (anyPkgWithTrial) {
      return anyPkgWithTrial.trialPrice
    }
    
    // 3. Global fallback
    return settings.trialPrice || 30
  }
  
  const [step, setStep] = useState(0)
  const [countdown, setCountdown] = useState(5)

  // Selections
  const [selectedSociety, setSelectedSociety] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [selectedPkg, setSelectedPkg] = useState(null)
  const [selectedTrialDate, setSelectedTrialDate] = useState(null)
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [isPremiumOverride, setIsPremiumOverride] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')

  useEffect(() => {
    if (step === 4 || step === 5) {
      setCountdown(5)
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            navigate('/customer')
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [step, navigate])

  // Handle callback redirect parameters from Razorpay
  useEffect(() => {
    const status = queryParams.get('status')
    const err = queryParams.get('error')
    if (status === 'success') {
      refreshAll()
      setStep(4)
    } else if (status === 'failed') {
      setPaymentError(err || 'Payment failed')
      setStep(5)
    }
  }, [location.search, refreshAll])

  const [razorpayReady, setRazorpayReady] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState('')

  const trialPrice = getDynamicTrialPrice()
  const prioritySlotFee = settings.prioritySlotFee || 99

  // Initial selection logic based on global data
  useEffect(() => {
    if (dataLoading.vehicles || dataLoading.packages || dataLoading.societies) return

    if (societies.length > 0 && !selectedSociety) setSelectedSociety(societies[0])
    
    if (initialPackageId && packages.length > 0 && !selectedPkg) {
      const pkg = packages.find(p => p._id === initialPackageId)
      if (pkg) setSelectedPkg(pkg)
    }
    
    if (vehicles.length > 0 && !selectedVehicle) {
      if (initialVehicleId) {
        const matchingVehicle = vehicles.find(v => v._id === initialVehicleId)
        if (matchingVehicle) {
          setSelectedVehicle(matchingVehicle)
        } else if (initialPackageId) {
          const pkg = packages.find(p => p._id === initialPackageId)
          const eligible = vehicles.find(v => isVehicleEligibleForPackage(v, pkg))
          if (eligible) setSelectedVehicle(eligible)
          else setSelectedVehicle(vehicles[0])
        } else {
          setSelectedVehicle(vehicles[0])
        }
      } else if (initialPackageId) {
        const pkg = packages.find(p => p._id === initialPackageId)
        const eligible = vehicles.find(v => isVehicleEligibleForPackage(v, pkg))
        if (eligible) setSelectedVehicle(eligible)
        else setSelectedVehicle(vehicles[0])
      } else {
        setSelectedVehicle(vehicles[0])
      }
    }
  }, [dataLoading, societies, packages, vehicles, initialPackageId, initialVehicleId, selectedSociety, selectedPkg, selectedVehicle])


    // Load Razorpay script — only enable Pay button after onload fires
    useEffect(() => {
      if (window.Razorpay) {
        setRazorpayReady(true)
        return
      }

      // Check if script is already appended to body to prevent duplicates
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
      if (existingScript) {
        setRazorpayReady(true)
        return
      }

      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.onload = () => setRazorpayReady(true)
      script.onerror = () => setPaymentError('Failed to load payment gateway. Please refresh.')
      document.body.appendChild(script)
    }, [])

  // Calculate pricing
  const basePrice = selectedPkg ? (selectedPkg.isTrial ? trialPrice : selectedPkg.price) : 0
  
  // Selected slot state checks
  const isSelectedSlotUnavailable = selectedSlot
    ? (selectedSlot.status === 'Closed' || selectedSlot.status === 'Blocked' || selectedSlot.currentCount >= selectedSlot.maxVehicles)
    : false;

  // Active override mode: if selected slot is unavailable, or explicit override is set
  const activeOverride = isPremiumOverride || isSelectedSlotUnavailable;

  const priorityFee = (activeOverride && !selectedPkg?.isTrial) ? prioritySlotFee : 0
  let subtotal = basePrice + priorityFee
  
  const hasReferralDiscount = user?.referralDiscount?.isActive && !selectedPkg?.isTrial
  const discountAmount = hasReferralDiscount ? Math.round(subtotal * (user.referralDiscount.percentage / 100)) : 0
  const finalAmount = subtotal - discountAmount

  const handlePayment = async () => {
    if (!selectedPkg || !selectedVehicle || !selectedSociety || !selectedSlot) return
    setProcessing(true)
    setPaymentError('')

    try {
      // 1. Get Razorpay key
      const keyRes = await apiClient.get('/payment/key')
      const razorpayKey = keyRes.key

      // 2. Create Order
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
        overrideReason: activeOverride ? overrideReason : undefined
      })

      const order = orderRes.order

      // 3. Configure Razorpay options
      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: 'Cleanzo',
        description: `${selectedPkg.name} for ${selectedVehicle.model}`,
        order_id: order.id,
        handler: async function (response) {
          try {
            // 4. Verify payment
            await apiClient.post('/payment/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })

            // 5. Create Subscription
            await apiClient.post('/customer/subscriptions', {
              vehicleId: selectedVehicle._id,
              packageId: selectedPkg._id || null,
              isTrial: selectedPkg.isTrial || false,
              societyId: selectedSociety._id,
              slotId: selectedSlot.slotId,
              specialInstructions,
              paymentId: response.razorpay_payment_id,
              startDate: selectedPkg.isTrial ? selectedTrialDate : undefined,
              isPremiumOverride: activeOverride,
              overrideReason: activeOverride ? overrideReason : undefined
            })

            setProcessing(false)
            refreshAll() // Refresh global data to reflect new subscription
            setStep(4)
          } catch (verifyErr) {
            setProcessing(false)
            const errMsg = verifyErr.response?.data?.message || verifyErr.response?.data?.error || verifyErr.message || 'Payment verification or subscription creation failed. Please contact support.'
            setPaymentError(errMsg)
            setStep(5)
          }
        },
        prefill: {
          name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
          contact: (() => {
            if (!user?.phone) return '';
            const digits = user.phone.replace(/\D/g, '');
            return digits.length === 10 ? `+91${digits}` : user.phone.startsWith('+') ? user.phone : `+91${user.phone}`;
          })(),
          email: user?.email || ''
        },
        theme: {
          color: theme === 'light' ? '#0056B3' : '#DFFF00'
        },
        modal: {
          ondismiss: () => setProcessing(false)
        }
      }

      console.log('Opening Razorpay Checkout with options:', {
        key: options.key,
        amount: options.amount,
        currency: options.currency,
        order_id: options.order_id,
        prefill: options.prefill,
        theme: options.theme
      });

      // 4. Open Razorpay checkout — rzp.open() is non-blocking, do NOT put setProcessing(false)
      // in a finally block here; the modal handlers above manage it instead
      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response) {
        setProcessing(false)
        setPaymentError(`Payment failed: ${response.error.description}`)
        setStep(5)
      })
      rzp.open()

    } catch (err) {
      setProcessing(false)
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to initiate payment. Please try again.'
      setPaymentError(errMsg)
      setStep(5)
    }
  }

  const isLoading = dataLoading.vehicles || dataLoading.packages || dataLoading.societies || dataLoading.subscriptions || dataLoading.settings
  
  if (isLoading) return (
    <div className="app-shell">
      <div className="app-header" style={{ padding: '16px var(--margin-side)', background: 'transparent', position: 'relative' }}>
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 14 }} />
        <div className="skeleton" style={{ width: 140, height: 24, borderRadius: 8 }} />
        <div style={{ width: 40 }} />
      </div>
      <div className="container" style={{ padding: '0 20px' }}>
        {/* Step indicator skeleton */}
        <div className="flex items-center gap-12" style={{ margin: '12px 0 32px' }}>
          {[1, 2, 3, 4].map(i => (
             <div key={i} className="flex items-center gap-12" style={{ flex: i < 4 ? 1 : 'none' }}>
                <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 12 }} />
                {i < 4 && <div className="skeleton" style={{ flex: 1, height: 3, borderRadius: 4 }} />}
             </div>
          ))}
        </div>
        
        <div className="flex flex-col gap-24">
           <div>
              <div className="skeleton" style={{ width: 150, height: 24, borderRadius: 8, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: 220, height: 16, borderRadius: 6 }} />
           </div>
           
           <div className="flex flex-col gap-14">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, borderRadius: 24 }}>
                   <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0 }} />
                   <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ width: 120, height: 18, borderRadius: 6, marginBottom: 8 }} />
                      <div className="skeleton" style={{ width: 180, height: 14, borderRadius: 6 }} />
                   </div>
                </div>
              ))}
           </div>
           
           <div className="skeleton" style={{ height: 56, borderRadius: 18, marginTop: 12 }} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="app-shell animate-fade-in" style={{ paddingBottom: 120 }}>
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
          {/* Animated Spinner */}
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

      {step < 4 && (
        <div className="app-header" style={{ background: 'transparent', border: 'none', position: 'relative' }}>
          <button onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)} className="btn-icon glass" style={{ borderRadius: 14 }}>
            <ArrowLeft size={20} />
          </button>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>Secure Booking</span>
          <div style={{ width: 40 }} />
        </div>
      )}

      <div className="container">
        {/* Step indicator */}
        {step < 4 && (
          <div className="flex items-center gap-12" style={{ margin: '12px 0 32px' }}>
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-12" style={{ flex: i < steps.length - 1 ? 1 : 'none' }}>
                <div style={{ 
                  width: 32, height: 32, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, fontFamily: 'var(--font-display)',
                  background: i <= step ? 'var(--bg-accent)' : 'var(--bg-glass)', 
                  color: i <= step ? 'var(--text-on-accent)' : 'var(--text-tertiary)', 
                  border: `1px solid ${i <= step ? 'transparent' : 'var(--border-glass)'}`,
                  boxShadow: i === step ? '0 0 30px rgba(var(--bg-accent-rgb), 0.25)' : 'none',
                  transition: 'all 0.4s var(--ease-out)'
                }}>
                  {i < step ? <Check size={16} strokeWidth={3} /> : i + 1}
                </div>
                {i < steps.length - 1 && <div style={{ flex: 1, height: 3, background: i < step ? 'var(--bg-accent)' : 'var(--divider)', borderRadius: 4 }} />}
              </div>
            ))}
          </div>
        )}

        {/* Step 0: Vehicle */}
        {step === 0 && (
          <div className="flex flex-col gap-20 animate-fade-in-up">
            <div style={{ marginBottom: 12 }}>
              <h3 className="text-headline-sm" style={{ marginBottom: 6 }}>Select Vehicle</h3>
              <p className="text-secondary text-body-sm">Which one shall we clean today?</p>
            </div>
            {vehicles.length === 0 ? (
              <div className="glass" style={{ padding: 48, textAlign: 'center', borderRadius: 32 }}>
                <div style={{ width: 80, height: 80, background: 'rgba(255,255,255,0.03)', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <Car size={40} className="text-tertiary" />
                </div>
                <p className="text-secondary mb-24 font-medium">No vehicles found in your profile.</p>
                <button className="btn btn-primary w-full" style={{ borderRadius: 16, padding: 18 }} onClick={() => navigate('/customer/profile')}>Add Your First Vehicle</button>
              </div>
            ) : selectedPkg && vehicles.filter(v => isVehicleEligibleForPackage(v, selectedPkg)).length === 0 ? (
              <div className="glass" style={{ padding: '48px 40px', textAlign: 'center', borderRadius: 32 }}>
                <div style={{ width: 80, height: 80, background: 'rgba(255,50,50,0.05)', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'var(--error)' }}>
                  <Car size={36} />
                </div>
                <h4 style={{ marginBottom: 12, fontWeight: 700, fontSize: 24 }}>Ineligible Vehicle</h4>
                <p className="text-secondary text-body-sm" style={{ marginBottom: 32, lineHeight: 1.6 }}>
                  This plan is not applicable to any of your vehicles.
                </p>
                <div className="flex flex-col gap-12">
                  <button className="btn btn-ghost w-full" style={{ padding: 16, borderRadius: 16 }} onClick={() => setSelectedPkg(null)}>Choose Different Plan</button>
                  <button className="btn btn-primary w-full" style={{ padding: 18, borderRadius: 18, fontWeight: 700 }} onClick={() => navigate('/customer/profile')}>Add Eligible Vehicle</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-14">
                {(selectedPkg ? vehicles.filter(v => isVehicleEligibleForPackage(v, selectedPkg)) : vehicles).map((v, i) => {
                  const hasSub = activeSubscriptions.some(s => s.vehicle?._id === v._id && s.status === 'Active');
                  const isSelected = selectedVehicle?._id === v._id;
                  return (
                    <button key={v._id} disabled={hasSub} className="glass" onClick={() => setSelectedVehicle(v)}
                      style={{ 
                        padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left', 
                        borderColor: isSelected ? 'var(--text-accent)' : 'var(--border-glass)', 
                        opacity: hasSub ? 0.5 : 1,
                        background: isSelected ? 'rgba(var(--bg-accent-rgb), 0.05)' : 'var(--bg-glass)',
                        borderRadius: 24,
                        animationDelay: `${i * 100}ms`
                      }}>
                      <div style={{ width: 48, height: 48, background: isSelected ? 'var(--bg-accent)' : 'rgba(255,255,255,0.05)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                        <Car size={24} color={isSelected ? 'var(--text-on-accent)' : 'var(--text-secondary)'} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 17 }}>{v.brand} {v.model}</div>
                        <div className="text-body-sm text-secondary font-medium">{v.number}</div>
                      </div>
                      {hasSub ? (
                        <span className="chip chip-ghost" style={{ fontSize: 9 }}>Subscribed</span>
                      ) : isSelected && (
                        <div style={{ width: 24, height: 24, background: 'var(--bg-accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={14} color="var(--text-on-accent)" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  )
                })}
                <button disabled={!selectedVehicle} className="btn btn-primary w-full" style={{ marginTop: 32, padding: 18, borderRadius: 18, fontWeight: 800, fontSize: 16, boxShadow: selectedVehicle ? '0 0 30px rgba(var(--bg-accent-rgb), 0.25)' : 'none' }} onClick={() => setStep(1)}>
                  Continue to Location
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Location & Slot */}
        {step === 1 && (
          <div className="flex flex-col gap-24 animate-fade-in-up">
            <div>
              <h3 className="text-headline-sm" style={{ marginBottom: 4 }}>Service Location</h3>
              <p className="text-secondary text-body-sm">Where and when should we arrive?</p>
            </div>

            {/* Society — read-only, auto-selected at registration */}
            <div className="flex flex-col gap-12">
              <label className="text-label" style={{ paddingLeft: 8, color: 'var(--text-tertiary)' }}>Your Society</label>
              <div className="glass" style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16, borderRadius: 20, border: '1px solid var(--text-accent)', background: 'rgba(var(--bg-accent-rgb), 0.04)' }}>
                <MapPin size={20} style={{ color: 'var(--text-accent)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{selectedSociety?.name}</div>
                  <div className="text-body-sm text-secondary">{selectedSociety?.city}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-accent)', background: 'rgba(var(--bg-accent-rgb), 0.1)', padding: '3px 10px', borderRadius: 8 }}>YOUR LOCATION</span>
              </div>
            </div>

            {selectedSociety && (
              <div className="flex flex-col gap-12 animate-slide-up">
                <label className="text-label" style={{ paddingLeft: 8, color: 'var(--text-tertiary)' }}>Select Time Slot</label>
                
                {(() => {
                  const allSlotsUnavailable = selectedSociety?.slots?.every(s => 
                    s.status === 'Closed' || s.status === 'Blocked' || s.currentCount >= s.maxVehicles
                  );
                  return allSlotsUnavailable ? (
                    <div className="glass animate-slide-up" style={{ 
                      padding: '18px 24px', 
                      borderRadius: 20, 
                      border: '1.5px solid rgba(255, 149, 0, 0.3)', 
                      background: 'rgba(255, 149, 0, 0.04)', 
                      color: '#FF9500',
                      marginBottom: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}>
                      <div className="flex items-center gap-10">
                        <span style={{ fontSize: 20 }}>✨</span>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>Premium Priority Booking Active</div>
                      </div>
                      <p style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.4 }}>
                        Standard slots for your society are currently fully booked, closed, or blocked. You can still schedule your service using our Premium Priority Override by paying a convenience surcharge of <b>₹{prioritySlotFee}</b>.
                      </p>
                    </div>
                  ) : null;
                })()}

                <div className="flex flex-col gap-12">
                  {selectedSociety.slots.map(s => {
                    const isFull = s.currentCount >= s.maxVehicles;
                    const isClosed = s.status === 'Closed';
                    const isBlocked = s.status === 'Blocked';
                    const isUnavailable = isFull || isClosed || isBlocked;
                    const isSelected = selectedSlot?.slotId === s.slotId;
                    
                    let badgeText = "AVAILABLE";
                    let badgeColor = "var(--success)";
                    let badgeBg = "rgba(50,215,75,0.1)";
                    if (isClosed) {
                      badgeText = "CLOSED";
                      badgeColor = "var(--error)";
                      badgeBg = "rgba(255,69,58,0.1)";
                    } else if (isBlocked) {
                      badgeText = "BLOCKED";
                      badgeColor = "var(--text-tertiary)";
                      badgeBg = "var(--border-glass)";
                    } else if (isFull) {
                      badgeText = "FULL (PRIORITY)";
                      badgeColor = "#FF9500";
                      badgeBg = "rgba(255, 149, 0, 0.1)";
                    }

                    return (
                      <button key={s.slotId} className="glass" 
                        onClick={() => {
                          setSelectedSlot(s);
                          if (isUnavailable) {
                            setIsPremiumOverride(true);
                          } else {
                            setIsPremiumOverride(false);
                          }
                        }}
                        style={{ 
                          padding: '20px 24px', display: 'flex', flexDirection: 'column', textAlign: 'left', 
                          borderColor: isSelected ? (isUnavailable ? '#FF9500' : 'var(--text-accent)') : 'var(--border-glass)',
                          borderRadius: 20,
                          background: isSelected ? (isUnavailable ? 'rgba(255, 149, 0, 0.04)' : 'rgba(var(--bg-accent-rgb), 0.05)') : 'var(--bg-glass)',
                          transition: 'all 0.25s'
                        }}>
                        <div className="flex justify-between w-full items-center">
                          <div className="flex items-center gap-10">
                            <Clock size={18} style={{ color: isSelected ? (isUnavailable ? '#FF9500' : 'var(--text-accent)') : 'var(--text-tertiary)' }} />
                            <span style={{ fontWeight: 700 }}>{s.timeWindow}</span>
                          </div>
                          <span style={{ fontSize: 9, fontWeight: 800, color: badgeColor, background: badgeBg, padding: '4px 10px', borderRadius: 8, letterSpacing: '0.05em' }}>
                            {badgeText}
                          </span>
                        </div>
                        {isUnavailable && (
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 10, paddingLeft: 28, lineHeight: 1.4 }}>
                            This slot is reserved for <b>Premium Override Bookings</b>. A surcharge of <b>₹{prioritySlotFee}</b> applies.
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {activeOverride && (
              <div className="glass animate-slide-up flex flex-col gap-8" style={{ padding: '20px 24px', borderRadius: 20, border: '1.5px solid rgba(255, 149, 0, 0.3)', background: 'rgba(255, 149, 0, 0.01)', marginTop: 8 }}>
                <label className="text-label" style={{ color: '#FF9500', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
                  <span>✨</span> PRIORITY BOOKING REASON *
                </label>
                <textarea 
                  required 
                  className="input-field" 
                  style={{ minHeight: 80, padding: 12, borderColor: overrideReason.trim() ? 'var(--border-glass)' : 'rgba(255, 149, 0, 0.3)' }} 
                  value={overrideReason} 
                  onChange={e => setOverrideReason(e.target.value)} 
                  placeholder="Please specify why you need priority booking (e.g. urgent on-demand cleaning, strict timing, morning office rush)..." 
                />
              </div>
            )}

            <div className="flex gap-12 mt-12">
              <button className="btn btn-ghost" style={{ flex: 1, borderRadius: 16 }} onClick={() => setStep(0)}>Back</button>
              <button disabled={!selectedSociety || !selectedSlot || (activeOverride && !overrideReason.trim())} className="btn btn-primary" style={{ flex: 2, borderRadius: 18, fontWeight: 800 }} onClick={() => setStep(2)}>Continue to Plans</button>
            </div>
          </div>
        )}

        {/* Step 2: Plan */}
        {step === 2 && (
          <div className="flex flex-col gap-24 animate-fade-in-up">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-headline-sm" style={{ marginBottom: 4 }}>Choose Plan</h3>
                <p className="text-secondary text-body-sm">Best for your <span style={{ color: 'var(--text-accent)', fontWeight: 700 }}>{selectedVehicle?.brand} {selectedVehicle?.model}</span></p>
              </div>
            </div>
            
            <div className="flex flex-col gap-16">
              {packages.filter(p => isVehicleEligibleForPackage(selectedVehicle, p)).length === 0 && (
                <div className="glass" style={{ padding: 32, textAlign: 'center', borderRadius: 24, border: '1px solid var(--border-glass)' }}>
                  <p className="text-secondary text-body-sm" style={{ marginBottom: 8 }}>No plans available for your vehicle model yet.</p>
                  <p className="text-secondary" style={{ fontSize: 12 }}>
                    {hasUsedTrial ? 'Please contact support.' : 'Try the Trial below, or contact support.'}
                  </p>
                </div>
              )}
              {packages.filter(p => isVehicleEligibleForPackage(selectedVehicle, p)).map((p, i) => {
                const isSelected = selectedPkg?._id === p._id;
                return (
                  <button key={p._id} className="glass" onClick={() => setSelectedPkg(p)}
                    style={{ 
                      padding: '24px', display: 'flex', flexDirection: 'column', textAlign: 'left', 
                      borderColor: isSelected ? 'var(--text-accent)' : 'var(--border-glass)',
                      borderRadius: 28,
                      background: isSelected ? 'rgba(var(--bg-accent-rgb), 0.05)' : 'var(--bg-glass)',
                      boxShadow: isSelected ? '0 0 30px rgba(var(--bg-accent-rgb), 0.25)' : 'none',
                      animationDelay: `${i * 100}ms`
                    }}>
                    <div className="flex justify-between items-start mb-16">
                      <div>
                        <div className="flex items-center gap-8" style={{ marginBottom: 10 }}>
                          <h4 style={{ fontSize: 20, fontWeight: 800 }}>{p.name}</h4>
                          {p.popular && <span className="chip chip-lime" style={{ fontSize: 9 }}>BEST VALUE</span>}
                        </div>
                        <div className="flex flex-wrap gap-6">
                           {p.features?.slice(0, 3).map((f, idx) => (
                             <span key={idx} style={{ fontSize: 10, color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 6 }}>{f}</span>
                           ))}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                         <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24 }}>₹{p.price}</div>
                         <div className="text-label" style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>PER MONTH</div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="animate-slide-up" style={{ marginTop: 20, background: 'rgba(var(--bg-accent-rgb), 0.1)', padding: '12px 16px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Check size={16} color="var(--text-accent)" strokeWidth={3} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-accent)' }}>Great choice! This plan covers all essentials.</span>
                      </div>
                    )}
                  </button>
                )
              })}

              {!hasUsedTrial && (
                <>
                  <div className="divider" style={{ margin: '8px 0' }} />
                  
                  <button className="glass" onClick={() => {
                    const trialPkg = { isTrial: true, name: '1-Day Trial', price: trialPrice, _id: null }
                    setSelectedPkg(trialPkg)
                    // Pre-select tomorrow's date
                    const tomorrow = new Date()
                    tomorrow.setDate(tomorrow.getDate() + 1)
                    setSelectedTrialDate(getLocalDateString(tomorrow))
                  }}
                    style={{ 
                      padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                      borderRadius: 20, borderColor: selectedPkg?.isTrial ? 'var(--text-accent)' : 'var(--border-glass)',
                      background: selectedPkg?.isTrial ? 'rgba(var(--bg-accent-rgb), 0.05)' : 'transparent'
                    }}>
                    <div className="flex items-center gap-12">
                       <div style={{ width: 40, height: 40, background: 'rgba(var(--bg-accent-rgb), 0.1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Clock size={20} color="var(--text-accent)" />
                       </div>
                       <div>
                        <div style={{ fontWeight: 800 }}>1-Day Trial</div>
                        <div className="text-body-sm text-secondary">Experience Cleanzo once</div>
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>₹{trialPrice}</span>
                  </button>
                </>
              )}

              {selectedPkg?.isTrial && (
                <>
                  <div className="animate-slide-up" style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <label className="text-label" style={{ paddingLeft: 8, color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 700 }}>SELECT TRIAL DATE</label>
                    <div className="flex gap-12">
                      {(() => {
                        const today = new Date()

                        const tomorrow = new Date()
                        tomorrow.setDate(today.getDate() + 1)
                        const tomorrowVal = getLocalDateString(tomorrow)
                        const tomorrowStr = tomorrow.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

                        const dayAfter = new Date()
                        dayAfter.setDate(today.getDate() + 2)
                        const dayAfterVal = getLocalDateString(dayAfter)
                        const dayAfterStr = dayAfter.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

                        return [
                          { label: 'Tomorrow', dateStr: tomorrowStr, value: tomorrowVal },
                          { label: 'Day After', dateStr: dayAfterStr, value: dayAfterVal }
                        ].map((opt) => {
                          const isDateSelected = selectedTrialDate === opt.value
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setSelectedTrialDate(opt.value)}
                              className="glass animate-fade-in"
                              style={{
                                flex: 1,
                                padding: '16px',
                                borderRadius: 16,
                                textAlign: 'center',
                                borderColor: isDateSelected ? 'var(--text-accent)' : 'var(--border-glass)',
                                background: isDateSelected ? 'rgba(var(--bg-accent-rgb), 0.08)' : 'var(--bg-glass)',
                                boxShadow: isDateSelected ? '0 0 30px rgba(var(--bg-accent-rgb), 0.25)' : 'none',
                                transition: 'all 0.3s'
                              }}
                            >
                              <div style={{ fontWeight: 800, fontSize: 14, color: isDateSelected ? 'var(--text-accent)' : 'var(--text-primary)' }}>{opt.label}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{opt.dateStr}</div>
                            </button>
                          )
                        })
                      })()}
                    </div>
                  </div>

                  {/* Time slot picker — appears after date is chosen */}
                  {selectedTrialDate && selectedSociety && (
                    <div className="animate-slide-up flex flex-col gap-12" style={{ marginTop: 4 }}>
                      <label className="text-label" style={{ paddingLeft: 8, color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 700 }}>SELECT TIME SLOT</label>
                      
                      {(() => {
                        const allSlotsUnavailable = selectedSociety?.slots?.every(s => 
                          s.status === 'Closed' || s.status === 'Blocked' || s.currentCount >= s.maxVehicles
                        );
                        return allSlotsUnavailable ? (
                          <div className="glass animate-slide-up" style={{ 
                            padding: '14px 18px', 
                            borderRadius: 16, 
                            border: '1px solid rgba(255, 149, 0, 0.3)', 
                            background: 'rgba(255, 149, 0, 0.04)', 
                            color: '#FF9500',
                            marginBottom: 8,
                            fontSize: 12,
                            lineHeight: 1.4
                          }}>
                            Standard trial slots are currently full or restricted. Premium priority override pricing applies.
                          </div>
                        ) : null;
                      })()}

                      <div className="flex flex-col gap-10">
                        {selectedSociety.slots.map(s => {
                          const isFull = s.currentCount >= s.maxVehicles;
                          const isClosed = s.status === 'Closed';
                          const isBlocked = s.status === 'Blocked';
                          const isUnavailable = isFull || isClosed || isBlocked;
                          const isSelected = selectedSlot?.slotId === s.slotId;
                          
                          let badgeText = "AVAILABLE";
                          let badgeColor = "var(--success)";
                          let badgeBg = "rgba(50,215,75,0.1)";
                          if (isClosed) {
                            badgeText = "CLOSED";
                            badgeColor = "var(--error)";
                            badgeBg = "rgba(255,69,58,0.1)";
                          } else if (isBlocked) {
                            badgeText = "BLOCKED";
                            badgeColor = "var(--text-tertiary)";
                            badgeBg = "var(--border-glass)";
                          } else if (isFull) {
                            badgeText = "FULL (PRIORITY)";
                            badgeColor = "#FF9500";
                            badgeBg = "rgba(255, 149, 0, 0.1)";
                          }

                          return (
                            <button key={s.slotId} className="glass" 
                              onClick={() => {
                                setSelectedSlot(s);
                                if (isUnavailable) {
                                  setIsPremiumOverride(true);
                                } else {
                                  setIsPremiumOverride(false);
                                }
                              }}
                              style={{
                                padding: '16px 20px', display: 'flex', flexDirection: 'column', textAlign: 'left',
                                borderColor: isSelected ? (isUnavailable ? '#FF9500' : 'var(--bg-accent)') : 'var(--border-glass)',
                                borderRadius: 16,
                                background: isSelected ? (isUnavailable ? 'rgba(255, 149, 0, 0.04)' : 'rgba(var(--bg-accent-rgb), 0.05)') : 'var(--bg-glass)',
                                transition: 'all 0.25s'
                              }}>
                              <div className="flex justify-between w-full items-center">
                                <div className="flex items-center gap-10">
                                  <Clock size={16} style={{ color: isSelected ? (isUnavailable ? '#FF9500' : 'var(--bg-accent)') : 'var(--text-tertiary)' }} />
                                  <span style={{ fontWeight: 700, fontSize: 14 }}>{s.timeWindow}</span>
                                </div>
                                <span style={{ fontSize: 9, fontWeight: 800, color: badgeColor, background: badgeBg, padding: '4px 10px', borderRadius: 8, letterSpacing: '0.05em' }}>
                                  {badgeText}
                                </span>
                              </div>
                              {isUnavailable && (
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, paddingLeft: 26, lineHeight: 1.4 }}>
                                  Override booking applies — a surcharge of <b>₹{prioritySlotFee}</b> will be added.
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {selectedPkg?.isTrial && activeOverride && (
              <div className="glass animate-slide-up flex flex-col gap-8" style={{ padding: '16px 20px', borderRadius: 16, border: '1px solid rgba(255, 149, 0, 0.3)', background: 'rgba(255, 149, 0, 0.01)', marginTop: 8 }}>
                <label className="text-label" style={{ color: '#FF9500', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700 }}>
                  ✨ TRIAL PRIORITY BOOKING REASON *
                </label>
                <textarea 
                  required 
                  className="input-field" 
                  style={{ minHeight: 60, padding: 10, fontSize: 13, borderColor: overrideReason.trim() ? 'var(--border-glass)' : 'rgba(255, 149, 0, 0.3)' }} 
                  value={overrideReason} 
                  onChange={e => setOverrideReason(e.target.value)} 
                  placeholder="Why do you require priority booking for your trial?" 
                />
              </div>
            )}

            <div className="flex gap-12 mt-4">
              <button className="btn btn-ghost" style={{ flex: 1, borderRadius: 16 }} onClick={() => setStep(1)}>Back</button>
              <button
                disabled={!selectedPkg || (selectedPkg?.isTrial && (!selectedTrialDate || !selectedSlot)) || (selectedPkg?.isTrial && activeOverride && !overrideReason.trim())}
                className="btn btn-primary"
                style={{ flex: 2, borderRadius: 18, fontWeight: 800 }}
                onClick={() => setStep(3)}
              >
                Final Confirmation
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="flex flex-col gap-32 animate-fade-in-up">
            <div>
              <h3 className="text-headline-sm" style={{ marginBottom: 6 }}>Booking Summary</h3>
              <p className="text-secondary text-body-sm">Review your selection before payment</p>
            </div>
            
            <div className="glass" style={{ padding: '24px', borderRadius: 32, border: '1px solid var(--border-glass)' }}>
              <div className="flex flex-col gap-16">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-label" style={{ color: 'var(--text-tertiary)', marginBottom: 4, fontSize: 10 }}>VEHICLE</div>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{selectedVehicle?.brand} {selectedVehicle?.model}</div>
                    <div className="text-body-sm text-secondary">{selectedVehicle?.number}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="text-label" style={{ color: 'var(--text-tertiary)', marginBottom: 4, fontSize: 10 }}>PLAN</div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-accent)' }}>{selectedPkg?.name}</div>
                    <div className="text-body-sm text-secondary">{selectedPkg?.isTrial ? 'Trial Session' : 'Monthly'}</div>
                  </div>
                </div>
                
                <div className="divider" style={{ opacity: 0.3 }} />
                
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-label" style={{ color: 'var(--text-tertiary)', marginBottom: 4, fontSize: 10 }}>LOCATION & SLOT</div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedSociety?.name}</div>
                    <div className="text-body-sm text-secondary flex items-center gap-6 mt-4">
                      <Clock size={12} /> {selectedSlot?.timeWindow}
                    </div>
                  </div>
                  {selectedPkg?.isTrial && selectedTrialDate && (
                    <div style={{ textAlign: 'right' }}>
                      <div className="text-label" style={{ color: 'var(--text-tertiary)', marginBottom: 4, fontSize: 10 }}>TRIAL DATE</div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-accent)' }}>
                        {(() => {
                          const [year, month, day] = selectedTrialDate.split('-')
                          const d = new Date(year, month - 1, day)
                          return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                <div className="divider" style={{ opacity: 0.3 }} />
                
                <div className="flex flex-col gap-10">
                  <div className="flex justify-between text-body-sm">
                    <span className="text-secondary">Base Price</span>
                    <span style={{ fontWeight: 700 }}>₹{basePrice}</span>
                  </div>
                  {priorityFee > 0 && (
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between text-body-sm" style={{ color: '#FF9500' }}>
                        <span>Premium Priority Fee</span>
                        <span style={{ fontWeight: 700 }}>+₹{priorityFee}</span>
                      </div>
                      {overrideReason && (
                        <span className="text-[11px]" style={{ color: '#FF9500', fontStyle: 'italic', paddingLeft: 8, lineHeight: 1.3 }}>
                          Priority Reason: "{overrideReason}"
                        </span>
                      )}
                    </div>
                  )}
                  {hasReferralDiscount && (
                    <div className="flex justify-between text-body-sm" style={{ color: 'var(--success)' }}>
                      <span>Referral Discount</span>
                      <span style={{ fontWeight: 700 }}>-₹{discountAmount}</span>
                    </div>
                  )}
                </div>

                <div className="divider" style={{ opacity: 0.5 }} />
                
                <div className="flex justify-between items-center">
                  <span style={{ fontWeight: 800, fontSize: 20 }}>Total Amount</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, color: 'var(--text-accent)' }}>₹{finalAmount}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-14">
              <label className="text-label" style={{ paddingLeft: 8, color: 'var(--text-tertiary)', fontSize: 10 }}>SPECIAL INSTRUCTIONS</label>
              <textarea 
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="e.g. Key is with security, Parked at B-12"
                className="glass"
                style={{ width: '100%', padding: '20px 24px', borderRadius: 24, minHeight: 120, fontSize: 16, border: '1px solid var(--divider)' }}
              />
            </div>

            <div className="glass" style={{ padding: '20px 28px', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 16, border: '1px solid rgba(50,215,75,0.2)' }}>
              <div style={{ width: 44, height: 44, background: 'rgba(50,215,75,0.1)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={24} color="var(--success)" />
              </div>
              <span className="text-body-sm text-secondary font-medium leading-relaxed">Secured payment via Razorpay. Your transaction is encrypted & 100% safe.</span>
            </div>

            {paymentError && (
              <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginTop: 8, fontSize: 14 }}>
                {paymentError}
              </div>
            )}
            <div className="flex gap-16" style={{ marginTop: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1, borderRadius: 20, padding: 20 }} onClick={() => setStep(2)}>Back</button>
              <button disabled={processing || !razorpayReady} className="btn btn-primary" style={{ flex: 2, borderRadius: 24, fontWeight: 800, fontSize: 20, padding: 22, boxShadow: '0 0 30px rgba(var(--bg-accent-rgb), 0.25)' }} onClick={handlePayment}>
                {processing ? 'Processing…' : !razorpayReady ? 'Loading…' : `Pay ₹${finalAmount}`}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Payment Successful */}
        {step === 4 && (
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
                Payment Successful!
              </h2>
              <p className="text-secondary text-body-md" style={{ maxWidth: 360, margin: '0 auto' }}>
                Your service booking has been confirmed and subscription is now active.
              </p>
            </div>

            <div className="glass" style={{ padding: '16px 24px', borderRadius: 16, border: '1px solid var(--border-glass)', width: '100%' }}>
              <p className="text-secondary text-body-sm">
                Redirecting to dashboard in <span style={{ color: 'var(--text-accent)', fontWeight: 800 }}>{countdown}s</span>...
              </p>
            </div>

            <button 
              className="btn btn-primary w-full" 
              style={{ borderRadius: 18, padding: 18, fontWeight: 800 }}
              onClick={() => navigate('/customer')}
            >
              Go to Homepage
            </button>
          </div>
        )}

        {/* Step 5: Payment Failed */}
        {step === 5 && (
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

            <div className="glass" style={{ padding: '16px 24px', borderRadius: 16, border: '1px solid var(--border-glass)', width: '100%' }}>
              <p className="text-secondary text-body-sm">
                Redirecting to dashboard in <span style={{ color: 'var(--text-accent)', fontWeight: 800 }}>{countdown}s</span>...
              </p>
            </div>

            <button 
              className="btn btn-primary w-full" 
              style={{ borderRadius: 18, padding: 18, fontWeight: 800 }}
              onClick={() => navigate('/customer')}
            >
              Go to Homepage
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
