import Settings from '../models/Settings.js';
import PackageDiscount from '../models/PackageDiscount.js';

/**
 * Load the current discount configuration from the database.
 * Returns { global: { percent, note, isActive }, individual: [PackageDiscount] }
 */
export const getDiscountConfig = async () => {
  const [globalSetting, individual] = await Promise.all([
    Settings.findOne({ key: 'packageDiscount' }),
    PackageDiscount.find({ isActive: true }),
  ]);
  const global = globalSetting?.value || { percent: 0, note: '', isActive: false };
  return { global, individual };
};

/**
 * Resolve the discount that applies to a package for a given vehicle.
 *
 * Priority:
 *   1. An active individual discount matching package + brand + model
 *      (exact-model match preferred over brand-wide blank-model match).
 *   2. The global discount, when active and > 0.
 *   3. No discount.
 *
 * Returns { originalPrice, effectivePrice, percent, note, hasDiscount, source }.
 * Never applies to trials — pass a non-trial package price.
 */
export const resolvePackageDiscount = (pkg, vehicle, config) => {
  const price = pkg?.price ?? 0;
  const none = { originalPrice: price, effectivePrice: price, percent: 0, note: '', hasDiscount: false, source: 'none' };
  if (!pkg || price <= 0 || !config) return none;

  const { global = {}, individual = [] } = config;
  const pkgId = String(pkg._id);

  let chosen = null;
  if (vehicle?.brand) {
    const brand = vehicle.brand.toLowerCase();
    const model = (vehicle.model || '').toLowerCase();
    const matches = individual.filter(d =>
      d.isActive !== false &&
      String(d.package) === pkgId &&
      (d.brand || '').toLowerCase() === brand &&
      (!d.model || d.model.toLowerCase() === model)
    );
    // Prefer an exact model match over a brand-wide (blank model) discount
    chosen = matches.find(d => d.model && d.model.toLowerCase() === model) || matches.find(d => !d.model) || null;
  }

  let percent = 0;
  let note = '';
  let source = 'none';

  if (chosen) {
    percent = chosen.percent;
    note = chosen.note || '';
    source = 'individual';
  } else if (global.isActive && global.percent > 0) {
    percent = global.percent;
    note = global.note || '';
    source = 'global';
  }

  if (!percent || percent <= 0) return none;

  const safePercent = Math.min(Math.max(percent, 0), 100);
  const effectivePrice = Math.round(price * (1 - safePercent / 100));
  return { originalPrice: price, effectivePrice, percent: safePercent, note, hasDiscount: true, source };
};
