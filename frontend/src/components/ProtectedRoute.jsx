import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — blocks unauthenticated access.
 * @param {string} role - 'customer' | 'cleaner' | 'admin' | 'superadmin'
 * @param {string} redirectTo - where to send unauthenticated users
 */
export default function ProtectedRoute({ children, role, redirectTo = '/login' }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
      }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '3px solid var(--border-glass)',
          borderTopColor: 'var(--accent-lime)',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Role-based guard
  if (role) {
    const userRole = user.role;
    const allowedRoles = Array.isArray(role) ? role : [role];
    if (!allowedRoles.includes(userRole)) {
      // Redirect to correct portal based on actual role
      if (userRole === 'customer') return <Navigate to="/customer" replace />;
      if (userRole === 'cleaner') return <Navigate to="/cleaner" replace />;
      if (userRole === 'admin' || userRole === 'superadmin') return <Navigate to="/admin" replace />;
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
