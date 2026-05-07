import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Phone, Mail, MapPin, Camera, FileText, 
  ChevronRight, ChevronLeft, CheckCircle2, Shield 
} from 'lucide-react';
import apiClient from '../../services/apiClient';

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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFiles({ ...files, [e.target.name]: file });
      setPreviews({ ...previews, [e.target.name]: URL.createObjectURL(file) });
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('Camera access denied');
    }
  };

  const capturePhoto = () => {
    const context = canvasRef.current.getContext('2d');
    context.drawImage(videoRef.current, 0, 0, 640, 480);
    canvasRef.current.toBlob((blob) => {
      const file = new File([blob], 'live-photo.jpg', { type: 'image/jpeg' });
      setFiles({ ...files, livePhoto: file });
      setPreviews({ ...previews, livePhoto: URL.createObjectURL(file) });
      
      // Stop stream
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      setShowCamera(false);
    }, 'image/jpeg');
  };

  const validateStep = () => {
    if (step === 1) {
      const { name, phone, age, fatherName, currentAddress, permanentAddress } = formData;
      if (!name || !phone || !age || !fatherName || !currentAddress || !permanentAddress) {
        setError('All personal profile fields are mandatory');
        return false;
      }
      if (phone.length < 10) {
        setError('Please enter a valid 10-digit phone number');
        return false;
      }
    } else if (step === 2) {
      if (!files.livePhoto || !files.aadhaarPhoto || !files.panPhoto) {
        setError('All identity documents (Live Photo, Aadhaar, and PAN) are required');
        return false;
      }
    } else if (step === 3) {
      const { referenceName, referencePhone } = formData;
      if (!referenceName || !referencePhone) {
        setError('Local reference details are mandatory');
        return false;
      }
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
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
      setError(err.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-green-600" size={40} />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Application Submitted!</h1>
          <p className="text-gray-600 mb-8">
            Thank you for applying to join Cleanzo. Our operations team will review your application and contact you within 2-3 business days.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="btn btn-primary w-full py-4 rounded-xl text-lg font-bold"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F9FAFB',
      padding: '40px 20px',
      fontFamily: 'var(--font-main)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Premium Light Mesh Background */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        zIndex: 0,
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-10%',
          left: '-5%',
          width: '60%',
          height: '60%',
          background: 'radial-gradient(circle, rgba(223, 255, 0, 0.12) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'float 20s infinite alternate'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '0%',
          right: '-10%',
          width: '70%',
          height: '70%',
          background: 'radial-gradient(circle, rgba(0, 112, 243, 0.06) 0%, transparent 70%)',
          filter: 'blur(100px)',
          animation: 'float 25s infinite alternate-reverse'
        }} />
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translate(0, 0); }
          100% { transform: translate(5%, 5%); }
        }
        .form-card {
          backdrop-filter: blur(32px) saturate(200%);
          -webkit-backdrop-filter: blur(32px) saturate(200%);
          background-color: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 40px 100px rgba(0, 0, 0, 0.04);
        }
        .form-input:focus {
          border-color: var(--accent-lime) !important;
          background: white !important;
          box-shadow: 0 0 0 4px rgba(223, 255, 0, 0.2);
        }
        .step-pill {
          height: 6px;
          flex: 1;
          border-radius: 10px;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

      <div className="form-card" style={{
        width: '100%',
        maxWidth: 640,
        padding: '56px 48px',
        borderRadius: 48,
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: 'linear-gradient(135deg, var(--accent-lime) 0%, #a6bf00 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 12px 32px rgba(223, 255, 0, 0.3)',
            transform: 'rotate(-5deg)'
          }}>
            <Shield size={32} color="#000" />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 36,
            fontWeight: 900,
            color: '#111827',
            marginBottom: 10,
            letterSpacing: '-0.04em'
          }}>Join the Crew</h1>
          <p style={{ color: '#6B7280', fontSize: 16, fontWeight: 500 }}>Step {step} of 3 — {step === 1 ? 'Personal Profile' : step === 2 ? 'Identity Verification' : 'Final Review'}</p>
        </div>

        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 48 }}>
          {[1, 2, 3].map(s => (
            <div 
              key={s} 
              className="step-pill"
              style={{ 
                backgroundColor: step >= s ? 'var(--accent-lime)' : '#E5E7EB',
                boxShadow: step >= s ? '0 0 15px rgba(223, 255, 0, 0.5)' : 'none'
              }}
            />
          ))}
        </div>

        {error && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FEE2E2',
            color: '#EF4444',
            padding: '16px',
            borderRadius: 20,
            fontSize: 14,
            marginBottom: 32,
            textAlign: 'center',
            fontWeight: 600
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 40 }}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginLeft: 4 }}>FULL NAME</label>
                  <input name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" className="form-input" required style={{ width: '100%', padding: '18px 24px', borderRadius: 20, border: '1px solid #E5E7EB', outline: 'none', fontWeight: 500, fontSize: 15 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginLeft: 4 }}>PHONE NUMBER</label>
                  <input name="phone" value={formData.phone} onChange={handleChange} placeholder="10-digit mobile" className="form-input" required style={{ width: '100%', padding: '18px 24px', borderRadius: 20, border: '1px solid #E5E7EB', outline: 'none', fontWeight: 500, fontSize: 15 }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginLeft: 4 }}>AGE</label>
                  <input name="age" type="number" value={formData.age} onChange={handleChange} placeholder="25" className="form-input" required style={{ width: '100%', padding: '18px 24px', borderRadius: 20, border: '1px solid #E5E7EB', outline: 'none', fontWeight: 500, fontSize: 15 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginLeft: 4 }}>FATHER'S NAME</label>
                  <input name="fatherName" value={formData.fatherName} onChange={handleChange} placeholder="Full Name" className="form-input" required style={{ width: '100%', padding: '18px 24px', borderRadius: 20, border: '1px solid #E5E7EB', outline: 'none', fontWeight: 500, fontSize: 15 }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginLeft: 4 }}>CURRENT ADDRESS</label>
                <textarea name="currentAddress" value={formData.currentAddress} onChange={handleChange} placeholder="Full address in Gurugram/Delhi" rows="2" className="form-input" required style={{ width: '100%', padding: '18px 24px', borderRadius: 20, border: '1px solid #E5E7EB', outline: 'none', fontWeight: 500, fontSize: 15, resize: 'none' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginLeft: 4 }}>PERMANENT ADDRESS</label>
                <textarea name="permanentAddress" value={formData.permanentAddress} onChange={handleChange} placeholder="As per Aadhaar card" rows="2" className="form-input" required style={{ width: '100%', padding: '18px 24px', borderRadius: 20, border: '1px solid #E5E7EB', outline: 'none', fontWeight: 500, fontSize: 15, resize: 'none' }} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {/* Camera Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
                   <Camera size={16} /> 1. TAKE A LIVE PHOTO
                </label>
                <div style={{ 
                  aspectRatio: '16/9', backgroundColor: '#F3F4F6', borderRadius: 32, overflow: 'hidden', position: 'relative',
                  border: '2px dashed #D1D5DB'
                }}>
                  {showCamera ? (
                    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                      <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button onClick={capturePhoto} type="button" style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', width: 64, height: 64, backgroundColor: 'white', borderRadius: '50%', border: '4px solid var(--accent-lime)', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyCenter: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                        <div style={{ width: 40, height: 40, background: 'var(--accent-lime)', borderRadius: '50%' }} />
                      </button>
                    </div>
                  ) : previews.livePhoto ? (
                    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                      <img src={previews.livePhoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button onClick={startCamera} type="button" style={{ position: 'absolute', bottom: 16, right: 16, background: 'white', padding: '10px 20px', borderRadius: 16, fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>RETAKE</button>
                    </div>
                  ) : (
                    <button onClick={startCamera} type="button" style={{ width: '100%', height: '100%', background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyCenter: 'center', gap: 12, color: '#9CA3AF', cursor: 'pointer' }}>
                      <Camera size={48} />
                      <span style={{ fontWeight: 800 }}>OPEN CAMERA</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Uploads */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <label style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>2. AADHAAR CARD</label>
                  <label style={{ aspectRatio: '4/3', background: '#F3F4F6', borderRadius: 24, border: '2px dashed #D1D5DB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyCenter: 'center', cursor: 'pointer', overflow: 'hidden' }}>
                    <input type="file" name="aadhaarPhoto" onChange={handleFileChange} className="hidden" />
                    {previews.aadhaarPhoto ? <img src={previews.aadhaarPhoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FileText size={32} color="#9CA3AF" />}
                  </label>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <label style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>3. PAN CARD</label>
                  <label style={{ aspectRatio: '4/3', background: '#F3F4F6', borderRadius: 24, border: '2px dashed #D1D5DB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyCenter: 'center', cursor: 'pointer', overflow: 'hidden' }}>
                    <input type="file" name="panPhoto" onChange={handleFileChange} className="hidden" />
                    {previews.panPhoto ? <img src={previews.panPhoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FileText size={32} color="#9CA3AF" />}
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ background: 'var(--accent-lime)', color: '#000', padding: 32, borderRadius: 32, boxShadow: '0 12px 32px rgba(223, 255, 0, 0.2)' }}>
                <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 12 }}>Declaration</h3>
                <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.6, opacity: 0.8 }}>
                  I, <span style={{ textDecoration: 'underline' }}>{formData.name || 'Candidate'}</span>, confirm that the information provided is correct and I am ready to join the Cleanzo team.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginLeft: 4 }}>LOCAL REFERENCE NAME</label>
                  <input name="referenceName" value={formData.referenceName} onChange={handleChange} placeholder="Friend / Neighbor" className="form-input" required style={{ width: '100%', padding: '18px 24px', borderRadius: 20, border: '1px solid #E5E7EB', outline: 'none', fontWeight: 500, fontSize: 15 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginLeft: 4 }}>REFERENCE PHONE</label>
                  <input name="referencePhone" value={formData.referencePhone} onChange={handleChange} placeholder="Phone Number" className="form-input" required style={{ width: '100%', padding: '18px 24px', borderRadius: 20, border: '1px solid #E5E7EB', outline: 'none', fontWeight: 500, fontSize: 15 }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 16 }}>
          {step > 1 && (
            <button 
              onClick={() => setStep(step - 1)}
              style={{ flex: 1, height: 64, borderRadius: 22, background: '#F3F4F6', color: '#4B5563', border: 'none', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}
            >
              Back
            </button>
          )}
          <button 
            onClick={() => step === 3 ? handleSubmit() : handleNext()}
            disabled={loading}
            style={{ 
              flex: 2, height: 64, borderRadius: 22, background: 'var(--accent-lime)', color: '#000', border: 'none', fontWeight: 900, fontSize: 18, cursor: 'pointer',
              boxShadow: '0 20px 40px rgba(223, 255, 0, 0.3)',
              display: 'flex', alignItems: 'center', justifyCenter: 'center', gap: 8
            }}
          >
            {loading ? 'Verifying...' : step === 3 ? 'Finalize Application' : 'Next Step'}
            {!loading && <ChevronRight size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinAsCleaner;
