const fullZapoDomains = (mysql: any, sessionId: string): any[] => [
  mysql.stores.auth(sessionId),
  mysql.stores.signal(sessionId),
  mysql.stores.preKey(sessionId),
  mysql.stores.session(sessionId),
  mysql.stores.identity(sessionId),
  mysql.stores.senderKey(sessionId),
  mysql.stores.appState(sessionId),
  mysql.stores.privacyToken(sessionId),
  mysql.stores.contacts(sessionId),
  mysql.stores.threads(sessionId),
  mysql.stores.messages(sessionId),
  mysql.caches.retry(sessionId),
  mysql.caches.groupMetadata(sessionId),
  mysql.caches.deviceList(sessionId),
  mysql.caches.messageSecret(sessionId)
];

/**
 * Clears only Zapo's provider-owned persistence for one session namespace.
 * Application Contacts, Tickets and Messages are stored elsewhere and are
 * intentionally outside this operation.
 */
export const clearAllZapoInternalStores = async (
  mysql: any,
  sessionId: string
): Promise<number> => {
  const domains = fullZapoDomains(mysql, sessionId);
  await Promise.all(domains.map(domain => domain.clear()));
  return domains.length;
};
