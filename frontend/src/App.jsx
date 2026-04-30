import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/Landing/LandingPage'
import CustomerApp from './pages/Customer/CustomerApp'
import CleanerApp from './pages/Cleaner/CleanerApp'
import AdminPanel from './pages/Admin/AdminPanel'

export default function App() {
  return (
    <Routes>
      <Route path="/*" element={<LandingPage />} />
      <Route path="/customer/*" element={<CustomerApp />} />
      <Route path="/cleaner/*" element={<CleanerApp />} />
      <Route path="/admin/*" element={<AdminPanel />} />
    </Routes>
  )
}
