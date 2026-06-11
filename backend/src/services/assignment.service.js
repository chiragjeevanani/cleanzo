import Cleaner from '../models/Cleaner.js';

/**
 * Build the pool of cleaners eligible to work in a given city today.
 *
 * Enforces the HARD city boundary: only cleaners whose `city` matches the
 * society's city are ever returned. A cleaner is never assigned across cities.
 * Matching is case-insensitive/trimmed because society.city (admin free-text)
 * and cleaner.city (signup dropdown) can differ in casing.
 *
 * Excludes inactive / unavailable cleaners and those on approved leave today.
 *
 * @param {string} city                 the society's city
 * @param {Set<string>} onLeaveSet      cleaner ids (string) on approved leave today
 * @returns {Promise<Array<{_id, name, city}>>}
 */
export const buildCityCleanerPool = async (city, onLeaveSet) => {
  if (!city) return [];
  const cleaners = await Cleaner.find({
    isActive: true,
    isAvailable: true,
    city: { $regex: new RegExp(`^\\s*${escapeRegex(city.trim())}\\s*$`, 'i') },
  }).select('_id name city').lean();
  return cleaners.filter(c => !onLeaveSet.has(c._id.toString()));
};

/**
 * Whether a cleaner may be assigned to a society — true only when both sit in
 * the same city (case-insensitive/trimmed).
 */
export const isSameCity = (a, b) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
