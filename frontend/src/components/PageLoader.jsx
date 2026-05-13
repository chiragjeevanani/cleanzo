export default function PageLoader() {
  return (
    <div
      className="loader-overlay"
      role="status"
      aria-label="Loading"
      aria-live="polite"
    >
      <div className="loader" />
    </div>
  )
}
