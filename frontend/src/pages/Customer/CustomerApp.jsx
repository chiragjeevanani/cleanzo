import { useState } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { Home, CreditCard, Clock, User } from 'lucide-react'
import CustomerHome from './CustomerHome'
import CustomerAuth from './CustomerAuth'
import VehicleManager from './VehicleManager'
import PackageSelect from './PackageSelect'
import BookingFlow from './BookingFlow'
import SubscriptionDetail from './SubscriptionDetail'
import SkipService from './SkipService'
import ServiceHistory from './ServiceHistory'
import Notifications from './Notifications'
import CustomerProfile from './CustomerProfile'
import SavedAddresses from './Profile/SavedAddresses'
import TermsOfService from './Profile/TermsOfService'
import PrivacyPolicy from './Profile/PrivacyPolicy'
import HelpSupport from './Profile/HelpSupport'
import PlanDetail from './PlanDetail'

const tabs = [
  { path: '/customer', icon: Home, label: 'Home', end: true },
  { path: '/customer/packages', icon: CreditCard, label: 'Plans' },
  { path: '/customer/history', icon: Clock, label: 'History' },
  { path: '/customer/profile', icon: User, label: 'Profile' },
]

export default function CustomerApp() {
  const [authed] = useState(true) // mock auth

  if (!authed) return <CustomerAuth />

  return (
    <div className="app-shell">
      <Routes>
        <Route index element={<CustomerHome />} />
        <Route path="subscriptions" element={<SubscriptionDetail />} />
        <Route path="history" element={<ServiceHistory />} />
        <Route path="profile" element={<CustomerProfile />} />
        <Route path="vehicles" element={<VehicleManager />} />
        <Route path="packages" element={<PackageSelect />} />
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
