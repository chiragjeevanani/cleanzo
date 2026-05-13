import { useState, useEffect } from 'react'
import './LoadingScreen.css'

const statusMessages = [
  'INITIALIZING...',
  'SCANNING SOCIETY...',
  'PREPARING CREW...',
  'READY FOR SERVICE'
]

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0)
  const [statusIdx, setStatusIdx] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(() => onComplete?.(), 500)
          return 100
        }
        
        const newStatusIdx = Math.floor((prev / 100) * statusMessages.length)
        if (newStatusIdx !== statusIdx) setStatusIdx(newStatusIdx)

        return prev + 2
      })
    }, 40)
    return () => clearInterval(interval)
  }, [onComplete, statusIdx])

  return (
    <div className="loading-screen simple-theme">
      <div className="simple-loader-content">
        <div className="car-scan-wrap">
          <svg className="car-svg-simple" viewBox="0 0 200 80">
            <path d="M30 55 L45 35 L75 25 L130 25 L155 35 L170 55 L30 55" className="car-path-simple" />
            <path d="M20 55 L180 55" className="car-path-simple" />
            <circle cx="60" cy="55" r="8" className="car-path-simple" />
            <circle cx="150" cy="55" r="8" className="car-path-simple" />
          </svg>
          <div className="scan-bar" style={{ top: `${progress}%` }} />
        </div>

        <div className="brand-minimal">
          <h1 className="brand-name-simple">CLEANZO</h1>
          <div className="status-line">
            <span className="status-dot" /> {statusMessages[statusIdx]}
          </div>
        </div>

        <div className="progress-bar-simple">
          <div className="progress-fill-simple" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )
}
