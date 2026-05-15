import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../services/apiClient';

const CustomerDataContext = createContext();

export const useCustomerData = () => useContext(CustomerDataContext);

export const CustomerDataProvider = ({ children }) => {
  const [vehicles, setVehicles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [packages, setPackages] = useState([]);
  const [societies, setSocieties] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [banners, setBanners] = useState([]);
  const [history, setHistory] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({});
  
  const [loading, setLoading] = useState({
    vehicles: false,
    categories: false,
    packages: false,
    societies: false,
    subscriptions: false,
    notifications: false,
    banners: false,
    history: false,
    products: false,
    settings: false,
  });

  const initialized = useRef({
    vehicles: false,
    categories: false,
    packages: false,
    societies: false,
    subscriptions: false,
    notifications: false,
    banners: false,
    history: false,
    products: false,
    settings: false,
  });

  const fetchData = useCallback(async (key, endpoint, setter, force = false) => {
    if (initialized.current[key] && !force) return;
    
    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      const res = await apiClient.get(endpoint);
      let data = res;
      // Handle standard response wrappers
      if (key === 'vehicles') data = res.vehicles || [];
      if (key === 'categories') data = res.categories || [];
      if (key === 'packages') data = res.packages || [];
      if (key === 'societies') data = res.societies || [];
      if (key === 'subscriptions') data = res.subscriptions || [];
      if (key === 'notifications') data = res.notifications || [];
      if (key === 'banners') data = res.banners || [];
      if (key === 'history') data = res.tasks || [];
      if (key === 'products') data = res.products || [];
      
      setter(data);
      initialized.current[key] = true;
    } catch (err) {
      console.error(`Error fetching ${key}:`, err);
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  }, []);

  const refreshVehicles = useCallback((force = true) => fetchData('vehicles', '/customer/vehicles', setVehicles, force), [fetchData]);
  const refreshCategories = useCallback((force = true) => fetchData('categories', '/customer/vehicle-categories', setCategories, force), [fetchData]);
  const refreshPackages = useCallback((force = true) => fetchData('packages', '/packages', setPackages, force), [fetchData]);
  const refreshSocieties = useCallback((force = true) => fetchData('societies', '/customer/societies', setSocieties, force), [fetchData]);
  const refreshSubscriptions = useCallback((force = true) => fetchData('subscriptions', '/customer/subscriptions', setSubscriptions, force), [fetchData]);
  const refreshNotifications = useCallback((force = true) => fetchData('notifications', '/customer/notifications', setNotifications, force), [fetchData]);
  const refreshBanners = useCallback((force = true) => fetchData('banners', '/public/banners', setBanners, force), [fetchData]);
  const refreshHistory = useCallback((force = true) => fetchData('history', '/customer/history', setHistory, force), [fetchData]);
  const refreshProducts = useCallback((force = true) => fetchData('products', '/public/products', setProducts, force), [fetchData]);
  const refreshSettings = useCallback((force = true) => fetchData('settings', '/public/settings', (data) => setSettings(data || {}), force), [fetchData]);

  const refreshAll = useCallback(() => {
    refreshVehicles(true);
    refreshCategories(true);
    refreshPackages(true);
    refreshSocieties(true);
    refreshSubscriptions(true);
    refreshNotifications(true);
    refreshBanners(true);
    refreshHistory(true);
    refreshProducts(true);
    refreshSettings(true);
  }, [refreshVehicles, refreshCategories, refreshPackages, refreshSocieties, refreshSubscriptions, refreshNotifications, refreshBanners, refreshHistory, refreshProducts, refreshSettings]);

  // Initial load
  useEffect(() => {
    fetchData('vehicles', '/customer/vehicles', setVehicles);
    fetchData('categories', '/customer/vehicle-categories', setCategories);
    fetchData('packages', '/packages', setPackages);
    fetchData('societies', '/customer/societies', setSocieties);
    fetchData('subscriptions', '/customer/subscriptions', setSubscriptions);
    fetchData('notifications', '/customer/notifications', setNotifications);
    fetchData('banners', '/public/banners', setBanners);
    fetchData('history', '/customer/history', setHistory);
    fetchData('products', '/public/products', setProducts);
    fetchData('settings', '/public/settings', (data) => setSettings(data || {}));
  }, [fetchData]);

  return (
    <CustomerDataContext.Provider value={{
      vehicles, categories, packages, societies, subscriptions, notifications, banners, history, products, settings,
      loading,
      refreshVehicles, refreshCategories, refreshPackages, refreshSocieties, refreshSubscriptions, 
      refreshNotifications, refreshBanners, refreshHistory, refreshProducts, refreshSettings, refreshAll
    }}>
      {children}
    </CustomerDataContext.Provider>
  );
};
