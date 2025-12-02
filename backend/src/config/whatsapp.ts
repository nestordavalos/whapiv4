/**
 * Configuración centralizada para WhatsApp Web.js
 * Este archivo contiene todas las configuraciones relacionadas con la conexión
 * y permite ajustarlas sin modificar el código principal.
 */

export interface WhatsAppConfig {
  // Configuración de reintentos
  maxRetries: number;
  retryDelayMs: number;
  retryBackoffMultiplier: number;
  maxRetryDelayMs: number;

  // Configuración de health check
  healthCheckIntervalMs: number;
  healthCheckTimeoutMs: number;
  maxConsecutiveFailedHealthChecks: number;

  // Configuración de inicialización
  initializationTimeoutMs: number;
  qrCodeTimeoutMs: number;

  // Configuración de reconexión
  reconnectOnDisconnect: boolean;
  reconnectDelayMs: number;
  maxReconnectAttempts: number;

  // Configuración de Puppeteer
  puppeteer: {
    headless: boolean;
    timeout: number;
    args: string[];
  };

  // Configuración de sesión
  sessionCleanupOnAuthFail: boolean;
  preserveSessionOnError: boolean;

  // Circuit breaker
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    recoveryTimeMs: number;
  };
}

const defaultConfig: WhatsAppConfig = {
  // Reintentos
  maxRetries: 5,
  retryDelayMs: 2000,
  retryBackoffMultiplier: 1.5,
  maxRetryDelayMs: 30000,

  // Health check
  healthCheckIntervalMs: 60000, // 1 minuto
  healthCheckTimeoutMs: 10000, // 10 segundos
  maxConsecutiveFailedHealthChecks: 3,

  // Inicialización
  initializationTimeoutMs: 120000, // 2 minutos
  qrCodeTimeoutMs: 60000, // 1 minuto

  // Reconexión
  reconnectOnDisconnect: true,
  reconnectDelayMs: 3000,
  maxReconnectAttempts: 10,

  // Puppeteer optimizado
  puppeteer: {
    headless: true,
    timeout: 60000,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-default-apps",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-features=TranslateUI",
      "--disable-ipc-flooding-protection",
      "--disable-hang-monitor",
      "--disable-popup-blocking",
      "--disable-prompt-on-repost",
      "--disable-sync",
      "--metrics-recording-only",
      "--no-default-browser-check",
      "--safebrowsing-disable-auto-update",
      "--enable-features=NetworkService",
      "--force-color-profile=srgb",
      "--mute-audio",
      "--autoplay-policy=no-user-gesture-required",
      "--ignore-certificate-errors",
      "--ignore-certificate-errors-spki-list"
    ]
  },

  // Sesión
  sessionCleanupOnAuthFail: true,
  preserveSessionOnError: false,

  // Circuit breaker
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    recoveryTimeMs: 60000
  }
};

// Cargar configuración desde variables de entorno
export const getWhatsAppConfig = (): WhatsAppConfig => {
  return {
    ...defaultConfig,
    maxRetries:
      parseInt(process.env.WHATSAPP_MAX_RETRIES || "", 10) ||
      defaultConfig.maxRetries,
    healthCheckIntervalMs:
      parseInt(process.env.WHATSAPP_HEALTH_CHECK_INTERVAL_MS || "", 10) ||
      defaultConfig.healthCheckIntervalMs,
    initializationTimeoutMs:
      parseInt(process.env.WHATSAPP_INIT_TIMEOUT_MS || "", 10) ||
      defaultConfig.initializationTimeoutMs,
    reconnectOnDisconnect:
      process.env.WHATSAPP_RECONNECT_ON_DISCONNECT !== "false",
    maxReconnectAttempts:
      parseInt(process.env.WHATSAPP_MAX_RECONNECT_ATTEMPTS || "", 10) ||
      defaultConfig.maxReconnectAttempts,
    circuitBreaker: {
      ...defaultConfig.circuitBreaker,
      enabled: process.env.WHATSAPP_CIRCUIT_BREAKER_ENABLED !== "false"
    }
  };
};

export default getWhatsAppConfig;
