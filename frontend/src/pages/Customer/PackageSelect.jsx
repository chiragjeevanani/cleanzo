import PageLoader from '../../components/PageLoader'
import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Check, ArrowRight, ChevronRight, Car, X } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useCustomerData } from '../../context/CustomerDataContext'

export default function PackageSelect() {
  const { packages, subscriptions, vehicles, loading: dataLoading, refreshAll } = useCustomerData()
  const navigate = useNavigate()
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const [selectedVehicleId, setSelectedVehicleId] = useState(null)

  const activeSub = (subscriptions || []).find(s => s.status === 'Active') || null
  const activeSubForVehicle = (subscriptions || []).find(s => s.status === 'Active' && s.vehicle?._id === selectedVehicleId) || null

  const loading = dataLoading.packages || dataLoading.subscriptions
  const error = '' // Handled by global context if needed

  const [extensionStep, setExtensionStep] = useState(0)
  const [countdown, setCountdown] = useState(5)
  const [razorpayReady, setRazorpayReady] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState('')

  // Pre-select vehicle and open extension flow if navigated from Subscription Detail page
  useEffect(() => {
    const initialVehicleId = queryParams.get('vehicleId')
    const initialExtend = queryParams.get('extend')
    if (initialExtend === 'true' && initialVehicleId) {
      setSelectedVehicleId(initialVehicleId)
      setExtensionStep(1)
    }
  }, [location.search])

  // Handle callback redirect parameters from Razorpay
  useEffect(() => {
    const status = queryParams.get('status')
    const extended = queryParams.get('extended')
    const err = queryParams.get('error')
    
    if (extended === 'true') {
      if (status === 'success') {
        refreshAll()
        setExtensionStep(3) // Success screen
      } else if (status === 'failed') {
        setPaymentError(err || 'Payment failed')
        setExtensionStep(4) // Failed screen
      }
    }
  }, [location.search, refreshAll])

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

  // Load Razorpay script
  useEffect(() => {
    if (window.Razorpay) {
      setRazorpayReady(true)
      return
    }
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

  const handleExtensionPayment = async () => {
    if (!activeSubForVehicle) return
    setProcessing(true)
    setPaymentError('')

    try {
      // 1. Get Razorpay key
      const keyRes = await apiClient.get('/payment/key')
      const razorpayKey = keyRes.key

      const amount = activeSubForVehicle.package?.price || activeSubForVehicle.amount;

      // 2. Create Order
      const orderRes = await apiClient.post('/payment/create-order', {
        amount,
        currency: 'INR',
        packageId: activeSubForVehicle.package?._id,
        vehicleId: activeSubForVehicle.vehicle?._id,
        societyId: activeSubForVehicle.society?._id || activeSubForVehicle.society,
        slotId: activeSubForVehicle.slot,
        type: 'extension',
        subscriptionId: activeSubForVehicle._id,
        frontendOrigin: window.location.origin,
      })

      const order = orderRes.order

      // 3. Configure Razorpay options
      const _apiBase = import.meta.env.VITE_API_URL || ''
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: 'Cleanzo',
        description: `Plan Extension for ${activeSubForVehicle.vehicle?.model}`,
        order_id: order.id,
        // On mobile, we ALWAYS set redirect: true to avoid popup blockers and iframe issues.
        // On desktop, we use redirect if the API is HTTPS, otherwise we use the inline handler.
        ...((isMobile || _apiBase.startsWith('https://')) ? {
          redirect: true,
          callback_url: `${_apiBase}/payment/callback`,
        } : {}),
        handler: async function (response) {
          try {
            // 4. Verify payment
            await apiClient.post('/payment/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })

            // 5. Extend Subscription
            await apiClient.post(`/customer/subscriptions/${activeSubForVehicle._id}/extend`, {
              paymentId: response.razorpay_payment_id
            })

            setProcessing(false)
            refreshAll()
            setExtensionStep(3)
          } catch (verifyErr) {
            setProcessing(false)
            const errMsg = verifyErr.response?.data?.message || verifyErr.response?.data?.error || verifyErr.message || 'Payment verification or plan extension failed.'
            setPaymentError(errMsg)
            setExtensionStep(4)
          }
        },
        prefill: {
          name: activeSubForVehicle.customer?.firstName ? `${activeSubForVehicle.customer.firstName} ${activeSubForVehicle.customer.lastName || ''}` : '',
          email: activeSubForVehicle.customer?.email || '',
        },
        modal: {
          ondismiss: () => setProcessing(false)
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response) {
        setProcessing(false)
        setPaymentError(`Payment failed: ${response.error.description}`)
        setExtensionStep(4)
      })
      rzp.open()

    } catch (err) {
      setProcessing(false)
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to initiate payment. Please try again.'
      setPaymentError(errMsg)
      setExtensionStep(4)
    }
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

  if (loading) return (
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

  // Filter packages based on the selected vehicle
  const displayPackages = selectedVehicle
    ? packages.filter(pkg => isVehicleEligibleForPackage(selectedVehicle, pkg))
    : [];

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
              <p className="text-secondary text-body-sm">Extend your active wash plan for another 30 days.</p>
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
                    <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-accent)' }}>{activeSubForVehicle?.package?.name}</div>
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
                    <div className="text-body-sm text-secondary">{activeSubForVehicle?.package?.name} Package</div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>
                    ₹{activeSubForVehicle?.package?.price || activeSubForVehicle?.amount}
                  </div>
                </div>

                <div className="divider" style={{ opacity: 0.3 }} />

                <div className="flex justify-between items-center">
                  <span style={{ fontWeight: 800, fontSize: 18 }}>Total Amount</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color: 'var(--text-accent)' }}>
                    ₹{activeSubForVehicle?.package?.price || activeSubForVehicle?.amount}
                  </span>
                </div>
              </div>
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
                disabled={processing || !razorpayReady} 
                className="btn btn-primary" 
                style={{ flex: 2, borderRadius: 20, fontWeight: 800, fontSize: 18, padding: 18, boxShadow: '0 0 30px rgba(var(--bg-accent-rgb), 0.25)' }} 
                onClick={handleExtensionPayment}
              >
                {processing ? 'Processing…' : !razorpayReady ? 'Loading…' : `Pay ₹${activeSubForVehicle?.package?.price || activeSubForVehicle?.amount}`}
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
                Your subscription has been extended successfully. Your wash service days have been increased.
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
                      <Car size={16} className={isSelected ? 'text-lime' : 'text-secondary'} />
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
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-accent)' }}>₹{activeSubForVehicle.package?.price || activeSubForVehicle.amount}</div>
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

        {!activeSubForVehicle && displayPackages.map(pkg => {
          const isElite = pkg.name.toLowerCase() === 'elite';
          
          const cardContent = (
            <>
              <div className="flex justify-between items-start" style={{ marginBottom: 20 }}>
                <div>
                  <div className="flex items-center gap-8 mb-4">
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>{pkg.name}</h2>
                    {pkg.popular && <span className="chip chip-lime" style={{ fontSize: 9 }}>Popular</span>}
                  </div>
                  <div className="text-label text-tertiary" style={{ fontSize: 10 }}>{pkg.tier || 'Standard'} Tier</div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-accent)' }}>₹{pkg.price}</div>
                  <div className="text-body-sm text-secondary">/month</div>
                </div>
              </div>

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
