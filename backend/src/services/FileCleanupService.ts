import cron from "node-cron";
import { logger } from "../utils/logger";
import { cleanupOldFiles } from "../utils/fileCleanup";

/**
 * Servicio que programa la limpieza automática de archivos
 */
class FileCleanupService {
  private task: cron.ScheduledTask | null = null;

  /**
   * Inicia la tarea programada de limpieza
   * @param cronExpression - Expresión cron (por defecto: cada día a las 3 AM)
   * @param maxAgeHours - Edad máxima de archivos en horas (por defecto: 7 días)
   */
  start(cronExpression = "0 3 * * *", maxAgeHours = 168): void {
    if (this.task) {
      logger.warn("[FileCleanupService] Ya existe una tarea programada");
      return;
    }

    this.task = cron.schedule(cronExpression, async () => {
      logger.info(
        `[FileCleanupService] Iniciando limpieza automática de archivos...`
      );
      await cleanupOldFiles(maxAgeHours);
    });

    logger.info(
      `[FileCleanupService] Limpieza automática programada: ${cronExpression}`
    );
  }

  /**
   * Detiene la tarea programada
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info("[FileCleanupService] Limpieza automática detenida");
    }
  }
}

export default new FileCleanupService();
