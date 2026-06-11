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

  // Fetch public settings on mount to retrieve brand logos and trigger rerender
  const [logoUrls, setLogoUrls] = useState({
    dark: localStorage.getItem('cleanzo_dark_logo') || '/logo.png',
    light: localStorage.getItem('cleanzo_light_logo') || '/logo.png',
  });

  useEffect(() => {
    const fetchGlobalSettings = async () => {
      try {
        const res = await apiClient.get('/public/settings');
        if (res.success) {
          const dark = res.darkLogoUrl || '/logo.png';
          const light = res.lightLogoUrl || '/logo.png';
          setLogoUrls({ dark, light });
          localStorage.setItem('cleanzo_dark_logo', dark);
          localStorage.setItem('cleanzo_light_logo', light);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    fetchGlobalSettings();
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        const res = await apiClient.get('/auth/me');
        setUser(res.user);
      } catch (error) {
        // Silently fail on init — if they're on a public page, it doesn't matter.
        // Protected routes will handle their own redirects via ProtectedRoute.
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  // Sync auth state across tabs
  useEffect(() => {
    const handleStorageChange = async (e) => {
      if (e.key === 'token') {
        const token = e.newValue;
        if (!token) {
          setUser(null);
          setLoading(false);
        } else {
          try {
            const res = await apiClient.get('/auth/me');
            setUser(res.user);
          } catch {
            setUser(null);
          } finally {
            setLoading(false);
          }
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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

  const completeCustomerSignup = async (payload) => {
    try {
      const res = await apiClient.post('/auth/complete-signup', payload);
      localStorage.setItem('token', res.token);
      localStorage.setItem('refreshToken', res.refreshToken);
      localStorage.setItem('userRole', res.user.role);
      setUser(res.user);
      return { success: true };
    } catch (error) {
      const message = error.message || 'Signup completion failed';
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

  // Re-fetch the current user from the server (e.g. to pick up an area the admin
  // assigned, or refreshed stats). Returns the updated user or null.
  const refreshUser = async () => {
    try {
      const res = await apiClient.get('/auth/me');
      if (res?.user) { setUser(res.user); return res.user; }
    } catch { /* keep existing user on failure */ }
    return null;
  };

  // Permanently delete the signed-in account (App Store / Play Store
  // requirement). Routes by role, then clears local session like logout.
  const deleteAccount = async () => {
    const role = user?.role || localStorage.getItem('userRole');
    const endpoint = role === 'cleaner' ? '/cleaner/account' : '/customer/account';
    await apiClient.delete(endpoint);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, completeCustomerSignup, adminLogin, logout, deleteAccount, updateUser, refreshUser, logoUrls, setLogoUrls }}>
      {children}
    </AuthContext.Provider>
  );
};
