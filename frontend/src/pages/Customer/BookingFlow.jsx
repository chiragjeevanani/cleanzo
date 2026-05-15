import PageLoader from '../../components/PageLoader'
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Car, CreditCard, ShieldCheck, MapPin, Clock, Info } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import apiClient from '../../services/apiClient'
import { useLocation } from 'react-router-dom'

const steps = ['Vehicle', 'Location', 'Plan', 'Confirm']

export default function BookingFlow() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  
  const queryParams = new URLSearchParams(location.search)
  const initialPackageId = queryParams.get('packageId')
  
  const [step, setStep] = useState(0)
  
  // Data lists
  const [societies, setSocieties] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [packages, setPackages] = useState([])
  const [activeSubscriptions, setActiveSubscriptions] = useState([])
  const [trialPrice, setTrialPrice] = useState(30)
  const [prioritySlotFee, setPrioritySlotFee] = useState(99)
  
  // Selections
  const [selectedSociety, setSelectedSociety] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [selectedPkg, setSelectedPkg] = useState(null) 
  const [specialInstructions, setSpecialInstructions] = useState('')
  
  const [loading, setLoading] = useState(true)
  const [razorpayReady, setRazorpayReady] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sRes, vRes, pRes, subRes, settingsRes] = await Promise.all([
          apiClient.get('/customer/societies'),
          apiClient.get('/customer/vehicles'),
          apiClient.get('/packages'),
          apiClient.get('/customer/subscriptions'),
          apiClient.get('/public/settings'),
        ])
        setSocieties(sRes.societies || [])
        setVehicles(vRes.vehicles || [])
        setPackages(pRes.packages || [])
        setActiveSubscriptions(subRes.subscriptions || [])
        if (settingsRes.trialPrice) setTrialPrice(settingsRes.trialPrice)
        if (settingsRes.prioritySlotFee) setPrioritySlotFee(settingsRes.prioritySlotFee)
        
        if (sRes.societies?.length > 0) setSelectedSociety(sRes.societies[0])
        
        if (initialPackageId && pRes.packages) {
          const pkg = pRes.packages.find(p => p._id === initialPackageId)
          if (pkg) {
            setSelectedPkg(pkg)
            // If package is pre-selected, we still start at step 0 to pick a vehicle,
            // but we'll filter the vehicles there.
          }
        }
        
        if (vRes.vehicles?.length > 0) {
          // If we have a pre-selected package, try to pick the first eligible vehicle
          if (initialPackageId) {
            const pkg = pRes.packages.find(p => p._id === initialPackageId)
            const eligible = vRes.vehicles.find(v => v.category === pkg?.category)
            if (eligible) setSelectedVehicle(eligible)
          } else {
            setSelectedVehicle(vRes.vehicles[0])
          }
        }
      } catch (err) {
        setPaymentError('Failed to load booking data. Please go back and try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()

    // Load Razorpay script — only enable Pay button after onload fires
    if (window.Razorpay) {
      setRazorpayReady(true)
    } else {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.onload = () => setRazorpayReady(true)
      script.onerror = () => setPaymentError('Failed to load payment gateway. Please refresh.')
      document.body.appendChild(script)
      return () => { document.body.removeChild(script) }
    }
  }, [])

  // Calculate pricing
  const basePrice = selectedPkg?.price || 0
  const isSlotFull = selectedSlot ? (selectedSlot.currentCount >= selectedSlot.maxVehicles) : false
  const priorityFee = (isSlotFull && !selectedPkg?.isTrial) ? prioritySlotFee : 0
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
        vehicleId: selectedVehicle._id
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
              paymentId: response.razorpay_payment_id
            })

            navigate('/customer/subscriptions')
          } catch (verifyErr) {
            setProcessing(false)
            setPaymentError('Payment verification or subscription creation failed. Please contact support.')
          }
        },
        prefill: {
          name: user?.name || '',
          contact: user?.phone || '',
          email: user?.email || ''
        },
        theme: {
          color: '#DFFF00'
        },
        modal: {
          ondismiss: () => setProcessing(false)
        }
      }

      // 4. Open Razorpay checkout — rzp.open() is non-blocking, do NOT put setProcessing(false)
      // in a finally block here; the modal handlers above manage it instead
      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response) {
        setProcessing(false)
        setPaymentError(`Payment failed: ${response.error.description}`)
      })
      rzp.open()

    } catch (err) {
      setProcessing(false)
      setPaymentError(err?.message || 'Failed to initiate payment. Please try again.')
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="app-shell animate-fade-in" style={{ paddingBottom: 120 }}>
      <div className="app-header" style={{ background: 'transparent', border: 'none' }}>
        <button onClick={() => step > 0 ? setStep(step - 1) : navigate('/customer')} className="btn-icon glass" style={{ borderRadius: 14 }}>
          <ArrowLeft size={20} />
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>Secure Booking</span>
        <div style={{ width: 40 }} />
      </div>

      <div className="container">
        {/* Step indicator */}
        <div className="flex items-center gap-12" style={{ margin: '12px 0 32px' }}>
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-12" style={{ flex: i < steps.length - 1 ? 1 : 'none' }}>
              <div style={{ 
                width: 32, height: 32, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, fontFamily: 'var(--font-display)',
                background: i <= step ? 'var(--accent-lime)' : 'var(--bg-glass)', 
                color: i <= step ? '#000' : 'var(--text-tertiary)', 
                border: `1px solid ${i <= step ? 'transparent' : 'var(--border-glass)'}`,
                boxShadow: i === step ? 'var(--shadow-glow-lime)' : 'none',
                transition: 'all 0.4s var(--ease-out)'
              }}>
                {i < step ? <Check size={16} strokeWidth={3} /> : i + 1}
              </div>
              {i < steps.length - 1 && <div style={{ flex: 1, height: 3, background: i < step ? 'var(--accent-lime)' : 'var(--divider)', borderRadius: 4 }} />}
            </div>
          ))}
        </div>

        {/* Step 0: Vehicle */}
        {step === 0 && (
          <div className="flex flex-col gap-20 animate-fade-in-up">
            <div>
              <h3 className="text-headline-sm" style={{ marginBottom: 4 }}>Select Vehicle</h3>
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
            ) : selectedPkg && vehicles.filter(v => v.category === selectedPkg.category).length === 0 ? (
              <div className="glass" style={{ padding: 40, textAlign: 'center', borderRadius: 32 }}>
                <div style={{ width: 64, height: 64, background: 'rgba(255,50,50,0.05)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--error)' }}>
                  <Car size={32} />
                </div>
                <h4 style={{ marginBottom: 8, fontWeight: 700 }}>Ineligible Vehicle</h4>
                <p className="text-secondary text-body-sm mb-24">This plan is only for <strong>{selectedPkg.category}</strong>. None of your vehicles match this category.</p>
                <button className="btn btn-ghost w-full mb-12" onClick={() => setSelectedPkg(null)}>Choose Different Plan</button>
                <button className="btn btn-primary w-full" onClick={() => navigate('/customer/vehicles')}>Add {selectedPkg.category}</button>
              </div>
            ) : (
              <div className="flex flex-col gap-14">
                {(selectedPkg ? vehicles.filter(v => v.category === selectedPkg.category) : vehicles).map((v, i) => {
                  const hasSub = activeSubscriptions.some(s => s.vehicle?._id === v._id && s.status === 'Active');
                  const isSelected = selectedVehicle?._id === v._id;
                  return (
                    <button key={v._id} disabled={hasSub} className="glass" onClick={() => setSelectedVehicle(v)}
                      style={{ 
                        padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left', 
                        borderColor: isSelected ? 'var(--accent-lime)' : 'var(--border-glass)', 
                        opacity: hasSub ? 0.5 : 1,
                        background: isSelected ? 'rgba(223, 255, 0, 0.05)' : 'var(--bg-glass)',
                        borderRadius: 24,
                        animationDelay: `${i * 100}ms`
                      }}>
                      <div style={{ width: 48, height: 48, background: isSelected ? 'var(--accent-lime)' : 'rgba(255,255,255,0.05)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                        <Car size={24} color={isSelected ? '#000' : 'var(--text-secondary)'} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 17 }}>{v.model}</div>
                        <div className="text-body-sm text-secondary font-medium">{v.number} • <span className="capitalize">{v.category}</span></div>
                      </div>
                      {hasSub ? (
                        <span className="chip chip-ghost" style={{ fontSize: 9 }}>Subscribed</span>
                      ) : isSelected && (
                        <div style={{ width: 24, height: 24, background: 'var(--accent-lime)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={14} color="#000" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  )
                })}
                <button disabled={!selectedVehicle} className="btn btn-primary w-full" style={{ marginTop: 32, padding: 18, borderRadius: 18, fontWeight: 800, fontSize: 16, boxShadow: selectedVehicle ? 'var(--shadow-glow-lime)' : 'none' }} onClick={() => setStep(1)}>
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
            
            <div className="flex flex-col gap-12">
              <label className="text-label" style={{ paddingLeft: 8, color: 'var(--text-tertiary)' }}>Select Society</label>
              <div className="flex flex-col gap-12">
                {societies.map(soc => (
                  <button key={soc._id} className="glass" onClick={() => { setSelectedSociety(soc); setSelectedSlot(null); }}
                    style={{ 
                      padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left', 
                      borderColor: selectedSociety?._id === soc._id ? 'var(--accent-lime)' : 'var(--border-glass)',
                      borderRadius: 20,
                      background: selectedSociety?._id === soc._id ? 'rgba(223, 255, 0, 0.05)' : 'var(--bg-glass)'
                    }}>
                    <MapPin size={20} style={{ color: selectedSociety?._id === soc._id ? 'var(--accent-lime)' : 'var(--text-tertiary)' }} />
                    <div><div style={{ fontWeight: 700 }}>{soc.name}</div><div className="text-body-sm text-secondary">{soc.city}</div></div>
                  </button>
                ))}
              </div>
            </div>

            {selectedSociety && (
              <div className="flex flex-col gap-12 animate-slide-up">
                <label className="text-label" style={{ paddingLeft: 8, color: 'var(--text-tertiary)' }}>Select Time Slot</label>
                <div className="flex flex-col gap-12">
                  {selectedSociety.slots.map(s => {
                    const isFull = s.currentCount >= s.maxVehicles;
                    const isSelected = selectedSlot?.slotId === s.slotId;
                    return (
                      <button key={s.slotId} className="glass" onClick={() => setSelectedSlot(s)}
                        style={{ 
                          padding: '20px 24px', display: 'flex', flexDirection: 'column', textAlign: 'left', 
                          borderColor: isSelected ? 'var(--accent-lime)' : 'var(--border-glass)',
                          borderRadius: 20,
                          background: isSelected ? 'rgba(223, 255, 0, 0.05)' : 'var(--bg-glass)'
                        }}>
                        <div className="flex justify-between w-full items-center">
                          <div className="flex items-center gap-10">
                            <Clock size={18} style={{ color: isSelected ? 'var(--accent-lime)' : 'var(--text-tertiary)' }} />
                            <span style={{ fontWeight: 700 }}>{s.timeWindow}</span>
                          </div>
                          {isFull ? (
                            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--error)', background: 'rgba(255,69,58,0.1)', padding: '4px 10px', borderRadius: 8 }}>PRIORITY ONLY</span>
                          ) : (
                            <span style={{ fontSize: 10, color: 'var(--success)', fontWeight: 800 }}>AVAILABLE</span>
                          )}
                        </div>
                        {isFull && (
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 10, paddingLeft: 28, lineHeight: 1.4 }}>
                            Standard slots are full. A <b>₹99 Priority Pass</b> will be added to your booking.
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-12 mt-12">
              <button className="btn btn-ghost" style={{ flex: 1, borderRadius: 16 }} onClick={() => setStep(0)}>Back</button>
              <button disabled={!selectedSociety || !selectedSlot} className="btn btn-primary" style={{ flex: 2, borderRadius: 18, fontWeight: 800 }} onClick={() => setStep(2)}>Continue to Plans</button>
            </div>
          </div>
        )}

        {/* Step 2: Plan */}
        {step === 2 && (
          <div className="flex flex-col gap-24 animate-fade-in-up">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-headline-sm" style={{ marginBottom: 4 }}>Choose Plan</h3>
                <p className="text-secondary text-body-sm">Best for your <span style={{ color: 'var(--accent-lime)', fontWeight: 700 }}>{selectedVehicle?.model}</span></p>
              </div>
              <span className="chip chip-ghost" style={{ borderRadius: 8, fontSize: 10 }}>{selectedVehicle?.category}</span>
            </div>
            
            <div className="flex flex-col gap-16">
              {packages.filter(p => p.category === selectedVehicle?.category).length === 0 && (
                <div className="glass" style={{ padding: 32, textAlign: 'center', borderRadius: 24, border: '1px solid var(--border-glass)' }}>
                  <p className="text-secondary text-body-sm" style={{ marginBottom: 8 }}>No plans available for <strong>{selectedVehicle?.category}</strong> yet.</p>
                  <p className="text-secondary" style={{ fontSize: 12 }}>Try the Trial Wash below, or contact support.</p>
                </div>
              )}
              {packages.filter(p => p.category === selectedVehicle?.category).map((p, i) => {
                const isSelected = selectedPkg?._id === p._id;
                return (
                  <button key={p._id} className="glass" onClick={() => setSelectedPkg(p)}
                    style={{ 
                      padding: '24px', display: 'flex', flexDirection: 'column', textAlign: 'left', 
                      borderColor: isSelected ? 'var(--accent-lime)' : 'var(--border-glass)',
                      borderRadius: 28,
                      background: isSelected ? 'rgba(223, 255, 0, 0.05)' : 'var(--bg-glass)',
                      boxShadow: isSelected ? 'var(--shadow-glow-lime)' : 'none',
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
                      <div className="animate-slide-up" style={{ marginTop: 20, background: 'rgba(223,255,0,0.1)', padding: '12px 16px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Check size={16} color="var(--accent-lime)" strokeWidth={3} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-lime)' }}>Great choice! This plan covers all essentials.</span>
                      </div>
                    )}
                  </button>
                )
              })}

              <div className="divider" style={{ margin: '8px 0' }} />
              
              <button className="glass" onClick={() => setSelectedPkg({ isTrial: true, name: '1-Day Trial Wash', price: trialPrice, _id: null })}
                style={{ 
                  padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  borderRadius: 20, borderColor: selectedPkg?.isTrial ? 'var(--accent-lime)' : 'var(--border-glass)',
                  background: selectedPkg?.isTrial ? 'rgba(223, 255, 0, 0.05)' : 'transparent'
                }}>
                <div className="flex items-center gap-12">
                   <div style={{ width: 40, height: 40, background: 'rgba(223,255,0,0.1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={20} color="var(--accent-lime)" />
                   </div>
                   <div>
                    <div style={{ fontWeight: 800 }}>1-Day Trial Wash</div>
                    <div className="text-body-sm text-secondary">Experience Cleanzo once</div>
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>₹{trialPrice}</span>
              </button>
            </div>

            <div className="flex gap-12 mt-4">
              <button className="btn btn-ghost" style={{ flex: 1, borderRadius: 16 }} onClick={() => setStep(1)}>Back</button>
              <button disabled={!selectedPkg} className="btn btn-primary" style={{ flex: 2, borderRadius: 18, fontWeight: 800 }} onClick={() => setStep(3)}>Final Confirmation</button>
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
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{selectedVehicle?.model}</div>
                    <div className="text-body-sm text-secondary">{selectedVehicle?.number}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="text-label" style={{ color: 'var(--text-tertiary)', marginBottom: 4, fontSize: 10 }}>PLAN</div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent-lime)' }}>{selectedPkg?.name}</div>
                    <div className="text-body-sm text-secondary">{selectedPkg?.isTrial ? 'Trial Session' : 'Monthly'}</div>
                  </div>
                </div>
                
                <div className="divider" style={{ opacity: 0.3 }} />
                
                <div>
                  <div className="text-label" style={{ color: 'var(--text-tertiary)', marginBottom: 4, fontSize: 10 }}>LOCATION & SLOT</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedSociety?.name}</div>
                  <div className="text-body-sm text-secondary flex items-center gap-6 mt-4">
                    <Clock size={12} /> {selectedSlot?.timeWindow}
                  </div>
                </div>

                <div className="divider" style={{ opacity: 0.3 }} />
                
                <div className="flex flex-col gap-10">
                  <div className="flex justify-between text-body-sm">
                    <span className="text-secondary">Base Price</span>
                    <span style={{ fontWeight: 700 }}>₹{basePrice}</span>
                  </div>
                  {priorityFee > 0 && (
                    <div className="flex justify-between text-body-sm" style={{ color: 'var(--error)' }}>
                      <span>Priority Slot Fee</span>
                      <span style={{ fontWeight: 700 }}>+₹{priorityFee}</span>
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
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, color: 'var(--accent-lime)' }}>₹{finalAmount}</span>
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
              <button disabled={processing || !razorpayReady} className="btn btn-primary" style={{ flex: 2, borderRadius: 24, fontWeight: 800, fontSize: 20, padding: 22, boxShadow: 'var(--shadow-glow-lime)' }} onClick={handlePayment}>
                {processing ? 'Processing…' : !razorpayReady ? 'Loading…' : `Pay ₹${finalAmount}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
