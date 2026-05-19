/**
 * Gets the current Date object shifted to Indian Standard Time (IST)
 */
export const getISTDate = () => {
  const now = new Date();
  // India is UTC + 5:30 (5.5 hours)
  const offset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + offset);
};

/**
 * Returns a Date object representing UTC midnight (00:00:00.000Z)
 * for the current day in IST (or a specific date).
 * This ensures that calendar days are stored timezone-independently
 * as YYYY-MM-DDT00:00:00.000Z in MongoDB.
 */
export const getISTMidnight = (date = new Date()) => {
  // If date is a string, parse it first
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Shift to IST to determine the calendar day in India
  // 5.5 hours offset
  const offset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(d.getTime() + offset);
  
  const year = istDate.getUTCFullYear();
  const month = istDate.getUTCMonth();
  const day = istDate.getUTCDate();
  
  return new Date(Date.UTC(year, month, day));
};
