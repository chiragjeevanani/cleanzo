import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{
          maxWidth: 440,
          width: '100%',
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-glass)',
          borderRadius: 28,
          padding: '48px 40px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-lg)',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(255,69,58,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: 32,
          }}>
            ⚠️
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10, letterSpacing: '-0.02em' }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 32 }}>
            The page ran into an unexpected error. This has been logged. Please try refreshing — your data is safe.
          </p>

          {import.meta.env.DEV && this.state.error && (
            <pre style={{
              textAlign: 'left', fontSize: 11, color: 'var(--error)',
              background: 'rgba(255,50,50,0.06)',
              border: '1px solid rgba(255,50,50,0.2)',
              borderRadius: 12, padding: 16, marginBottom: 28,
              overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {this.state.error.message}
            </pre>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                flex: 1, padding: '14px', borderRadius: 14, fontSize: 14, fontWeight: 700,
                background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
                color: 'var(--text-primary)', cursor: 'pointer',
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => {
                const path = window.location.pathname;
                if (path.startsWith('/admin')) {
                  window.location.href = '/admin';
                } else if (path.startsWith('/cleaner')) {
                  window.location.href = '/cleaner';
                } else if (path.startsWith('/society')) {
                  window.location.href = '/society';
                } else {
                  window.location.href = '/customer';
                }
              }}
              style={{
                flex: 1, padding: '14px', borderRadius: 14, fontSize: 14, fontWeight: 700,
                background: 'var(--bg-accent)', border: 'none', color: 'var(--text-on-accent)', cursor: 'pointer',
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    )
  }
}
