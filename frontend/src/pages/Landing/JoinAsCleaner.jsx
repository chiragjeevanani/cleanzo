import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Phone, Mail, MapPin, Camera, FileText, 
  ChevronRight, ChevronLeft, CheckCircle2, Shield,
  ArrowRight, Briefcase, Star, Info, X, RotateCcw
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { optimizeImage } from '../../utils/imageOptimizer';

const JoinAsCleaner = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', age: '', city: 'Gurugram',
    fatherName: '', permanentAddress: '', currentAddress: '',
    referenceName: '', referencePhone: ''
  });

  const [files, setFiles] = useState({
    livePhoto: null,
    aadhaarPhoto: null,
    panPhoto: null
  });

  const [previews, setPreviews] = useState({
    livePhoto: null,
    aadhaarPhoto: null,
    panPhoto: null
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const optimized = await optimizeImage(file, { maxWidth: 1000, quality: 0.7 });
        setFiles({ ...files, [e.target.name]: optimized });
        setPreviews({ ...previews, [e.target.name]: URL.createObjectURL(optimized) });
      } catch (err) {
        setFiles({ ...files, [e.target.name]: file });
        setPreviews({ ...previews, [e.target.name]: URL.createObjectURL(file) });
      }
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch (err) {
      setError('Camera access denied. Please enable permissions.');
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    
    // Flip if using front camera
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0);
    
    canvas.toBlob(async (blob) => {
      let file = new File([blob], 'live-photo.jpg', { type: 'image/jpeg' });
      
      try {
        file = await optimizeImage(file, { maxWidth: 800, quality: 0.7 });
      } catch (e) {
        console.error('Photo optimization failed', e);
      }

      setFiles({ ...files, livePhoto: file });
      setPreviews({ ...previews, livePhoto: URL.createObjectURL(file) });
      
      const stream = video.srcObject;
      if (stream) stream.getTracks().forEach(track => track.stop());
      setShowCamera(false);
    }, 'image/jpeg', 0.9);
  };

  const validateStep = () => {
    if (step === 1) {
      const { name, phone, age, fatherName, currentAddress, permanentAddress } = formData;
      if (!name || !phone || !age || !fatherName || !currentAddress || !permanentAddress) {
        setError('Please fill in all mandatory profile fields');
        return false;
      }
      if (phone.length !== 10) {
        setError('Enter a valid 10-digit mobile number');
        return false;
      }
    } else if (step === 2) {
      if (!files.livePhoto || !files.aadhaarPhoto || !files.panPhoto) {
        setError('All identity documents are required to proceed');
        return false;
      }
    } else if (step === 3) {
      const { referenceName, referencePhone } = formData;
      if (!referenceName || !referencePhone) {
        setError('Reference details are required for security verification');
        return false;
      }
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    
    setLoading(true);
    setError(null);

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      
      Object.keys(files).forEach(key => {
        if (files[key]) data.append(key, files[key]);
      });

      const res = await apiClient.uploadForm('/public/cleaner-apply', data);
      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.message || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="glass" style={{ maxWidth: 500, width: '100%', padding: '48px 32px', borderRadius: 40, textAlign: 'center', border: '1px solid var(--border-glass)' }}>
          <div style={{ width: 80, height: 80, background: 'rgba(101,199,55,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
            <CheckCircle2 size={40} color="#65C737" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 900, marginBottom: 16 }}>Application Received!</h1>
          <p className="text-secondary" style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 40 }}>
            Our operations team will review your documents and contact you within <strong>48 hours</strong>.
          </p>
          <button onClick={() => navigate('/')} className="btn-primary" style={{ width: '100%', padding: 18, borderRadius: 16, fontSize: 16 }}>
            Back to Website
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', position: 'relative', overflowX: 'hidden' }}>
      <style>{`
        .join-crew-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 60px 24px;
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 60px;
          align-items: start;
        }

        .branding-section {
          position: sticky;
          top: 60px;
        }

        .input-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .doc-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .form-card-wrapper {
          padding: 48px;
          border-radius: 48px;
        }

        @media (max-width: 1024px) {
          .join-crew-container {
            grid-template-columns: 1fr;
            padding: 40px 20px;
            gap: 40px;
          }
          .branding-section {
            position: static;
            text-align: center;
          }
          .branding-section h1 {
            font-size: 48px !important;
          }
          .brand-logo-wrapper {
            justify-content: center;
          }
          .benefit-item {
            text-align: left;
          }
        }

        @media (max-width: 640px) {
          .form-card-wrapper {
            padding: 32px 20px;
            border-radius: 32px;
          }
          .input-grid-2, .doc-grid {
            grid-template-columns: 1fr;
          }
          .branding-section h1 {
            font-size: 36px !important;
          }
          .branding-section {
            margin-bottom: 20px;
          }
        }

        .input-group { display: flex; flex-direction: column; gap: 8px; }
        .input-group label { font-size: 11px; font-weight: 800; color: var(--text-secondary); letter-spacing: 0.05em; padding-left: 4px; }
        .input-group input, .input-group textarea {
          width: 100%;
          padding: 16px 20px;
          border-radius: 16px;
          border: 1px solid var(--border-glass);
          background: rgba(255,255,255,0.02);
          color: var(--text-primary);
          font-weight: 500;
          font-size: 15px;
          outline: none;
          transition: all 0.3s;
        }
        .input-group input:focus, .input-group textarea:focus {
          border-color: var(--accent-lime);
          background: rgba(255,255,255,0.05);
          box-shadow: 0 0 0 4px rgba(101,199,55,0.1);
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Visual Background Elements */}
      <div style={{ position: 'fixed', top: '-10%', right: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(101,199,55,0.08) 0%, transparent 70%)', filter: 'blur(100px)', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-20%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(74,158,255,0.05) 0%, transparent 70%)', filter: 'blur(120px)', zIndex: 0 }} />

      <div className="join-crew-container">
        
        {/* Left Side: Branding & Info */}
        <div className="branding-section">
          <div className="brand-logo-wrapper" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-lime)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={24} color="#000" />
            </div>
            <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em' }}>CLEANZO <span style={{ color: 'var(--accent-lime)' }}>CREW</span></span>
          </div>

          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 64, fontWeight: 900, lineHeight: 0.95, letterSpacing: '-0.05em', marginBottom: 32 }}>
            Join the <br /> <span style={{ color: 'var(--accent-lime)' }}>Top 1%</span> of <br /> Cleaning Pro's.
          </h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 48 }}>
            {[
              { icon: Briefcase, title: 'Consistent Earnings', desc: 'Daily payout opportunities with full task loads.' },
              { icon: Star, title: 'Premium Benefits', desc: 'Professional uniforms, training, and performance bonuses.' },
              { icon: Shield, title: 'Trust & Safety', desc: 'Secure verification process and insured work environments.' }
            ].map((item, i) => (
              <div key={i} className="benefit-item" style={{ display: 'flex', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <item.icon size={22} color="var(--accent-lime)" />
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{item.title}</h3>
                  <p className="text-secondary" style={{ fontSize: 14 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="glass" style={{ padding: 24, borderRadius: 24, border: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, justifyContent: 'inherit' }}>
              <Info size={18} color="var(--accent-lime)" />
              <span style={{ fontWeight: 700, fontSize: 14 }}>ONBOARDING PROCESS</span>
            </div>
            <p className="text-secondary" style={{ fontSize: 13, lineHeight: 1.6 }}>
              Our verification process ensures quality and safety. Please provide accurate documents to avoid application rejection.
            </p>
          </div>
        </div>

        {/* Right Side: Multi-step Form */}
        <div>
          <div className="glass form-card-wrapper" style={{ border: '1px solid var(--border-glass)', boxShadow: '0 40px 100px rgba(0,0,0,0.1)' }}>
            
            {/* Header / Progress */}
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-lime)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Step {step} of 3</span>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800, marginTop: 4 }}>
                    {step === 1 ? 'Personal Profile' : step === 2 ? 'Identity Documents' : 'Final Verification'}
                  </h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 18, fontWeight: 900 }}>{Math.round((step/3)*100)}%</span>
                </div>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(step/3)*100}%`, background: 'var(--accent-lime)', transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 0 20px rgba(101,199,55,0.4)' }} />
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', padding: 16, borderRadius: 16, fontSize: 14, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600 }}>
                <X size={18} /> {error}
              </div>
            )}

            {/* Step 1: Profile */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                <div className="input-grid-2">
                  <div className="input-group">
                    <label>FULL NAME</label>
                    <input name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" />
                  </div>
                  <div className="input-group">
                    <label>MOBILE NUMBER</label>
                    <input name="phone" value={formData.phone} onChange={handleChange} placeholder="10-digit number" />
                  </div>
                </div>

                <div className="input-grid-2">
                  <div className="input-group">
                    <label>AGE</label>
                    <input name="age" type="number" value={formData.age} onChange={handleChange} placeholder="25" />
                  </div>
                  <div className="input-group">
                    <label>FATHER'S NAME</label>
                    <input name="fatherName" value={formData.fatherName} onChange={handleChange} placeholder="Legal Name" />
                  </div>
                </div>

                <div className="input-group">
                  <label>CURRENT ADDRESS (IN GURUGRAM)</label>
                  <textarea name="currentAddress" value={formData.currentAddress} onChange={handleChange} placeholder="Flat no, Building, Area..." rows={3} style={{ resize: 'none' }} />
                </div>

                <div className="input-group">
                  <label>PERMANENT ADDRESS</label>
                  <textarea name="permanentAddress" value={formData.permanentAddress} onChange={handleChange} placeholder="As per Aadhaar card..." rows={3} style={{ resize: 'none' }} />
                </div>
              </div>
            )}

            {/* Step 2: Documents */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                
                {/* Live Photo Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>1. LIVE SELFIE CAPTURE</label>
                  <div style={{ position: 'relative', aspectRatio: '16/10', borderRadius: 32, overflow: 'hidden', border: '2px solid var(--border-glass)', background: 'rgba(0,0,0,0.2)' }}>
                    {showCamera ? (
                      <div style={{ width: '100%', height: '100%' }}>
                        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                        <div style={{ position: 'absolute', inset: 0, border: '2px solid var(--accent-lime)', borderRadius: 32, opacity: 0.3, pointerEvents: 'none' }} />
                        <button onClick={capturePhoto} style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', width: 64, height: 64, borderRadius: '50%', background: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(0,0,0,0.5)', cursor: 'pointer' }}>
                          <div style={{ width: 50, height: 50, borderRadius: '50%', border: '2px solid #000' }} />
                        </button>
                      </div>
                    ) : previews.livePhoto ? (
                      <div style={{ width: '100%', height: '100%' }}>
                        <img src={previews.livePhoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button onClick={startCamera} style={{ position: 'absolute', top: 16, right: 16, padding: '8px 16px', borderRadius: 12, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <RotateCcw size={14} /> Retake
                        </button>
                      </div>
                    ) : (
                      <div onClick={startCamera} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, cursor: 'pointer', padding: 20 }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(101,199,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Camera size={28} color="var(--accent-lime)" />
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>Open Camera to Take Photo</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Identity Cards */}
                <div className="doc-grid">
                  {[
                    { id: 'aadhaarPhoto', label: '2. AADHAAR CARD (FRONT)', icon: FileText },
                    { id: 'panPhoto', label: '3. PAN CARD', icon: CreditCard }
                  ].map(doc => (
                    <div key={doc.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)' }}>{doc.label}</label>
                      <label style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 24, border: '2px dashed var(--border-glass)', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
                        <input type="file" name={doc.id} onChange={handleFileChange} style={{ display: 'none' }} />
                        {previews[doc.id] ? (
                          <img src={previews[doc.id]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ textAlign: 'center' }}>
                            <doc.icon size={28} color="rgba(255,255,255,0.2)" style={{ marginBottom: 8 }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>UPLOAD</span>
                          </div>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Reference */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                <div style={{ background: 'rgba(101,199,55,0.05)', border: '1px solid rgba(101,199,55,0.1)', padding: '32px 24px', borderRadius: 32 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent-lime)', marginBottom: 12 }}>Candidate Declaration</h3>
                  <p style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.6, color: 'var(--text-primary)' }}>
                    I, <strong>{formData.name || 'Candidate'}</strong>, hereby certify that the information provided is accurate and I am ready to join the professional crew of Cleanzo.
                  </p>
                </div>

                <div className="input-grid-2">
                  <div className="input-group">
                    <label>REFERENCE NAME</label>
                    <input name="referenceName" value={formData.referenceName} onChange={handleChange} placeholder="Full Name" />
                  </div>
                  <div className="input-group">
                    <label>REFERENCE PHONE</label>
                    <input name="referencePhone" value={formData.referencePhone} onChange={handleChange} placeholder="Mobile Number" />
                  </div>
                </div>

                <p className="text-secondary" style={{ fontSize: 13, textAlign: 'center' }}>
                  By clicking finalize, you agree to our <span style={{ color: 'var(--accent-lime)', cursor: 'pointer' }}>Terms of Service</span>.
                </p>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 16, marginTop: 48 }}>
              {step > 1 && (
                <button onClick={() => setStep(step - 1)} style={{ flex: 1, padding: 18, borderRadius: 16, border: '1px solid var(--border-glass)', background: 'transparent', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                  Back
                </button>
              )}
              <button 
                onClick={() => step === 3 ? handleSubmit() : handleNext()}
                disabled={loading}
                className="btn-primary"
                style={{ flex: 2, padding: 18, borderRadius: 16, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}
              >
                {loading ? (
                  <div style={{ width: 20, height: 20, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                ) : step === 3 ? (
                  <>Submit Application <CheckCircle2 size={18} /></>
                ) : (
                  <>Continue <ChevronRight size={18} /></>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

// Mock icon to fix missing import
const CreditCard = ({ size, color, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

export default JoinAsCleaner;
