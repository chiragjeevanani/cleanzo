import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Car, CreditCard, ShieldCheck, MapPin, Clock, Info } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import apiClient from '../../services/apiClient'

const steps = ['Vehicle', 'Location', 'Plan', 'Confirm']

export default function BookingFlow() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [step, setStep] = useState(0)
  
  // Data lists
  const [societies, setSocieties] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [packages, setPackages] = useState([])
  const [activeSubscriptions, setActiveSubscriptions] = useState([])
  
  // Selections
  const [selectedSociety, setSelectedSociety] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [selectedPkg, setSelectedPkg] = useState(null) 
  const [specialInstructions, setSpecialInstructions] = useState('')
  
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sRes, vRes, pRes, subRes] = await Promise.all([
          apiClient.get('/customer/societies'),
          apiClient.get('/customer/vehicles'),
          apiClient.get('/packages'),
          apiClient.get('/customer/subscriptions')
        ])
        setSocieties(sRes.societies || [])
        setVehicles(vRes.vehicles || [])
        setPackages(pRes.packages || [])
        setActiveSubscriptions(subRes.subscriptions || [])
        
        if (sRes.societies?.length > 0) setSelectedSociety(sRes.societies[0])
        if (vRes.vehicles?.length > 0) setSelectedVehicle(vRes.vehicles[0])
      } catch (err) {
        console.error('Error fetching data for booking', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()

    // Load Razorpay script
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  // Calculate pricing
  const basePrice = selectedPkg?.price || 0
  const isSlotFull = selectedSlot ? (selectedSlot.currentCount >= selectedSlot.maxVehicles) : false
  const priorityFee = (isSlotFull && !selectedPkg?.isTrial) ? 99 : 0
  let subtotal = basePrice + priorityFee
  
  const hasReferralDiscount = user?.referralDiscount?.isActive && !selectedPkg?.isTrial
  const discountAmount = hasReferralDiscount ? Math.round(subtotal * (user.referralDiscount.percentage / 100)) : 0
  const finalAmount = subtotal - discountAmount

  const handlePayment = async () => {
    if (!selectedPkg || !selectedVehicle || !selectedSociety || !selectedSlot) return
    setProcessing(true)
    
    try {
      // 1. Get Razorpay key
      const keyRes = await apiClient.get('/payment/key')
      const razorpayKey = keyRes.key

      // 2. Create Order
      const orderRes = await apiClient.post('/payment/create-order', {
        amount: finalAmount,
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
            
            // 5. Actually Create Subscription!
            await apiClient.post('/customer/subscriptions', {
              vehicleId: selectedVehicle._id,
              packageId: selectedPkg._id || null, // null if trial
              isTrial: selectedPkg.isTrial || false,
              societyId: selectedSociety._id,
              slotId: selectedSlot.slotId,
              specialInstructions,
              paymentId: response.razorpay_payment_id
            })

            // On success, navigate to subscriptions
            navigate('/customer/subscriptions')
          } catch (verifyErr) {
            console.error('Payment verification failed', verifyErr)
            alert('Payment verification or subscription creation failed. Please contact support.')
          }
        },
        prefill: {
          name: user?.name || '',
          contact: user?.phone || '',
          email: user?.email || ''
        },
        theme: {
          color: '#DFFF00' // primary accent color
        }
      }

      // 4. Open Razorpay checkout
      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response){
        console.error('Payment failed', response.error)
        alert(`Payment failed: ${response.error.description}`)
      })
      rzp.open()
      
    } catch (err) {
      console.error('Payment initialization failed', err)
      alert('Failed to initiate payment. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <div className="loader-overlay"><div className="loader"></div></div>

  return (
    <div style={{ padding: '0 20px', paddingBottom: 100 }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <Link to="/customer" className="flex items-center gap-8"><ArrowLeft size={20} /></Link>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>New Booking</span>
        <div style={{ width: 20 }} />
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-8" style={{ marginBottom: 28 }}>
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-8" style={{ flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ width: 28, height: 28, borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)',
              background: i <= step ? 'var(--accent-lime)' : 'var(--bg-glass)', color: i <= step ? '#0A0A0A' : 'var(--text-secondary)', border: `1px solid ${i <= step ? 'transparent' : 'var(--border-glass)'}` }}>
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: i < step ? 'var(--accent-lime)' : 'var(--border-glass)', borderRadius: 1 }} />}
          </div>
        ))}
      </div>

      {/* Step 0: Vehicle */}
      {step === 0 && (
        <div className="flex flex-col gap-12">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>Select Vehicle</h3>
          {vehicles.length === 0 ? (
            <div className="glass" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, background: 'var(--bg-glass)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Car size={32} className="text-secondary" />
              </div>
              <p className="text-secondary mb-4">You haven't added any vehicles yet.</p>
              <button className="btn btn-primary w-full" onClick={() => navigate('/customer/profile')}>Add Vehicle</button>
            </div>
          ) : (
            <div className="flex flex-col gap-12">
              {vehicles.map(v => {
                const hasSub = activeSubscriptions.some(s => s.vehicle?._id === v._id && s.status === 'Active');
                return (
                  <button key={v._id} disabled={hasSub} className="glass" onClick={() => setSelectedVehicle(v)}
                    style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', borderColor: selectedVehicle?._id === v._id ? 'var(--accent-lime)' : undefined, opacity: hasSub ? 0.6 : 1 }}>
                    <Car size={22} style={{ color: selectedVehicle?._id === v._id ? 'var(--accent-lime)' : 'var(--text-secondary)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{v.model}</div>
                      <div className="text-body-sm text-secondary">{v.number} • <span className="capitalize">{v.category}</span></div>
                    </div>
                    {hasSub && <span className="chip chip-ghost" style={{ fontSize: 10 }}>Active Plan</span>}
                    {selectedVehicle?._id === v._id && <div style={{ width: 20, height: 20, background: 'var(--accent-lime)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={12} color="#000" /></div>}
                  </button>
                )
              })}
              <button disabled={!selectedVehicle} className={`btn btn-primary w-full mt-4 ${!selectedVehicle ? 'opacity-50' : ''}`} onClick={() => setStep(1)}>Continue</button>
            </div>
          )}
        </div>
      )}

      {/* Step 1: Location & Slot */}
      {step === 1 && (
        <div className="flex flex-col gap-16">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>Select Society</h3>
          {societies.length === 0 ? (
            <div className="text-secondary text-center py-4">No societies found. Please contact support.</div>
          ) : (
            <div className="flex flex-col gap-12">
              {societies.map(soc => (
                <button key={soc._id} className="glass" onClick={() => { setSelectedSociety(soc); setSelectedSlot(null); }}
                  style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', borderColor: selectedSociety?._id === soc._id ? 'var(--accent-lime)' : undefined }}>
                  <MapPin size={22} style={{ color: selectedSociety?._id === soc._id ? 'var(--accent-lime)' : 'var(--text-secondary)' }} />
                  <div><div style={{ fontWeight: 600 }}>{soc.name}</div><div className="text-body-sm text-secondary">{soc.city}</div></div>
                </button>
              ))}
            </div>
          )}

          {selectedSociety && (
            <>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, marginTop: 16 }}>Select Time Slot</h3>
              <div className="flex flex-col gap-12">
                {selectedSociety.slots.map(s => {
                  const isFull = s.currentCount >= s.maxVehicles;
                  return (
                    <button key={s.slotId} className="glass" onClick={() => setSelectedSlot(s)}
                      style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', textAlign: 'left', borderColor: selectedSlot?.slotId === s.slotId ? 'var(--accent-lime)' : undefined }}>
                      <div className="flex justify-between w-full">
                        <div className="flex items-center gap-8">
                          <Clock size={18} style={{ color: selectedSlot?.slotId === s.slotId ? 'var(--accent-lime)' : 'var(--text-secondary)' }} />
                          <span style={{ fontWeight: 600 }}>{s.timeWindow}</span>
                        </div>
                        {isFull ? (
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#ff5555', background: 'rgba(255,85,85,0.1)', padding: '2px 8px', borderRadius: 8 }}>FULL (+₹99 Priority)</span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--success)' }}>Available</span>
                        )}
                      </div>
                      {isFull && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, paddingLeft: 26 }}>
                          This slot is operating at maximum capacity. Priority Pass required.
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          <div className="flex gap-8 mt-4">
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(0)}>Back</button>
            <button disabled={!selectedSociety || !selectedSlot} className={`btn btn-primary ${(!selectedSociety || !selectedSlot) ? 'opacity-50' : ''}`} style={{ flex: 2 }} onClick={() => setStep(2)}>Continue</button>
          </div>
        </div>
      )}

      {/* Step 2: Plan */}
      {step === 2 && (
        <div className="flex flex-col gap-12">
          <div className="flex justify-between items-center">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>Recommended Plans</h3>
            <span className="chip chip-lime" style={{ fontSize: 10 }}>For {selectedVehicle?.category}</span>
          </div>
          
          {/* Filtered Packages */}
          {packages.filter(p => p.category === selectedVehicle?.category).length === 0 ? (
            <div className="glass" style={{ padding: 24, textAlign: 'center' }}>
              <Info className="text-secondary mb-2" />
              <p className="text-secondary text-body-sm">No specific plans found for {selectedVehicle?.category}. Showing general plans.</p>
              <div className="flex flex-col gap-12 mt-4">
                {packages.slice(0, 3).map(p => (
                   <button key={p._id} className="glass" onClick={() => setSelectedPkg(p)}
                   style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', borderColor: selectedPkg?._id === p._id ? 'var(--accent-lime)' : undefined }}>
                   <div><div style={{ fontWeight: 600 }}>{p.name}</div><div className="text-body-sm text-secondary">General Plan</div></div>
                   <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>₹{p.price}</span>
                 </button>
                ))}
              </div>
            </div>
          ) : (
            packages.filter(p => p.category === selectedVehicle?.category).map(p => (
              <button key={p._id} className="glass" onClick={() => setSelectedPkg(p)}
                style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', borderColor: selectedPkg?._id === p._id ? 'var(--accent-lime)' : undefined }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div className="text-body-sm text-secondary" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    {p.features?.slice(0, 2).map((f, idx) => <span key={idx} className="chip chip-ghost" style={{ fontSize: 9 }}>{f}</span>)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>₹{p.price}</div>
                   <div className="text-body-sm text-secondary" style={{ fontSize: 10 }}>per month</div>
                </div>
              </button>
            ))
          )}

          <div className="divider my-2" />
          
          {/* Trial Option */}
          <button className="glass" onClick={() => setSelectedPkg({ isTrial: true, name: '1-Day Trial Wash', price: 30, _id: null })}
            style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', borderColor: selectedPkg?.isTrial ? 'var(--accent-lime)' : undefined }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--accent-lime)' }}>1-Day Trial Wash</div>
              <div className="text-body-sm text-secondary">Test our service quality</div>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>₹30</span>
          </button>

          <div className="flex gap-8 mt-4">
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(1)}>Back</button>
            <button disabled={!selectedPkg} className={`btn btn-primary ${!selectedPkg ? 'opacity-50' : ''}`} style={{ flex: 2 }} onClick={() => setStep(3)}>Continue</button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div className="flex flex-col gap-16">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>Order Summary</h3>
          <div className="glass" style={{ padding: 24 }}>
            <div className="flex justify-between text-body-md" style={{ marginBottom: 12 }}>
              <span className="text-secondary">Vehicle</span><span style={{ fontWeight: 500 }}>{selectedVehicle?.model} ({selectedVehicle?.number})</span>
            </div>
            <div className="flex justify-between text-body-md" style={{ marginBottom: 12 }}>
              <span className="text-secondary">Location</span><span style={{ fontWeight: 500, textAlign: 'right' }}>{selectedSociety?.name}<br/><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{selectedSlot?.timeWindow}</span></span>
            </div>
            <div className="flex justify-between text-body-md" style={{ marginBottom: 12 }}>
              <span className="text-secondary">Plan</span><span style={{ fontWeight: 500 }}>{selectedPkg?.name}</span>
            </div>
            <div className="flex justify-between text-body-md" style={{ marginBottom: 12 }}>
              <span className="text-secondary">Duration</span><span style={{ fontWeight: 500 }}>{selectedPkg?.isTrial ? '1 Day' : '30 Days'}</span>
            </div>
            
            <div className="divider" style={{ margin: '16px 0' }} />
            
            <div className="flex justify-between text-body-md" style={{ marginBottom: 8 }}>
              <span className="text-secondary">Base Price</span><span style={{ fontWeight: 500 }}>₹{basePrice}</span>
            </div>
            {priorityFee > 0 && (
              <div className="flex justify-between text-body-md" style={{ marginBottom: 8, color: '#ff5555' }}>
                <span>Priority Slot Fee</span><span style={{ fontWeight: 500 }}>+₹{priorityFee}</span>
              </div>
            )}
            {hasReferralDiscount && (
              <div className="flex justify-between text-body-md" style={{ marginBottom: 8, color: 'var(--success)' }}>
                <span>Referral Discount ({user.referralDiscount.percentage}%)</span><span style={{ fontWeight: 500 }}>-₹{discountAmount}</span>
              </div>
            )}

            <div className="divider" style={{ margin: '16px 0' }} />
            
            <div className="flex justify-between" style={{ fontSize: 20 }}>
              <span style={{ fontWeight: 600 }}>Total</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--accent-lime)' }}>₹{finalAmount}</span>
            </div>
          </div>

          <div>
            <label className="text-body-sm text-secondary" style={{ display: 'block', marginBottom: 8 }}>Special Instructions (Optional)</label>
            <textarea 
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="e.g. Parking spot B-42, entry from gate 2"
              className="glass"
              style={{ width: '100%', padding: '12px 16px', borderRadius: 12, minHeight: 80, border: '1px solid var(--border-glass)', background: 'transparent', color: 'white', resize: 'vertical' }}
            />
          </div>

          <div className="glass" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <ShieldCheck size={20} style={{ color: 'var(--success)', flexShrink: 0 }} />
            <span className="text-body-sm text-secondary">Secured by 256-bit encryption. Cancel anytime.</span>
          </div>
          <div className="flex gap-8">
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(2)}>Back</button>
            <button disabled={processing} className={`btn btn-primary ${processing ? 'opacity-50' : ''}`} style={{ flex: 2 }} onClick={handlePayment}>
              <CreditCard size={16} /> {processing ? 'Processing...' : `Pay ₹${finalAmount}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
