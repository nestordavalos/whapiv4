import fs from "fs";
import path from "path";
import { logger } from "./logger";

/**
 * Limpia archivos antiguos del directorio public
 * @param maxAgeHours - Edad máxima de los archivos en horas (por defecto 7 días)
 */
export const cleanupOldFiles = async (maxAgeHours = 168): Promise<void> => {
  const publicFolder = path.resolve(__dirname, "..", "..", "public");
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  const now = Date.now();

  try {
    const files = await fs.promises.readdir(publicFolder);
    let deletedCount = 0;
    let errorCount = 0;

    await Promise.all(
      files.map(async file => {
        const filePath = path.join(publicFolder, file);

        try {
          const stats = await fs.promises.stat(filePath);

          // Solo procesar archivos (no directorios)
          if (!stats.isFile()) {
            return;
          }

          // Calcular edad del archivo
          const fileAge = now - stats.mtimeMs;

          // Si el archivo es más antiguo que maxAge, eliminarlo
          if (fileAge > maxAgeMs) {
            await fs.promises.unlink(filePath);
            deletedCount += 1;
            logger.info(
              `[FileCleanup] Archivo eliminado: ${file} (edad: ${Math.round(
                fileAge / (1000 * 60 * 60)
              )} horas)`
            );
          }
        } catch (fileErr) {
          errorCount += 1;
          logger.error(
            `[FileCleanup] Error procesando archivo ${file}: ${fileErr.message}`
          );
        }
      })
    );

    logger.info(
      `[FileCleanup] Limpieza completada. Archivos eliminados: ${deletedCount}, Errores: ${errorCount}`
    );
  } catch (err) {
    logger.error(`[FileCleanup] Error en limpieza de archivos: ${err.message}`);
  }
};

/**
 * Limpia archivos huérfanos (sin referencia en la base de datos)
 */
export const cleanupOrphanFiles = async (): Promise<void> => {
  const publicFolder = path.resolve(__dirname, "..", "..", "public");

  try {
    // Importar dinámicamente para evitar dependencias circulares
    const { default: Message } = await import("../models/Message");

    const files = await fs.promises.readdir(publicFolder);
    const mediaMessages = await Message.findAll({
      where: {
        mediaUrl: { $ne: null }
      },
      attributes: ["mediaUrl"]
    });

    const usedFiles = new Set(mediaMessages.map(m => m.mediaUrl));
    let deletedCount = 0;

    await Promise.all(
      files.map(async file => {
        const filePath = path.join(publicFolder, file);

        try {
          const stats = await fs.promises.stat(filePath);

          if (!stats.isFile()) {
            return;
          }

          // Si el archivo no está en uso, eliminarlo
          if (!usedFiles.has(file)) {
            await fs.promises.unlink(filePath);
            deletedCount += 1;
            logger.info(`[FileCleanup] Archivo huérfano eliminado: ${file}`);
          }
        } catch (err) {
          logger.error(
            `[FileCleanup] Error eliminando archivo huérfano ${file}: ${err.message}`
          );
        }
      })
    );

    logger.info(
      `[FileCleanup] Limpieza de huérfanos completada. Archivos eliminados: ${deletedCount}`
    );
  } catch (err) {
    logger.error(
      `[FileCleanup] Error en limpieza de archivos huérfanos: ${err.message}`
    );
  }
};
