import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, Car, CreditCard, ShieldCheck } from 'lucide-react'
import { mockUser, mockPackages } from '../../data/mockData'

const steps = ['Vehicle', 'Package', 'Confirm']

export default function BookingFlow() {
  const [step, setStep] = useState(0)
  const [selectedVehicle, setSelectedVehicle] = useState(mockUser.vehicles[0])
  const [selectedPkg, setSelectedPkg] = useState(mockPackages[1])

  return (
    <div style={{ padding: '0 20px' }}>
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

      {step === 0 && (
        <div className="flex flex-col gap-12">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>Select Vehicle</h3>
          {mockUser.vehicles.map(v => (
            <button key={v.id} className="glass" onClick={() => setSelectedVehicle(v)}
              style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', borderColor: selectedVehicle?.id === v.id ? 'var(--accent-lime)' : undefined }}>
              <Car size={22} style={{ color: selectedVehicle?.id === v.id ? 'var(--accent-lime)' : 'var(--text-secondary)' }} />
              <div><div style={{ fontWeight: 600 }}>{v.model}</div><div className="text-body-sm text-secondary">{v.number}</div></div>
            </button>
          ))}
          <button className="btn btn-primary w-full" onClick={() => setStep(1)}>Continue</button>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-12">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>Choose Plan</h3>
          {mockPackages.map(p => (
            <button key={p.id} className="glass" onClick={() => setSelectedPkg(p)}
              style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', borderColor: selectedPkg?.id === p.id ? 'var(--accent-lime)' : undefined }}>
              <div><div style={{ fontWeight: 600 }}>{p.name}</div><div className="text-body-sm text-secondary">{p.features.length} services included</div></div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>₹{p.price}</span>
            </button>
          ))}
          <div className="flex gap-8">
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(0)}>Back</button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => setStep(2)}>Continue</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-16">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>Order Summary</h3>
          <div className="glass" style={{ padding: 24 }}>
            <div className="flex justify-between text-body-md" style={{ marginBottom: 12 }}>
              <span className="text-secondary">Vehicle</span><span style={{ fontWeight: 500 }}>{selectedVehicle?.model}</span>
            </div>
            <div className="flex justify-between text-body-md" style={{ marginBottom: 12 }}>
              <span className="text-secondary">Plan</span><span style={{ fontWeight: 500 }}>{selectedPkg?.name}</span>
            </div>
            <div className="flex justify-between text-body-md" style={{ marginBottom: 12 }}>
              <span className="text-secondary">Duration</span><span style={{ fontWeight: 500 }}>30 Days</span>
            </div>
            <div className="divider" style={{ margin: '16px 0' }} />
            <div className="flex justify-between" style={{ fontSize: 20 }}>
              <span style={{ fontWeight: 600 }}>Total</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--accent-lime)' }}>₹{selectedPkg?.price}</span>
            </div>
          </div>
          <div className="glass" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <ShieldCheck size={20} style={{ color: 'var(--success)', flexShrink: 0 }} />
            <span className="text-body-sm text-secondary">Secured by 256-bit encryption. Cancel anytime.</span>
          </div>
          <div className="flex gap-8">
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(1)}>Back</button>
            <Link to="/customer" className="btn btn-primary" style={{ flex: 2 }}>
              <CreditCard size={16} /> Pay ₹{selectedPkg?.price}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
