// Agronomic calculation utilities for crop lifecycle tracking

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calculates elapsed days since crop sowing date.
 * Counts live from sowing date so all dashboards and tasks stay synchronized with real-time.
 */
export const daysSince = (isoDate, now = new Date()) => {
  if (!isoDate) return 0;
  const parsed = Date.parse(isoDate);
  if (isNaN(parsed)) return 0;
  return Math.max(
    0,
    Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - parsed) / DAY_MS)
  );
};
