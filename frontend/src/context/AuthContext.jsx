import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { useToast } from './ToastContext';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const handler = () => showToast('Session expired, please log in again', 'error');
    window.addEventListener('auth:session-expired', handler);
    return () => window.removeEventListener('auth:session-expired', handler);
  }, [showToast]);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await apiClient.get('/auth/me');
          setUser(res.user);
        } catch (error) {
          console.error('Failed to restore session:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userRole');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (phone, otp, role, extra = {}) => {
    try {
      const res = await apiClient.post('/auth/verify-otp', {
        phone,
        code: otp,
        role,
        ...extra // firstName, lastName, email, password, city, referralCode for signup
      });
      localStorage.setItem('token', res.token);
      localStorage.setItem('refreshToken', res.refreshToken);
      localStorage.setItem('userRole', res.user.role);
      setUser(res.user);
      return { success: true };
    } catch (error) {
      const message = error.message || (typeof error === 'string' ? error : 'Verification failed');
      return { success: false, message };
    }
  };

  const loginWithPassword = async (phone, password, role) => {
    try {
      const res = await apiClient.post('/auth/login-password', { phone, password, role });
      localStorage.setItem('token', res.token);
      localStorage.setItem('refreshToken', res.refreshToken);
      localStorage.setItem('userRole', res.user.role);
      setUser(res.user);
      return { success: true };
    } catch (error) {
      const message = error.message || 'Invalid credentials';
      return { success: false, message };
    }
  };

  const adminLogin = async (email, password) => {
    try {
      const res = await apiClient.post('/auth/admin-login', { email, password });
      localStorage.setItem('token', res.token);
      localStorage.setItem('refreshToken', res.refreshToken);
      localStorage.setItem('userRole', res.user.role);
      setUser(res.user);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message || 'Invalid admin credentials' };
    }
  };

  const logout = async () => {
    const role = user?.role || localStorage.getItem('userRole');
    const refreshToken = localStorage.getItem('refreshToken');
    // Revoke the refresh token on the server so it can't be reused after logout
    if (refreshToken) {
      try {
        await apiClient.post('/auth/logout', { refreshToken });
      } catch {
        // Non-fatal: proceed with local logout even if the server call fails
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
    setUser(null);
    const isAdmin = role === 'admin' || role === 'superadmin';
    window.location.href = isAdmin ? '/admin/login' : '/login';
  };

  const updateUser = (updates) => setUser(prev => ({ ...prev, ...updates }));

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithPassword, adminLogin, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
