/**
 * In-memory session activity tracker.
 *
 * LIMITATION: This store lives in process memory and is NOT shared across
 * multiple instances.  If horizontal scaling is needed in the future, replace
 * the Map with a shared store (e.g. Redis, which is already available via
 * the Bull queue connection).
 */
const sessions = new Map<number, number>();
const INACTIVITY_LIMIT_MS = 8 * 60 * 60 * 1000; // 8 hours

export const getLastActivity = (userId: number): number | undefined => {
  return sessions.get(userId);
};

export const updateActivity = (
  userId: number,
  timestamp = Date.now()
): void => {
  sessions.set(userId, timestamp);
};

export const isExpired = (
  last: number,
  limit = INACTIVITY_LIMIT_MS
): boolean => {
  return Date.now() - last > limit;
};

export const clearSession = (userId: number): void => {
  sessions.delete(userId);
};
