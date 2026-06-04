import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SocietyAuthProvider } from './context/SocietyAuthContext'
import { PushNotificationProvider } from './context/PushNotificationContext'
import ProtectedRoute from './components/ProtectedRoute'
import LandingPage from './pages/Landing/LandingPage'
import CustomerApp from './pages/Customer/CustomerApp'
import CleanerApp from './pages/Cleaner/CleanerApp'
import AdminPanel from './pages/Admin/AdminPanel'
import AdminLogin from './pages/Admin/AdminLogin'
import LegalTerms from './pages/Customer/Profile/LegalTerms'
import LegalPrivacy from './pages/Customer/Profile/LegalPrivacy'
import HelpSupport from './pages/Customer/Profile/HelpSupport'
import CustomerAuth from './pages/Customer/CustomerAuth'
import JoinAsCleaner from './pages/Landing/JoinAsCleaner'
import SocietyLogin from './pages/Society/SocietyLogin'
import SocietyApp from './pages/Society/SocietyApp'
import OfflineDetector from './components/OfflineDetector'

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  useEffect(() => {
    // 1. Mobile Keyboard Shift Guide
    const handleFocus = (e) => {
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        const type = target.getAttribute('type') || 'text';
        if (!['email', 'password', 'number', 'tel', 'checkbox', 'radio', 'file'].includes(type)) {
          target.setAttribute('autocapitalize', 'sentences');
        }
      }
    };

    // 2. Desktop & Mobile Universal Casing State Sync
    const handleInput = (e) => {
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        const type = target.getAttribute('type') || 'text';
        const name = target.getAttribute('name') || '';
        const id = target.getAttribute('id') || '';
        
        // Safety checks & exclusions
        if (['email', 'password', 'number', 'tel', 'checkbox', 'radio', 'file'].includes(type)) return;
        if (name.toLowerCase().includes('email') || name.toLowerCase().includes('password')) return;
        if (id.toLowerCase().includes('email') || id.toLowerCase().includes('password')) return;
        
        const val = target.value;
        if (val && val.length > 0) {
          const firstChar = val.charAt(0);
          if (firstChar !== firstChar.toUpperCase()) {
            const capitalized = firstChar.toUpperCase() + val.slice(1);
            
            // Imperatively update value
            target.value = capitalized;
            
            // Dispatch synthetic event to let React's onChange sync state correctly
            const event = new Event('input', { bubbles: true });
            target.dispatchEvent(event);
          }
        }
      }
    };

    document.addEventListener('focusin', handleFocus, true);
    document.addEventListener('input', handleInput, true);

    return () => {
      document.removeEventListener('focusin', handleFocus, true);
      document.removeEventListener('input', handleInput, true);
    };
  }, []);

  return (
    <AuthProvider>
      <SocietyAuthProvider>
        <PushNotificationProvider>
          <OfflineDetector>
            <ScrollToTop />
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<CustomerAuth />} />
              <Route path="/terms" element={<LegalTerms />} />
              <Route path="/privacy" element={<LegalPrivacy />} />
              <Route path="/support" element={<HelpSupport />} />
              <Route path="/join-crew" element={<JoinAsCleaner />} />
              <Route path="/" element={<LandingPage />} />
              <Route path="/admin/login" element={<AdminLogin />} />

              {/* Protected: Customer Portal */}
              <Route
                path="/customer/*"
                element={
                  <ProtectedRoute role="customer" redirectTo="/login">
                    <CustomerApp />
                  </ProtectedRoute>
                }
              />

              {/* Protected: Cleaner Portal */}
              <Route
                path="/cleaner/*"
                element={
                  <ProtectedRoute role="cleaner" redirectTo="/login">
                    <CleanerApp />
                  </ProtectedRoute>
                }
              />

              {/* Protected: Admin Panel */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute role={['admin', 'superadmin']} redirectTo="/admin/login">
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />

              {/* Protected: Society Partner Portal */}
              <Route
                path="/society/login"
                element={<SocietyLogin />}
              />
              <Route
                path="/society/*"
                element={<SocietyApp />}
              />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </OfflineDetector>
        </PushNotificationProvider>
      </SocietyAuthProvider>
    </AuthProvider>
  )
}
