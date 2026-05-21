import { Routes, Route, Navigate } from 'react-router-dom'
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
import ForgotPassword from './pages/Customer/ForgotPassword'
import JoinAsCleaner from './pages/Landing/JoinAsCleaner'
import SocietyLogin from './pages/Society/SocietyLogin'
import SocietyApp from './pages/Society/SocietyApp'

export default function App() {
  return (
    <AuthProvider>
      <SocietyAuthProvider>
        <PushNotificationProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<CustomerAuth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/terms" element={<LegalTerms />} />
            <Route path="/privacy" element={<LegalPrivacy />} />
            <Route path="/help" element={<HelpSupport />} />
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
        </PushNotificationProvider>
      </SocietyAuthProvider>
    </AuthProvider>
  )
}

