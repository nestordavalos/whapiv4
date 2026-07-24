export const ZAPO_TEMP_BAN_CODE = 402;
export const ZAPO_PERMANENT_BAN_CODE = 406;

interface ZapoConnectionCloseEvent {
  reason?: string;
  code?: number | null;
  isLogout?: boolean;
}

interface ZapoStreamFailureEvent {
  failureReason?: number;
  failureCode?: number;
}

export const isZapoPermanentBan = (event: ZapoConnectionCloseEvent): boolean =>
  event.reason === "failure_banned" || event.code === ZAPO_PERMANENT_BAN_CODE;

export const isZapoTemporaryBan = (event: ZapoStreamFailureEvent): boolean =>
  event.failureReason === ZAPO_TEMP_BAN_CODE ||
  event.failureCode === ZAPO_TEMP_BAN_CODE;

export const getZapoClosedStatus = (
  event: ZapoConnectionCloseEvent
): "BANNED" | "DISCONNECTED" =>
  isZapoPermanentBan(event) ? "BANNED" : "DISCONNECTED";

export const shouldReconnectZapo = (event: ZapoConnectionCloseEvent): boolean =>
  !event.isLogout &&
  event.reason !== "client_disconnected" &&
  !isZapoPermanentBan(event);
