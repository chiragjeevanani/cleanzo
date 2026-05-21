import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { useToast } from './ToastContext';

const SocietyAuthContext = createContext();

export const useSocietyAuth = () => useContext(SocietyAuthContext);

export const SocietyAuthProvider = ({ children }) => {
  const [societyUser, setSocietyUser] = useState(null);
  const [societyLoading, setSocietyLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('userRole');
      if (!token || role !== 'society') {
        setSocietyLoading(false);
        return;
      }
      try {
        const res = await apiClient.get('/society/profile');
        if (res.success) {
          setSocietyUser(res.profile);
        }
      } catch (error) {
        // Silently fail on init, protected route will handle redirect
      } finally {
        setSocietyLoading(false);
      }
    };
    initAuth();
  }, []);

  const societyLogin = async (email, password) => {
    try {
      const res = await apiClient.post('/auth/society-login', { email, password });
      if (res.success) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('refreshToken', res.refreshToken);
        localStorage.setItem('userRole', 'society');
        setSocietyUser(res.user);
        return { success: true };
      }
      return { success: false, message: 'Invalid credentials' };
    } catch (error) {
      return { success: false, message: error.message || 'Login failed' };
    }
  };

  const societyLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await apiClient.post('/auth/logout', { refreshToken });
      } catch {}
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
    setSocietyUser(null);
    window.location.href = '/society/login';
  };

  const updateSocietyUser = (updates) => setSocietyUser(prev => ({ ...prev, ...updates }));

  return (
    <SocietyAuthContext.Provider value={{ societyUser, societyLoading, societyLogin, societyLogout, updateSocietyUser }}>
      {children}
    </SocietyAuthContext.Provider>
  );
};
