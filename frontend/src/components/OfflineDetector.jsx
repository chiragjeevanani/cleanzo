import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import './OfflineDetector.css';

export default function OfflineDetector({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [bootedOffline, setBootedOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setBootedOffline(false); // Automatically clear full-screen offline page on reconnect
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handler to manually retry/reload the app
  const handleRetry = () => {
    if (navigator.onLine) {
      setIsOnline(true);
      setBootedOffline(false);
    } else {
      // Pulse animation trigger or simple console feedback
      console.log('Still offline, cannot reconnect yet.');
    }
  };

  // Scenario 1: App refreshed or opened while completely offline
  if (bootedOffline) {
    return (
      <div className="offline-screen theme-dark">
        <div className="offline-card">
          <div className="offline-icon-container">
            <div className="offline-icon-glow" />
            <div className="offline-icon-wrapper">
              <WifiOff size={40} />
            </div>
          </div>
          <h1 className="offline-title">You're Offline</h1>
          <p className="offline-desc">
            Cleanzo needs an internet connection to run. Please check your network connection and try again.
          </p>
          <button onClick={handleRetry} className="offline-btn">
            <RefreshCw size={18} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Scenario 2: App was loaded online, but later lost connection
  return (
    <>
      {!isOnline && (
        <div className="offline-banner">
          <WifiOff size={16} className="offline-banner-icon" />
          <span>Connection lost. Operating in offline mode.</span>
        </div>
      )}
      {children}
    </>
  );
}
