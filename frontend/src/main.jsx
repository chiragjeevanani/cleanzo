import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

// Unregister stale PWA service workers — but KEEP the Firebase messaging SW and our PWA SW
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      const scriptURL = registration.active?.scriptURL || '';
      const shouldKeep = 
        scriptURL.includes('firebase-messaging-sw') || 
        scriptURL.includes('sw.js') || 
        scriptURL.includes('registerSW.js');

      if (!shouldKeep) {
        registration.unregister();
      }
    }
  });
}

// Disable double-tap and pinch-to-zoom gestures (primarily for iOS Safari)
document.addEventListener('gesturestart', (e) => {
  e.preventDefault();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ThemeProvider>
          <ToastProvider>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)

