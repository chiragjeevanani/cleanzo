import { createContext, useContext, useState, useCallback, useRef } from 'react'

export const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [exiting, setExiting] = useState(new Set()) // ids currently playing exit animation
  const idRef = useRef(0)

  const dismissToast = useCallback((id) => {
    // Play exit animation, then actually remove after 220ms
    setExiting(prev => new Set([...prev, id]))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      setExiting(prev => { const s = new Set(prev); s.delete(id); return s })
    }, 220)
  }, [])

  const showToast = useCallback((message, type = 'success', duration = 3500, onClick = null) => {
    const id = ++idRef.current
    const loading = duration === 0
    setToasts(prev => [...prev, { id, message, type, onClick, loading }])
    if (duration > 0) {
      setTimeout(() => dismissToast(id), duration)
    }
    return id // caller can dismiss progress toasts manually
  }, [dismissToast])

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <ToastStack toasts={toasts} exiting={exiting} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

// ── Keyframes injected once at module level ───────────────────────────────────
const STYLE_ID = '__toast_styles__'
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    @keyframes toastIn {
      from { opacity: 0; transform: translateY(-14px) scale(0.94); }
      to   { opacity: 1; transform: translateY(0)     scale(1);    }
    }
    @keyframes toastOut {
      from { opacity: 1; transform: translateY(0)     scale(1);    }
      to   { opacity: 0; transform: translateY(-10px) scale(0.92); }
    }
    @keyframes toastSpin {
      to { transform: rotate(360deg); }
    }
  `
  document.head.appendChild(style)
}

const typeStyles = {
  success: {
    background: 'var(--accent-lime)',
    color: '#0A0A0A',
    boxShadow: '0 8px 32px rgba(223,255,0,0.25)',
  },
  error: {
    background: 'rgba(255,69,58,0.95)',
    color: '#fff',
    boxShadow: '0 8px 32px rgba(255,69,58,0.3)',
  },
  info: {
    background: 'rgba(10,10,10,0.92)',
    color: '#fff',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(12px)',
  },
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block',
      width: 14,
      height: 14,
      borderRadius: '50%',
      border: '2.5px solid rgba(255,255,255,0.25)',
      borderTopColor: '#fff',
      flexShrink: 0,
      animation: 'toastSpin 0.7s linear infinite',
    }} />
  )
}

function ToastStack({ toasts, exiting, onDismiss }) {
  if (toasts.length === 0) return null
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'none',
        width: 'max-content',
        maxWidth: 'min(90vw, 380px)',
      }}
    >
      {toasts.map(t => {
        const isExiting = exiting.has(t.id)
        return (
          <div
            key={t.id}
            onClick={() => { if (t.onClick) t.onClick(); onDismiss(t.id) }}
            style={{
              ...(typeStyles[t.type] ?? typeStyles.info),
              padding: t.loading ? '11px 18px 11px 14px' : '12px 20px',
              borderRadius: 22,
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              width: '100%',
              textAlign: t.loading ? 'left' : 'center',
              cursor: 'pointer',
              pointerEvents: 'auto',
              animation: isExiting
                ? 'toastOut 220ms ease forwards'
                : 'toastIn 280ms cubic-bezier(0.34,1.56,0.64,1) both',
              wordBreak: 'break-word',
              letterSpacing: '0.01em',
              display: 'flex',
              alignItems: 'center',
              gap: t.loading ? 10 : 0,
              justifyContent: t.loading ? 'flex-start' : 'center',
            }}
          >
            {t.loading && <Spinner />}
            <span>{t.message}</span>
          </div>
        )
      })}
    </div>
  )
}
