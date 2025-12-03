/**
 * Servicio de Health Check para conexiones WhatsApp
 * Monitorea la salud de las conexiones y detecta problemas antes de que causen fallos
 */

import { Client } from "whatsapp-web.js";
import { logger } from "../utils/logger";
import { getWhatsAppConfig } from "../config/whatsapp";
import Whatsapp from "../models/Whatsapp";
import { getIO } from "./socket";

interface Session extends Client {
  id?: number;
  pingInterval?: NodeJS.Timeout;
  lastHealthCheck?: Date;
  consecutiveFailedChecks?: number;
  healthCheckActive?: boolean;
}

export interface HealthCheckResult {
  healthy: boolean;
  state: string | null;
  timestamp: Date;
  latencyMs: number;
  error?: string;
  metrics?: {
    memoryUsage?: NodeJS.MemoryUsage;
    uptime?: number;
  };
}

export interface WhatsAppHealthStatus {
  whatsappId: number;
  connected: boolean;
  lastCheck: Date | null;
  lastSuccessfulCheck: Date | null;
  consecutiveFailures: number;
  averageLatencyMs: number;
  history: HealthCheckResult[];
}

class WhatsAppHealthChecker {
  private healthHistory: Map<number, HealthCheckResult[]> = new Map();

  private lastSuccessfulCheck: Map<number, Date> = new Map();

  private readonly maxHistoryLength = 20;

  /**
   * Realiza un health check completo de una sesión
   */
  async checkHealth(wbot: Session): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const whatsappId = wbot.id;

    if (!whatsappId) {
      return {
        healthy: false,
        state: null,
        timestamp: new Date(),
        latencyMs: 0,
        error: "WhatsApp ID no definido"
      };
    }

    try {
      // Verificar si el cliente tiene página de Puppeteer activa
      if (!wbot.pupPage || wbot.pupPage.isClosed()) {
        throw new Error("Página de Puppeteer cerrada o no disponible");
      }

      // Obtener estado de conexión con timeout
      const config = getWhatsAppConfig();
      const statePromise = wbot.getState();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Health check timeout")),
          config.healthCheckTimeoutMs
        )
      );

      const state = await Promise.race([statePromise, timeoutPromise]);

      const latencyMs = Date.now() - startTime;
      const isConnected = state === "CONNECTED";

      // Verificaciones adicionales
      let additionalChecks = true;
      let additionalError = "";

      // Verificar que podemos obtener información del cliente
      try {
        if (wbot.info && !wbot.info.wid) {
          additionalChecks = false;
          additionalError = "WID no disponible";
        }
      } catch {
        additionalChecks = false;
        additionalError = "No se puede acceder a la información del cliente";
      }

      const result: HealthCheckResult = {
        healthy: isConnected && additionalChecks,
        state: state as string,
        timestamp: new Date(),
        latencyMs,
        error: !additionalChecks ? additionalError : undefined,
        metrics: {
          memoryUsage: process.memoryUsage(),
          uptime: process.uptime()
        }
      };

      this.recordResult(whatsappId, result);

      if (result.healthy) {
        this.lastSuccessfulCheck.set(whatsappId, new Date());
      }

      return result;
    } catch (error: unknown) {
      const latencyMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";

      const result: HealthCheckResult = {
        healthy: false,
        state: null,
        timestamp: new Date(),
        latencyMs,
        error: errorMessage
      };

      this.recordResult(whatsappId, result);

      logger.error(
        `[HealthCheck:${whatsappId}] Fallo: ${errorMessage} (${latencyMs}ms)`
      );

      return result;
    }
  }

  /**
   * Inicia el monitoreo continuo de salud para una sesión
   */
  startMonitoring(
    wbot: Session,
    whatsapp: Whatsapp,
    onUnhealthy?: (result: HealthCheckResult) => void
  ): void {
    if (wbot.healthCheckActive) {
      logger.warn(`[HealthCheck:${wbot.id}] Ya existe monitoreo activo`);
      return;
    }

    const config = getWhatsAppConfig();
    wbot.healthCheckActive = true;
    wbot.consecutiveFailedChecks = 0;

    const runCheck = async () => {
      if (!wbot.healthCheckActive) return;

      const result = await this.checkHealth(wbot);
      wbot.lastHealthCheck = result.timestamp;

      if (!result.healthy) {
        wbot.consecutiveFailedChecks = (wbot.consecutiveFailedChecks || 0) + 1;

        logger.warn(
          `[HealthCheck:${wbot.id}] Check fallido ${wbot.consecutiveFailedChecks}/${config.maxConsecutiveFailedHealthChecks}`
        );

        // Emitir evento de estado degradado
        const io = getIO();
        io.emit("whatsappSession", {
          action: "healthCheck",
          session: whatsapp,
          health: {
            status: "degraded",
            consecutiveFailures: wbot.consecutiveFailedChecks,
            lastError: result.error
          }
        });

        if (
          wbot.consecutiveFailedChecks >=
          config.maxConsecutiveFailedHealthChecks
        ) {
          logger.error(
            `[HealthCheck:${wbot.id}] Límite de fallos alcanzado, ejecutando callback`
          );
          if (onUnhealthy) {
            onUnhealthy(result);
          }
        }
      } else {
        if (wbot.consecutiveFailedChecks && wbot.consecutiveFailedChecks > 0) {
          logger.info(
            `[HealthCheck:${wbot.id}] Recuperado después de ${wbot.consecutiveFailedChecks} fallos`
          );
        }
        wbot.consecutiveFailedChecks = 0;
      }
    };

    // Ejecutar primera verificación inmediatamente
    runCheck();

    // Programar verificaciones periódicas
    wbot.pingInterval = setInterval(runCheck, config.healthCheckIntervalMs);

    logger.info(
      `[HealthCheck:${wbot.id}] Monitoreo iniciado (intervalo: ${config.healthCheckIntervalMs}ms)`
    );
  }

  /**
   * Detiene el monitoreo de salud para una sesión
   */
  // eslint-disable-next-line class-methods-use-this
  stopMonitoring(wbot: Session): void {
    wbot.healthCheckActive = false;

    if (wbot.pingInterval) {
      clearInterval(wbot.pingInterval);
      wbot.pingInterval = undefined;
    }

    logger.info(`[HealthCheck:${wbot.id}] Monitoreo detenido`);
  }

  /**
   * Obtiene el estado de salud completo de una sesión
   */
  getHealthStatus(whatsappId: number): WhatsAppHealthStatus {
    const history = this.healthHistory.get(whatsappId) || [];
    const lastCheck = history.length > 0 ? history[history.length - 1] : null;
    const successfulChecks = history.filter(h => h.healthy);
    const avgLatency =
      successfulChecks.length > 0
        ? successfulChecks.reduce((sum, h) => sum + h.latencyMs, 0) /
          successfulChecks.length
        : 0;

    return {
      whatsappId,
      connected: lastCheck?.healthy ?? false,
      lastCheck: lastCheck?.timestamp ?? null,
      lastSuccessfulCheck: this.lastSuccessfulCheck.get(whatsappId) ?? null,
      consecutiveFailures: this.countConsecutiveFailures(history),
      averageLatencyMs: Math.round(avgLatency),
      history
    };
  }

  /**
   * Limpia el historial de una sesión
   */
  clearHistory(whatsappId: number): void {
    this.healthHistory.delete(whatsappId);
    this.lastSuccessfulCheck.delete(whatsappId);
  }

  private recordResult(whatsappId: number, result: HealthCheckResult): void {
    if (!this.healthHistory.has(whatsappId)) {
      this.healthHistory.set(whatsappId, []);
    }

    const history = this.healthHistory.get(whatsappId)!;
    history.push(result);

    // Mantener solo los últimos N resultados
    while (history.length > this.maxHistoryLength) {
      history.shift();
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private countConsecutiveFailures(history: HealthCheckResult[]): number {
    let count = 0;
    // eslint-disable-next-line no-plusplus
    for (let i = history.length - 1; i >= 0; i--) {
      if (!history[i].healthy) {
        count += 1;
      } else {
        break;
      }
    }
    return count;
  }
}

// Singleton
export const healthChecker = new WhatsAppHealthChecker();

export default healthChecker;
