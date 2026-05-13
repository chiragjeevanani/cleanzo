import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

const typeStyles = {
  success: { background: 'var(--accent-lime)', color: '#0A0A0A', boxShadow: '0 8px 32px rgba(223,255,0,0.25)' },
  error:   { background: 'rgba(255,69,58,0.95)', color: '#fff', boxShadow: '0 8px 32px rgba(255,69,58,0.3)' },
  info:    { background: 'rgba(0,122,255,0.95)', color: '#fff', boxShadow: '0 8px 32px rgba(0,122,255,0.3)' },
}

function ToastStack({ toasts, onDismiss }) {
  if (toasts.length === 0) return null
  return (
    <div role="status" aria-live="polite" aria-atomic="false" style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id}
          onClick={() => onDismiss(t.id)}
          style={{
            ...typeStyles[t.type] || typeStyles.info,
            padding: '12px 20px',
            borderRadius: 20,
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            maxWidth: 320,
            textAlign: 'center',
            cursor: 'pointer',
            pointerEvents: 'auto',
            animation: 'fadeInUp 250ms var(--ease-out) both',
            whiteSpace: 'nowrap',
            letterSpacing: '0.01em',
          }}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
