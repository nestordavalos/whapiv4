/**
 * WhatsApp rejects token-less sends to privacy-gated recipients with NACK 463.
 * Zapo keeps the raw stanza attributes in the error message, rather than
 * exposing the code as a property, so match the documented error shape.
 */
export const isZapoTrustedContactPrivacyNack = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;

  return (
    error.name === "MessagePublishNackError" &&
    /\b(?:code|error)=463\b/.test(error.message) &&
    (error as Error & { retryable?: boolean }).retryable === false
  );
};
