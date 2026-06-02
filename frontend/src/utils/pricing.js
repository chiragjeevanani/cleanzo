// Shared package-discount pricing helper (display only — the backend re-derives
// the authoritative amount at booking time).
//
// discounts shape (from GET /public/discounts):
//   { global: { percent, note, isActive }, individual: [{ package, brand, model, percent, note }] }

/**
 * Resolve the discount that applies to a package for a given vehicle.
 *
 * Priority:
 *   1. An active individual discount matching package + brand + model
 *      (exact-model match preferred over a brand-wide blank-model match).
 *   2. The global discount, when active and > 0.
 *   3. No discount.
 */
export function getPackagePricing(pkg, vehicle, discounts) {
  const price = Number(pkg?.price) || 0
  const none = { originalPrice: price, effectivePrice: price, percent: 0, note: '', hasDiscount: false, source: 'none' }
  // Discounts never apply to trials or to packages with no real price
  if (!pkg || pkg.isTrial || price <= 0 || !discounts) return none

  const global = discounts.global || {}
  const individual = discounts.individual || []
  const pkgId = String(pkg._id)

  let chosen = null
  if (vehicle?.brand) {
    const brand = vehicle.brand.toLowerCase()
    const model = (vehicle.model || '').toLowerCase()
    const matches = individual.filter(d =>
      String(d.package) === pkgId &&
      (d.brand || '').toLowerCase() === brand &&
      (!d.model || d.model.toLowerCase() === model)
    )
    chosen = matches.find(d => d.model && d.model.toLowerCase() === model) || matches.find(d => !d.model) || null
  }

  let percent = 0
  let note = ''
  let source = 'none'

  if (chosen) {
    percent = chosen.percent
    note = chosen.note || ''
    source = 'individual'
  } else if (global.isActive && global.percent > 0) {
    percent = global.percent
    note = global.note || ''
    source = 'global'
  }

  if (!percent || percent <= 0) return none

  const safePercent = Math.min(Math.max(percent, 0), 100)
  const effectivePrice = Math.round(price * (1 - safePercent / 100))
  return { originalPrice: price, effectivePrice, percent: safePercent, note, hasDiscount: true, source }
}
