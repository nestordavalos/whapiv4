const sessions = new Map<number, number>();

export const getLastActivity = (userId: number): number | undefined =>
  sessions.get(userId);

export const updateActivity = (
  userId: number,
  timestamp = Date.now()
): void => {
  sessions.set(userId, timestamp);
};

export const isExpired = (
  last: number,
  limit = 8 * 60 * 60 * 1000
): boolean => {
  return Date.now() - last > limit;
};

export const clearSession = (userId: number): void => {
  sessions.delete(userId);
};
