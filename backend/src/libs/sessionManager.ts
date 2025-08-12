const sessions = new Map<number, number>();

export const updateActivity = (userId: number): void => {
  sessions.set(userId, Date.now());
};

export const isExpired = (
  userId: number,
  limit = 8 * 60 * 60 * 1000
): boolean => {
  const last = sessions.get(userId);
  if (!last) return false;
  return Date.now() - last > limit;
};

export const clearSession = (userId: number): void => {
  sessions.delete(userId);
};
