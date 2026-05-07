import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LandingPage from './pages/Landing/LandingPage'
import CustomerApp from './pages/Customer/CustomerApp'
import CleanerApp from './pages/Cleaner/CleanerApp'
import AdminPanel from './pages/Admin/AdminPanel'
import AdminLogin from './pages/Admin/AdminLogin'
import TermsOfService from './pages/Customer/Profile/TermsOfService'
import PrivacyPolicy from './pages/Customer/Profile/PrivacyPolicy'
import HelpSupport from './pages/Customer/Profile/HelpSupport'
import CustomerAuth from './pages/Customer/CustomerAuth'
import JoinAsCleaner from './pages/Landing/JoinAsCleaner'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<CustomerAuth />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
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

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

