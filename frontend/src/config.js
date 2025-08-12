function getConfig(name, defaultValue = null) {
    // Prefer runtime environment variables injected via window.ENV,
    // but fall back to build-time variables if the key is missing.
    if (typeof window !== "undefined" && window.ENV) {
        const value = window.ENV[name];
        if (value !== undefined && value !== null) {
            return value;
        }
    }

    return process.env[name] || defaultValue;
}

export function getBackendUrl() {
    return getConfig('REACT_APP_BACKEND_URL');
}

// export function getHoursCloseTicketsAuto() {
//     return getConfig('REACT_APP_HOURS_CLOSE_TICKETS_AUTO');
// }