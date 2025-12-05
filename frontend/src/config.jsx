// Build-time variables must be referenced explicitly so they are baked
// into the bundle by the build tool. We keep a static map here for any
// config key we want to expose at runtime.
const buildEnv = {
  VITE_BACKEND_URL:
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_BACKEND_URL) ||
    (typeof process !== "undefined" && process.env && (process.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL)),
};

function getConfig(name, defaultValue = null) {
  // Prefer runtime environment variables injected via window.ENV, but
  // fall back to the build-time value when the key is missing or blank.
  if (typeof window !== "undefined" && window.ENV) {
    const value = window.ENV[name];
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      value !== "undefined"
    ) {
      return value;
    }
  }

  const buildValue = buildEnv[name];
  if (buildValue !== undefined && buildValue !== null && buildValue !== "") {
    return buildValue;
  }

  return defaultValue;
}

export function getBackendUrl() {
  const url = getConfig("VITE_BACKEND_URL");
  return url;
}

// export function getHoursCloseTicketsAuto() {
//   return getConfig('REACT_APP_HOURS_CLOSE_TICKETS_AUTO');
// }
