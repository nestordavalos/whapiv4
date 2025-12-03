/**
 * Circuit Breaker para conexiones WhatsApp
 * Previene intentos de conexión repetidos cuando hay fallos persistentes
 */

import { logger } from "../utils/logger";

export enum CircuitState {
  CLOSED = "CLOSED", // Normal, permite conexiones
  OPEN = "OPEN", // Falla detectada, bloquea conexiones
  HALF_OPEN = "HALF_OPEN" // Probando si el servicio se recuperó
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeMs: number;
  monitorWindowMs: number;
}

interface FailureRecord {
  timestamp: number;
  error: string;
}

export class WhatsAppCircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;

  private failures: FailureRecord[] = [];

  private lastStateChange: number = Date.now();

  private successCount: number = 0;

  private readonly config: CircuitBreakerConfig;

  private readonly whatsappId: number;

  constructor(whatsappId: number, config?: Partial<CircuitBreakerConfig>) {
    this.whatsappId = whatsappId;
    this.config = {
      failureThreshold: config?.failureThreshold ?? 5,
      recoveryTimeMs: config?.recoveryTimeMs ?? 60000, // 1 minuto
      monitorWindowMs: config?.monitorWindowMs ?? 120000 // 2 minutos
    };
  }

  /**
   * Verifica si se puede intentar una conexión
   */
  canAttempt(): boolean {
    this.cleanOldFailures();

    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      const timeSinceOpen = Date.now() - this.lastStateChange;
      if (timeSinceOpen >= this.config.recoveryTimeMs) {
        this.transitionTo(CircuitState.HALF_OPEN);
        return true;
      }
      return false;
    }

    // HALF_OPEN - permitir un intento
    return true;
  }

  /**
   * Registra un fallo de conexión
   */
  recordFailure(error: Error | string): void {
    const errorMessage = error instanceof Error ? error.message : error;

    this.failures.push({
      timestamp: Date.now(),
      error: errorMessage
    });

    this.successCount = 0;

    logger.warn(
      `[CircuitBreaker:${this.whatsappId}] Fallo registrado: ${errorMessage}. ` +
        `Fallos: ${this.failures.length}/${this.config.failureThreshold}`
    );

    this.cleanOldFailures();

    if (this.state === CircuitState.HALF_OPEN) {
      // En HALF_OPEN, cualquier fallo vuelve a abrir el circuito
      this.transitionTo(CircuitState.OPEN);
    } else if (this.failures.length >= this.config.failureThreshold) {
      this.transitionTo(CircuitState.OPEN);
    }
  }

  /**
   * Registra una conexión exitosa
   */
  recordSuccess(): void {
    this.successCount += 1;

    if (this.state === CircuitState.HALF_OPEN) {
      // Éxito en HALF_OPEN, cerrar el circuito
      this.transitionTo(CircuitState.CLOSED);
      this.failures = [];
    } else if (this.state === CircuitState.CLOSED) {
      // Limpiar fallos antiguos después de éxitos consecutivos
      if (this.successCount >= 3) {
        this.failures = [];
      }
    }

    logger.info(
      `[CircuitBreaker:${this.whatsappId}] Éxito registrado. Estado: ${this.state}`
    );
  }

  /**
   * Obtiene el estado actual del circuit breaker
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Obtiene información detallada del estado
   */
  getStatus(): {
    state: CircuitState;
    failures: number;
    lastStateChange: Date;
    canAttempt: boolean;
    timeUntilRecovery?: number;
  } {
    const canAttemptNow = this.canAttempt();
    const result: ReturnType<WhatsAppCircuitBreaker["getStatus"]> = {
      state: this.state,
      failures: this.failures.length,
      lastStateChange: new Date(this.lastStateChange),
      canAttempt: canAttemptNow
    };

    if (this.state === CircuitState.OPEN && !canAttemptNow) {
      result.timeUntilRecovery =
        this.config.recoveryTimeMs - (Date.now() - this.lastStateChange);
    }

    return result;
  }

  /**
   * Resetea el circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.successCount = 0;
    this.lastStateChange = Date.now();
    logger.info(`[CircuitBreaker:${this.whatsappId}] Reset manual`);
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    logger.warn(
      `[CircuitBreaker:${this.whatsappId}] Transición: ${oldState} -> ${newState}`
    );
  }

  private cleanOldFailures(): void {
    const cutoff = Date.now() - this.config.monitorWindowMs;
    this.failures = this.failures.filter(f => f.timestamp > cutoff);
  }
}

// Mapa global de circuit breakers por WhatsApp ID
const circuitBreakers = new Map<number, WhatsAppCircuitBreaker>();

export const getCircuitBreaker = (
  whatsappId: number
): WhatsAppCircuitBreaker => {
  if (!circuitBreakers.has(whatsappId)) {
    circuitBreakers.set(whatsappId, new WhatsAppCircuitBreaker(whatsappId));
  }
  return circuitBreakers.get(whatsappId)!;
};

export const resetCircuitBreaker = (whatsappId: number): void => {
  const breaker = circuitBreakers.get(whatsappId);
  if (breaker) {
    breaker.reset();
  }
};

export const removeCircuitBreaker = (whatsappId: number): void => {
  circuitBreakers.delete(whatsappId);
};

export default WhatsAppCircuitBreaker;
