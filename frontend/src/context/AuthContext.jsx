import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
          logout();
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
      setUser(res.user);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message || 'Invalid admin credentials' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithPassword, adminLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
