import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Clock, User } from 'lucide-react'
import CleanerDashboard from './CleanerDashboard'
import CleanerTasks from './CleanerTasks'
import TaskDetail from './TaskDetail'
import PhotoUpload from './PhotoUpload'
import CleanerHistory from './CleanerHistory'
import CleanerProfile from './CleanerProfile'

const tabs = [
  { path: '/cleaner', icon: LayoutDashboard, label: 'Home', end: true },
  { path: '/cleaner/tasks', icon: ClipboardList, label: 'Tasks' },
  { path: '/cleaner/history', icon: Clock, label: 'History' },
  { path: '/cleaner/profile', icon: User, label: 'Profile' },
]

export default function CleanerApp() {
  return (
    <div className="app-shell">
      <Routes>
        <Route index element={<CleanerDashboard />} />
        <Route path="tasks" element={<CleanerTasks />} />
        <Route path="tasks/:id" element={<TaskDetail />} />
        <Route path="upload" element={<PhotoUpload />} />
        <Route path="history" element={<CleanerHistory />} />
        <Route path="profile" element={<CleanerProfile />} />
        <Route path="*" element={<Navigate to="/cleaner" replace />} />
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
