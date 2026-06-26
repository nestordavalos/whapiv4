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
