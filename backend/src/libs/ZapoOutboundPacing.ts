export type ZapoOutboundSource = "api" | "frontend" | "automation";

export const DEFAULT_ZAPO_OUTBOUND_DELAY_MS = 2000;
export const API_OUTBOUND_MESSAGE_DELAY_MIN_MS = 2000;
export const API_OUTBOUND_MESSAGE_DELAY_MAX_MS = 5000;

export const getZapoOutboundDelayMs = (
  source?: ZapoOutboundSource,
  random: () => number = Math.random
): number => {
  if (source !== "api") return DEFAULT_ZAPO_OUTBOUND_DELAY_MS;

  return (
    API_OUTBOUND_MESSAGE_DELAY_MIN_MS +
    Math.floor(
      random() *
        (API_OUTBOUND_MESSAGE_DELAY_MAX_MS -
          API_OUTBOUND_MESSAGE_DELAY_MIN_MS +
          1)
    )
  );
};
