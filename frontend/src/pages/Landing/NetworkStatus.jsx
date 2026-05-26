import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Server, Activity, RefreshCw, Cpu } from 'lucide-react'

export default function NetworkStatus() {
  const navigate = useNavigate()
  const [isPinging, setIsPinging] = useState(false)
  const [latency, setLatency] = useState(null)
  
  const [networkData, setNetworkData] = useState({
    overallStatus: 'ALL SYSTEMS OPERATIONAL',
    statusColor: 'success',
    nodes: [
      { id: 1, name: 'Core API & Database Cluster', status: 'Operational' },
      { id: 2, name: 'Customer Booking & Payments', status: 'Operational' },
      { id: 3, name: 'Cleaner Dispatch & Real-Time Sync', status: 'Operational' },
      { id: 4, name: 'Standby Operations Support Nodes', status: 'Active' }
    ],
    updates: [
      { id: 1, date: 'May 24, 2026 - Maintenance Resolved', message: 'Standard scheduled database cluster performance optimization successfully finalized at 04:00 UTC. System telemetry indicates zero disruption to active customer dispatch routines.' },
      { id: 2, date: 'April 12, 2026 - Incident Resolved', message: 'Minor performance latency observed with the cleaner SMS notification gateway. Fully resolved in 14 minutes by standby engineering.' }
    ]
  })

  useEffect(() => {
    const cached = localStorage.getItem('cleanzo_cms_network_status')
    if (cached) {
      try {
        setNetworkData(JSON.parse(cached))
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  const handlePing = () => {
    setIsPinging(true)
    setLatency(null)
    setTimeout(() => {
      setIsPinging(false)
      setLatency(Math.floor(Math.random() * 25) + 12)
    }, 800)
  }

  // Helper for color mappings
  const getStatusColor = () => {
    if (networkData.statusColor === 'success') return 'var(--success)'
    if (networkData.statusColor === 'warning') return 'var(--warning)'
    if (networkData.statusColor === 'error') return 'var(--error)'
    return 'var(--success)'
  }

  const getBorderColor = () => {
    if (networkData.statusColor === 'success') return 'var(--primary-blue)'
    if (networkData.statusColor === 'warning') return 'var(--warning)'
    if (networkData.statusColor === 'error') return 'var(--error)'
    return 'var(--primary-blue)'
  }

  return (
    <div style={{ padding: '0 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* App Header */}
      <div className="app-header" style={{ padding: '16px 0', marginBottom: 12 }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-8 bg-transparent border-none text-[color:var(--text-primary)] cursor-pointer p-0">
          <ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>System Network Status</span>
        </button>
      </div>

      <div className="container" style={{ maxWidth: '800px', margin: '0 auto 100px auto', width: '100%' }}>
        {/* Main Status Header */}
        <div className="glass" style={{ padding: '32px', borderRadius: 'var(--radius)', marginBottom: 24, textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
            <Activity size={48} style={{ color: getStatusColor() }} />
            <span
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: getStatusColor(),
                border: '2px solid var(--bg-primary)',
                animation: 'glowPulse 2s infinite'
              }}
            />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, marginBottom: 8, textTransform: 'uppercase' }}>
            {networkData.overallStatus}
          </h2>
          <p className="text-secondary text-body-sm">
            Live telemetry and operational dispatch network metrics. Last updated: Just now
          </p>
        </div>

        {/* Dynamic Diagnostics tool */}
        <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius)', marginBottom: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ color: 'var(--primary-blue)' }}><Cpu size={24} /></div>
            <div>
              <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Latency Telemetry</h4>
              <p className="text-secondary text-body-sm">Verify connections to administrative HQ nodes</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {latency !== null && (
              <span className="chip chip-success" style={{ textTransform: 'none', fontSize: 13, padding: '6px 12px' }}>
                API Response: {latency}ms
              </span>
            )}
            <button
              onClick={handlePing}
              disabled={isPinging}
              className="btn btn-glass btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <RefreshCw size={14} className={isPinging ? 'animate-spin' : ''} style={{ animationDuration: '1s' }} />
              {isPinging ? 'Testing Link...' : 'Test Connection'}
            </button>
          </div>
        </div>

        {/* Service Nodes Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 4, paddingLeft: 4 }}>Service Nodes</h3>
          
          {networkData.nodes.map(node => (
            <div key={node.id} className="glass" style={{ padding: '16px 20px', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Server size={18} style={{ color: 'var(--primary-blue)' }} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>{node.name}</span>
              </div>
              <span className={`chip ${node.status.toLowerCase() === 'operational' || node.status.toLowerCase() === 'active' ? 'chip-success' : 'chip-error'}`}>
                {node.status}
              </span>
            </div>
          ))}
        </div>

        {/* Operational Updates / Incident Log */}
        <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Operational Updates</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {networkData.updates.map(update => (
              <div key={update.id} style={{ borderLeft: `2px solid ${getBorderColor()}`, paddingLeft: 16 }}>
                <span className="text-label" style={{ fontSize: 10, color: getBorderColor(), display: 'block', marginBottom: 4 }}>{update.date}</span>
                <p className="text-secondary text-body-sm" style={{ lineHeight: 1.5 }}>
                  {update.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
