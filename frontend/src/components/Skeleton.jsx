export default function Skeleton({ width, height, borderRadius, style, className = "" }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: width || '100%',
        height: height || '20px',
        borderRadius: borderRadius || 'var(--radius)',
        ...style
      }}
    />
  )
}
