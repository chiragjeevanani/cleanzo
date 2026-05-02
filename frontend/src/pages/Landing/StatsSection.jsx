import { useEffect, useRef, useState } from 'react'
import './StatsSection.css'

const stats = [
  { value: 365, suffix: ' Days', label: 'Working (No Holidays)' },
  { value: 10, suffix: ' AM', label: 'Done by (5 AM Start)' },
  { value: 10000, suffix: '+', label: 'Cars Cleaned Daily' },
  { value: 4.9, suffix: '★', label: 'Customer Trust', decimals: 1 },
]

function CountUp({ target, decimals = 0, suffix = '' }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let start = 0
        const duration = 2000
        const step = (ts) => {
          if (!start) start = ts
          const p = Math.min((ts - start) / duration, 1)
          const eased = 1 - Math.pow(1 - p, 4)
          setVal(eased * target)
          if (p < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
        observer.disconnect()
      }
    }, { threshold: 0.5 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])

  return (
    <span ref={ref} className="stat-number">
      {decimals ? val.toFixed(decimals) : Math.round(val).toLocaleString()}{suffix}
    </span>
  )
}

export default function StatsSection() {
  return (
    <section className="stats-section">
      <div className="container">
        <div className="stats-grid">
          {stats.map((s, i) => (
            <div key={i} className="stat-item reveal" style={{ transitionDelay: `${i * 100}ms` }}>
              <CountUp target={s.value} decimals={s.decimals || 0} suffix={s.suffix} />
              <span className="stat-label text-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
