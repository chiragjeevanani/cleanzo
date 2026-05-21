import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight, Zap, Users, BarChart3, Clock, CheckCircle2 } from 'lucide-react';
import { useSocietyAuth } from '../../context/SocietyAuthContext';

const FEATURES = [
  { icon: Users,     text: 'View resident subscription stats' },
  { icon: Zap,       text: 'Track real-time commission earnings' },
  { icon: BarChart3, text: 'Submit and track payout requests' },
  { icon: Clock,     text: 'Easy bank account & profile management' },
];

export default function SocietyLogin() {
  const navigate  = useNavigate();
  const { societyUser, societyLogin } = useSocietyAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (societyUser) {
      navigate('/society/dashboard');
    }
  }, [societyUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await societyLogin(email, password);
      if (res.success) {
        navigate('/society/dashboard');
      } else {
        setError(res.message || 'Invalid credentials. Please try again.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F1F3F5',
      padding: '24px 16px',
      fontFamily: "'Inter', sans-serif",
    }}>
      <style>{`
        @keyframes adm-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .adm-card {
          animation: adm-in 0.45s cubic-bezier(0.16,1,0.3,1) both;
          display: flex;
          width: 100%;
          max-width: 960px;
          min-height: 580px;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0,0,0,0.04), 0 24px 64px rgba(0,0,0,0.10);
        }
        /* ── Left panel ── */
        .adm-left {
          flex: 1 1 52%;
          background: #0B2545;
          padding: 56px 52px;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }
        .adm-left-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
        .adm-feature-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          border-radius: 12px;
          transition: background 0.15s;
        }
        .adm-feature-row:hover { background: rgba(255,255,255,0.05); }

        /* ── Right panel ── */
        .adm-right {
          flex: 0 0 380px;
          background: #fff;
          padding: 52px 44px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        /* ── Inputs ── */
        .adm-field-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #9CA3AF;
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        .adm-input {
          width: 100%;
          padding: 13px 14px 13px 44px;
          background: #F9FAFB;
          border: 1.5px solid #E5E7EB;
          border-radius: 12px;
          color: #111827;
          font-size: 15px;
          font-family: 'Inter', sans-serif;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .adm-input::placeholder { color: #C4C9D4; }
        .adm-input:focus {
          border-color: #0B2545;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(11,37,69,0.08);
        }

        /* ── Submit ── */
        .adm-btn {
          width: 100%;
          height: 52px;
          background: #0B2545;
          color: #fff;
          border: none;
          border-radius: 12px;
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.03em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: background 0.2s, transform 0.15s, box-shadow 0.15s;
        }
        .adm-btn:hover:not(:disabled) {
          background: #134074;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(11,37,69,0.2);
        }
        .adm-btn:active:not(:disabled) { transform: translateY(0); }
        .adm-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .adm-back {
          background: none; border: none; cursor: pointer;
          color: #9CA3AF; font-size: 13px; font-family: 'Inter', sans-serif;
          transition: color 0.2s; padding: 0;
        }
        .adm-back:hover { color: #374151; }

        @media (max-width: 700px) {
          .adm-left { display: none; }
          .adm-right { flex: 1; border-radius: 24px; }
        }
      `}</style>

      <div className="adm-card">

        {/* ── Left brand panel ──────────────────────── */}
        <div className="adm-left">
          {/* Decorative glows */}
          <div className="adm-left-glow" style={{
            width: 400, height: 400, top: '-15%', left: '-15%',
            background: 'radial-gradient(circle, rgba(223,255,0,0.1) 0%, transparent 70%)',
          }} />
          <div className="adm-left-glow" style={{
            width: 300, height: 300, bottom: '-10%', right: '-10%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
          }} />

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'auto', position: 'relative', zIndex: 1 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#DFFF00',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShieldCheck size={20} color="#000" strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 18, color: '#fff', letterSpacing: '0.08em' }}>CLEANZO</span>
            <span style={{
              marginLeft: 2, padding: '2px 9px', borderRadius: 6,
              background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)',
              color: '#3B82F6', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
            }}>PARTNER</span>
          </div>

          {/* Main copy */}
          <div style={{ position: 'relative', zIndex: 1, marginTop: 52, marginBottom: 48 }}>
            <h1 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 'clamp(36px, 4vw, 42px)',
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-0.04em',
              color: '#fff',
              marginBottom: 16,
            }}>
              Society Partner<br />
              <span style={{
                background: 'linear-gradient(90deg, #DFFF00, #3B82F6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>Portal.</span>
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, maxWidth: 320 }}>
              Partner with Cleanzo to offer premium vehicle cleaning subscriptions to your residents.
            </p>
          </div>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative', zIndex: 1 }}>
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="adm-feature-row">
                <div style={{
                  width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                  background: 'rgba(223,255,0,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={15} color="#DFFF00" />
                </div>
                <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right form panel ──────────────────────── */}
        <div className="adm-right">

          <div style={{ marginBottom: 36 }}>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 26, fontWeight: 800,
              color: '#111827', letterSpacing: '-0.03em',
              marginBottom: 6,
            }}>Partner Sign In</h2>
            <p style={{ fontSize: 14, color: '#9CA3AF' }}>Enter your society credentials</p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px', borderRadius: 12,
              background: '#FEF2F2', border: '1px solid #FECACA',
              color: '#DC2626', fontSize: 13.5, fontWeight: 500,
              marginBottom: 24,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#DC2626', flexShrink: 0 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Email */}
            <div>
              <label className="adm-field-label">Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{
                  position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)',
                  color: '#D1D5DB', pointerEvents: 'none',
                }} />
                <input
                  type="email"
                  placeholder="society@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="adm-input"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="adm-field-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{
                  position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)',
                  color: '#D1D5DB', pointerEvents: 'none',
                }} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="adm-input"
                  style={{ paddingRight: 46 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    color: '#C4C9D4', transition: 'color 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.color = '#6B7280'}
                  onMouseOut={(e)  => e.currentTarget.style.color = '#C4C9D4'}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <div style={{ marginTop: 6 }}>
              <button type="submit" disabled={loading} className="adm-btn">
                {loading ? 'Logging in…' : <><span>Sign In</span><ArrowRight size={17} /></>}
              </button>
            </div>
          </form>

          {/* Verified checks */}
          <div style={{ margin: '28px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              'View dashboard numbers & subscription stats',
              'Secure payout requests with commission logs',
            ].map((txt) => (
              <div key={txt} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={13} color="#10B981" />
                <span style={{ fontSize: 12.5, color: '#9CA3AF' }}>{txt}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: '#F3F4F6', marginBottom: 20 }} />

          <button onClick={() => navigate('/')} className="adm-back">
            ← Return to Cleanzo
          </button>
        </div>

      </div>
    </div>
  );
}
