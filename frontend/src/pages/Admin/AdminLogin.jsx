import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { user, adminLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'superadmin')) {
      navigate('/admin/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await adminLogin(email, password);
      if (res.success) {
        navigate('/admin/dashboard');
      } else {
        setError(res.message || 'Invalid admin credentials');
      }
    } catch (err) {
      setError('An error occurred during login');
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
      background: '#F9FAFB',
      padding: 20,
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
          width: '50%',
          height: '50%',
          background: 'radial-gradient(circle, rgba(223, 255, 0, 0.15) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'float 20s infinite alternate'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '0%',
          right: '-10%',
          width: '60%',
          height: '60%',
          background: 'radial-gradient(circle, rgba(0, 112, 243, 0.08) 0%, transparent 70%)',
          filter: 'blur(100px)',
          animation: 'float 25s infinite alternate-reverse'
        }} />
        <div style={{
          position: 'absolute',
          top: '30%',
          right: '20%',
          width: '20%',
          height: '20%',
          background: 'radial-gradient(circle, rgba(223, 255, 0, 0.1) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translate(0, 0); }
          100% { transform: translate(10%, 10%); }
        }
        .admin-card {
          backdrop-filter: blur(32px) saturate(200%);
          -webkit-backdrop-filter: blur(32px) saturate(200%);
          background-color: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 40px 100px rgba(0, 0, 0, 0.06);
        }
        .admin-input:focus {
          border-color: var(--accent-lime) !important;
          background: white !important;
          box-shadow: 0 0 0 4px rgba(223, 255, 0, 0.2);
        }
      `}</style>

      <div className="admin-card reveal revealed" style={{
        width: '100%',
        maxWidth: 440,
        padding: '56px 48px',
        borderRadius: 44,
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            width: 76,
            height: 76,
            borderRadius: 24,
            background: 'linear-gradient(135deg, var(--accent-lime) 0%, #a6bf00 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 28px',
            boxShadow: '0 12px 32px rgba(223, 255, 0, 0.3)',
            transform: 'rotate(-5deg)'
          }}>
            <ShieldCheck size={38} color="#000" />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 34,
            fontWeight: 800,
            color: '#111827',
            marginBottom: 10,
            letterSpacing: '-0.04em'
          }}>Control Center</h1>
          <p style={{ color: '#6B7280', fontSize: 16, lineHeight: 1.5, fontWeight: 500 }}>Authorized Access Only</p>
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', zIndex: 2 }}>
              <Mail size={20} />
            </div>
            <input
              type="email"
              placeholder="Administrator Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="admin-input"
              style={{
                width: '100%',
                padding: '20px 20px 20px 56px',
                borderRadius: 20,
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid #E5E7EB',
                color: '#111827',
                fontSize: 16,
                outline: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                fontWeight: 500
              }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', zIndex: 2 }}>
              <Lock size={20} />
            </div>
            <input
              type={showPwd ? 'text' : 'password'}
              placeholder="Master Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="admin-input"
              style={{
                width: '100%',
                padding: '20px 56px 20px 56px',
                borderRadius: 20,
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid #E5E7EB',
                color: '#111827',
                fontSize: 16,
                outline: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                fontWeight: 500
              }}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              style={{
                position: 'absolute',
                right: 20,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#9CA3AF',
                cursor: 'pointer',
                padding: 0,
                zIndex: 2
              }}
            >
              {showPwd ? <EyeOff size={22} /> : <Eye size={22} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              marginTop: 12,
              height: 64,
              fontSize: 18,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              borderRadius: 22,
              boxShadow: '0 20px 40px rgba(223, 255, 0, 0.4)',
              background: 'var(--accent-lime)',
              color: '#000',
              border: 'none'
            }}
          >
            {loading ? 'Verifying...' : (
              <>
                Initialize Access <ArrowRight size={22} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: 44, textAlign: 'center' }}>
          <button 
            onClick={() => navigate('/')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#9CA3AF', 
              fontSize: 15, 
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.color = '#111827'}
            onMouseOut={(e) => e.target.style.color = '#9CA3AF'}
          >
            Return to Landing Page
          </button>
        </div>
      </div>
    </div>
  );
}
