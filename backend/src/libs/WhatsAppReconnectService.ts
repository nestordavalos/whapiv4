/**
 * Servicio de Reconexión Inteligente para WhatsApp
 * Maneja reconexiones con backoff exponencial y circuit breaker
 */

import { logger } from "../utils/logger";
import { getWhatsAppConfig } from "../config/whatsapp";
import {
  getCircuitBreaker,
  resetCircuitBreaker,
  CircuitState
} from "./WhatsAppCircuitBreaker";
import Whatsapp from "../models/Whatsapp";
import { getIO } from "./socket";

interface ReconnectState {
  attempts: number;
  lastAttempt: Date | null;
  nextAttemptDelay: number;
  isReconnecting: boolean;
  scheduledReconnect: NodeJS.Timeout | null;
}

class WhatsAppReconnectService {
  private reconnectStates: Map<number, ReconnectState> = new Map();

  /**
   * Obtiene o crea el estado de reconexión para un WhatsApp
   */
  private getState(whatsappId: number): ReconnectState {
    if (!this.reconnectStates.has(whatsappId)) {
      this.reconnectStates.set(whatsappId, {
        attempts: 0,
        lastAttempt: null,
        nextAttemptDelay: getWhatsAppConfig().retryDelayMs,
        isReconnecting: false,
        scheduledReconnect: null
      });
    }
    return this.reconnectStates.get(whatsappId)!;
  }

  /**
   * Programa una reconexión con backoff exponencial
   */
  scheduleReconnect(
    whatsapp: Whatsapp,
    reconnectFn: () => Promise<void>,
    reason: string
  ): boolean {
    const config = getWhatsAppConfig();
    const state = this.getState(whatsapp.id);
    const circuitBreaker = getCircuitBreaker(whatsapp.id);

    // Verificar circuit breaker
    if (!circuitBreaker.canAttempt()) {
      const status = circuitBreaker.getStatus();
      logger.warn(
        `[Reconnect:${whatsapp.id}] Circuit breaker abierto. ` +
          `Esperando ${Math.round((status.timeUntilRecovery || 0) / 1000)}s`
      );
      this.emitStatus(whatsapp, "blocked", "Circuit breaker abierto");
      return false;
    }

    // Verificar límite de intentos
    if (state.attempts >= config.maxReconnectAttempts) {
      logger.error(
        `[Reconnect:${whatsapp.id}] Límite de intentos alcanzado (${state.attempts})`
      );
      this.emitStatus(
        whatsapp,
        "failed",
        `Límite de ${config.maxReconnectAttempts} intentos alcanzado`
      );
      return false;
    }

    // Cancelar reconexión pendiente
    if (state.scheduledReconnect) {
      clearTimeout(state.scheduledReconnect);
      state.scheduledReconnect = null;
    }

    // Calcular delay con backoff exponencial
    const delay = Math.min(state.nextAttemptDelay, config.maxRetryDelayMs);

    logger.info(
      `[Reconnect:${whatsapp.id}] Programando reconexión en ` +
        `${Math.round(delay / 1000)}s (intento ${state.attempts + 1}/` +
        `${config.maxReconnectAttempts}). Razón: ${reason}`
    );

    this.emitStatus(
      whatsapp,
      "scheduled",
      `Reconexión en ${Math.round(delay / 1000)}s (intento ${
        state.attempts + 1
      })`
    );

    state.scheduledReconnect = setTimeout(async () => {
      await this.executeReconnect(whatsapp, reconnectFn);
    }, delay);

    return true;
  }

  /**
   * Ejecuta la reconexión
   */
  private async executeReconnect(
    whatsapp: Whatsapp,
    reconnectFn: () => Promise<void>
  ): Promise<void> {
    const config = getWhatsAppConfig();
    const state = this.getState(whatsapp.id);
    const circuitBreaker = getCircuitBreaker(whatsapp.id);

    if (state.isReconnecting) {
      logger.warn(
        `[Reconnect:${whatsapp.id}] Ya hay una reconexión en progreso`
      );
      return;
    }

    state.isReconnecting = true;
    state.attempts += 1;
    state.lastAttempt = new Date();

    logger.info(`[Reconnect:${whatsapp.id}] Ejecutando reconexión...`);
    this.emitStatus(whatsapp, "reconnecting", `Intento ${state.attempts}`);

    try {
      await reconnectFn();

      // Éxito
      circuitBreaker.recordSuccess();
      this.resetState(whatsapp.id);
      logger.info(`[Reconnect:${whatsapp.id}] Reconexión exitosa`);
      this.emitStatus(whatsapp, "connected", "Reconexión exitosa");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";

      circuitBreaker.recordFailure(errorMessage);

      // Calcular próximo delay con backoff
      state.nextAttemptDelay = Math.min(
        state.nextAttemptDelay * config.retryBackoffMultiplier,
        config.maxRetryDelayMs
      );

      logger.error(
        `[Reconnect:${whatsapp.id}] Fallo de reconexión: ${errorMessage}`
      );

      // Programar siguiente intento si no se alcanzó el límite
      if (
        state.attempts < config.maxReconnectAttempts &&
        circuitBreaker.canAttempt()
      ) {
        this.scheduleReconnect(whatsapp, reconnectFn, "Reintento automático");
      } else {
        this.emitStatus(
          whatsapp,
          "failed",
          `Reconexión fallida después de ${state.attempts} intentos`
        );
      }
    } finally {
      state.isReconnecting = false;
    }
  }

  /**
   * Cancela una reconexión programada
   */
  cancelReconnect(whatsappId: number): void {
    const state = this.reconnectStates.get(whatsappId);
    if (state?.scheduledReconnect) {
      clearTimeout(state.scheduledReconnect);
      state.scheduledReconnect = null;
      logger.info(`[Reconnect:${whatsappId}] Reconexión cancelada`);
    }
  }

  /**
   * Resetea el estado de reconexión
   */
  resetState(whatsappId: number): void {
    const config = getWhatsAppConfig();
    this.cancelReconnect(whatsappId);
    this.reconnectStates.set(whatsappId, {
      attempts: 0,
      lastAttempt: null,
      nextAttemptDelay: config.retryDelayMs,
      isReconnecting: false,
      scheduledReconnect: null
    });
    resetCircuitBreaker(whatsappId);
  }

  /**
   * Obtiene el estado actual de reconexión
   */
  getReconnectStatus(whatsappId: number): {
    state: ReconnectState;
    circuitBreaker: {
      state: CircuitState;
      canAttempt: boolean;
    };
  } {
    const state = this.getState(whatsappId);
    const cb = getCircuitBreaker(whatsappId);

    return {
      state: { ...state },
      circuitBreaker: {
        state: cb.getState(),
        canAttempt: cb.canAttempt()
      }
    };
  }

  /**
   * Fuerza un intento de reconexión inmediato (para uso manual)
   */
  async forceReconnect(
    whatsapp: Whatsapp,
    reconnectFn: () => Promise<void>
  ): Promise<boolean> {
    const circuitBreaker = getCircuitBreaker(whatsapp.id);

    // Resetear circuit breaker para permitir intento forzado
    circuitBreaker.reset();
    this.resetState(whatsapp.id);

    logger.info(`[Reconnect:${whatsapp.id}] Reconexión forzada iniciada`);

    try {
      await this.executeReconnect(whatsapp, reconnectFn);
      return true;
    } catch {
      return false;
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private emitStatus(
    whatsapp: Whatsapp,
    status: string,
    message: string
  ): void {
    const io = getIO();
    io.emit("whatsappSession", {
      action: "reconnectStatus",
      session: whatsapp,
      reconnect: {
        status,
        message,
        timestamp: new Date().toISOString()
      }
    });
  }
}

// Singleton
export const reconnectService = new WhatsAppReconnectService();

export default reconnectService;
