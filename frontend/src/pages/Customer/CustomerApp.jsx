import { lazy, Suspense } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Home, CreditCard, Clock, User, ShoppingBag } from 'lucide-react'
import PageLoader from '../../components/PageLoader'
import ErrorBoundary from '../../components/ErrorBoundary'

const CustomerHome       = lazy(() => import('./CustomerHome'))
const CustomerAuth       = lazy(() => import('./CustomerAuth'))
const VehicleManager     = lazy(() => import('./VehicleManager'))
const PackageSelect      = lazy(() => import('./PackageSelect'))
const BookingFlow        = lazy(() => import('./BookingFlow'))
const SubscriptionDetail = lazy(() => import('./SubscriptionDetail'))
const SkipService        = lazy(() => import('./SkipService'))
const ServiceHistory     = lazy(() => import('./ServiceHistory'))
const Notifications      = lazy(() => import('./Notifications'))
const CustomerProfile    = lazy(() => import('./CustomerProfile'))
const SavedAddresses     = lazy(() => import('./Profile/SavedAddresses'))
const TermsOfService     = lazy(() => import('./Profile/LegalTerms'))
const PrivacyPolicy      = lazy(() => import('./Profile/LegalPrivacy'))
const HelpSupport        = lazy(() => import('./Profile/HelpSupport'))
const PlanDetail         = lazy(() => import('./PlanDetail'))
const Marketplace        = lazy(() => import('./Marketplace'))

const tabs = [
  { path: '/customer', icon: Home, label: 'Home', end: true },
  { path: '/customer/packages', icon: CreditCard, label: 'Plans' },
  { path: '/customer/marketplace', icon: ShoppingBag, label: 'Shop' },
  { path: '/customer/history', icon: Clock, label: 'History' },
  { path: '/customer/profile', icon: User, label: 'Profile' },
]

export default function CustomerApp() {
  const { user, loading, logout } = useAuth()

  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="app-shell">
      <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route index element={<CustomerHome />} />
          <Route path="subscriptions" element={<SubscriptionDetail />} />
          <Route path="history" element={<ServiceHistory />} />
          <Route path="profile" element={<CustomerProfile />} />
          <Route path="vehicles" element={<VehicleManager />} />
          <Route path="packages" element={<PackageSelect />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="plan/:id" element={<PlanDetail />} />
          <Route path="booking" element={<BookingFlow />} />
          <Route path="skip" element={<SkipService />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="addresses" element={<SavedAddresses />} />
          <Route path="terms" element={<TermsOfService />} />
          <Route path="privacy" element={<PrivacyPolicy />} />
          <Route path="help" element={<HelpSupport />} />
          <Route path="auth" element={<CustomerAuth />} />
          <Route path="*" element={<Navigate to="/customer" replace />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>

      <nav className="bottom-nav">
        {tabs.map(t => (
          <NavLink key={t.path} to={t.path} end={t.end} className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            <t.icon size={22} />
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
