import { describe, it, expect } from 'vitest'
import { getPackagePricing } from '../utils/pricing'

const pkg = { _id: 'pkg1', price: 1000 }
const vehicle = { brand: 'Maruti', model: 'Swift' }

describe('getPackagePricing', () => {
  it('returns no discount when nothing configured', () => {
    const r = getPackagePricing(pkg, vehicle, { global: {}, individual: [] })
    expect(r.hasDiscount).toBe(false)
    expect(r.effectivePrice).toBe(1000)
  })

  it('applies the active global discount', () => {
    const r = getPackagePricing(pkg, vehicle, { global: { percent: 20, note: 'Sale', isActive: true }, individual: [] })
    expect(r.effectivePrice).toBe(800)
    expect(r.percent).toBe(20)
    expect(r.source).toBe('global')
  })

  it('individual override beats global for the matching vehicle only', () => {
    const config = {
      global: { percent: 20, isActive: true },
      individual: [{ package: 'pkg1', brand: 'Maruti', model: 'Swift', percent: 30, note: 'Swift', isActive: true }],
    }
    expect(getPackagePricing(pkg, vehicle, config).effectivePrice).toBe(700)
    expect(getPackagePricing(pkg, { brand: 'Maruti', model: 'Baleno' }, config).effectivePrice).toBe(800)
  })

  it('never discounts a trial package', () => {
    const r = getPackagePricing({ _id: 't', price: 30, isTrial: true }, vehicle, { global: { percent: 50, isActive: true }, individual: [] })
    expect(r.hasDiscount).toBe(false)
    expect(r.effectivePrice).toBe(30)
  })

  it('falls back to global when no vehicle is provided (landing page)', () => {
    const config = {
      global: { percent: 15, isActive: true },
      individual: [{ package: 'pkg1', brand: 'Maruti', model: 'Swift', percent: 30, isActive: true }],
    }
    const r = getPackagePricing(pkg, null, config)
    expect(r.source).toBe('global')
    expect(r.effectivePrice).toBe(850)
  })
})
