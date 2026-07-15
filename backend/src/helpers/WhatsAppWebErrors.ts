export const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) {
    return err.message || err.name;
  }

  return String(err);
};

export const getFirstErrorLine = (err: unknown): string =>
  getErrorMessage(err).split("\n")[0];

export const isFetchMessagesStoreError = (err: unknown): boolean => {
  const message = getErrorMessage(err);

  return (
    message.includes("waitForChatLoading") ||
    message.includes("FetchMessages") ||
    message.includes("Could not get messages")
  );
};

/**
 * WhatsApp Web keeps chats/messages in IndexedDB. These failures mean the
 * browser session is connected, but cannot safely read its local store.
 */
export const isWhatsAppWebStorageError = (err: unknown): boolean => {
  const message = getErrorMessage(err);
  const minifiedWhatsAppError =
    err instanceof Error && err.name === "r" && err.message === "r";

  return (
    minifiedWhatsAppError ||
    message.includes("IDBObjectStore") ||
    message.includes("IndexedDB") ||
    message.includes("Failed to execute 'get'") ||
    message.includes("DataError")
  );
};
