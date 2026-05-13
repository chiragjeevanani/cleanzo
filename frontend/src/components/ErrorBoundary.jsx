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
        background: 'var(--bg-primary, #0A0A0A)',
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{
          maxWidth: 440,
          width: '100%',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 28,
          padding: '48px 40px',
          textAlign: 'center',
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

          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 10, letterSpacing: '-0.02em' }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: 32 }}>
            The page ran into an unexpected error. This has been logged. Please try refreshing — your data is safe.
          </p>

          {import.meta.env.DEV && this.state.error && (
            <pre style={{
              textAlign: 'left', fontSize: 11, color: '#ff5555',
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
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', cursor: 'pointer',
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => { window.location.href = '/' }}
              style={{
                flex: 1, padding: '14px', borderRadius: 14, fontSize: 14, fontWeight: 700,
                background: '#DFFF00', border: 'none', color: '#000', cursor: 'pointer',
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
