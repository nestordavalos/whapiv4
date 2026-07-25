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

export interface ZapoCloseLog {
  level: "info" | "warn";
  message: string;
  action: "none" | "reconnecting" | "scan_qr" | "contact_support";
}

/** Converts protocol close reasons into concise, actionable operator logs. */
export const getZapoCloseLog = (
  event: ZapoConnectionCloseEvent
): ZapoCloseLog => {
  if (isZapoPermanentBan(event)) {
    return {
      level: "warn",
      message: "Zapo account was banned; automatic reconnect is disabled",
      action: "contact_support"
    };
  }

  if (event.reason === "failure_not_authorized" || event.code === 401) {
    return {
      level: "warn",
      message:
        "Zapo authorization expired; reuse the instance and scan a new QR code",
      action: "scan_qr"
    };
  }

  if (event.isLogout) {
    return {
      level: "warn",
      message: "Zapo device was unlinked; scan a new QR code",
      action: "scan_qr"
    };
  }

  if (event.reason === "client_disconnected") {
    return {
      level: "info",
      message: "Zapo session stopped locally",
      action: "none"
    };
  }

  return {
    level: "warn",
    message: "Zapo connection interrupted; automatic reconnect scheduled",
    action: "reconnecting"
  };
};
