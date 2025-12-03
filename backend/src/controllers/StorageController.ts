import { Request, Response } from "express";
import StorageMigrationService from "../services/StorageServices/StorageMigrationService";
import StorageSyncService from "../services/StorageServices/StorageSyncService";
import { getStorageService } from "../services/StorageServices/StorageService";
import getStorageConfig from "../config/storage";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";

// Keep track of running services
let migrationService: StorageMigrationService | null = null;
let syncService: StorageSyncService | null = null;

/**
 * Get storage configuration and status
 */
export const getStorageStatus = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const config = getStorageConfig();
  const storageService = getStorageService();

  const status = {
    type: config.type,
    fallbackEnabled: config.fallbackToLocal,
    deleteLocalAfterUpload: config.deleteLocalAfterUpload,
    isPrimaryHealthy: false,
    localDirectory: config.local.directory,
    s3Configured: !!(config.s3.bucket && config.s3.accessKeyId)
  };

  try {
    status.isPrimaryHealthy = await storageService.isPrimaryHealthy();
  } catch (error) {
    logger.warn(`Failed to check storage health: ${error}`);
  }

  return res.json(status);
};

/**
 * Get migration status and progress
 */
export const getMigrationStatus = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (!migrationService) {
    return res.json({
      status: "idle",
      message: "No migration in progress"
    });
  }

  return res.json(migrationService.getProgress());
};

/**
 * Start migration from local to S3
 */
export const startMigrationToS3 = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const config = getStorageConfig();
  // Use global config as default for deleteLocalAfterMigration
  const {
    dryRun = false,
    deleteLocalAfterMigration = config.deleteLocalAfterUpload
  } = req.body;

  if (migrationService) {
    const progress = migrationService.getProgress();
    if (progress.status === "running") {
      throw new AppError("Migration already in progress", 400);
    }
  }

  migrationService = new StorageMigrationService();

  const isS3Available = await migrationService.isS3Available();
  if (!isS3Available) {
    throw new AppError(
      "S3 storage is not available. Please check your configuration.",
      503
    );
  }

  logger.info(
    `Starting migration to S3 with deleteLocalAfterMigration=${deleteLocalAfterMigration}`
  );

  // Start migration in background
  migrationService
    .migrateToS3({
      dryRun,
      deleteLocalAfterMigration,
      onProgress: progress => {
        logger.debug(
          `Migration progress: ${progress.migrated}/${progress.total}`
        );
      }
    })
    .catch(error => {
      logger.error(`Migration failed: ${error}`);
    });

  return res.json({
    message: "Migration started",
    status: "running",
    dryRun,
    deleteLocalAfterMigration
  });
};

/**
 * Start migration from S3 to local
 */
export const startMigrationToLocal = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { dryRun = false } = req.body;

  if (migrationService) {
    const progress = migrationService.getProgress();
    if (progress.status === "running") {
      throw new AppError("Migration already in progress", 400);
    }
  }

  migrationService = new StorageMigrationService();

  // Start migration in background
  migrationService.migrateToLocal({ dryRun }).catch(error => {
    logger.error(`Migration to local failed: ${error}`);
  });

  return res.json({
    message: "Migration to local started",
    status: "running",
    dryRun
  });
};

/**
 * Cancel ongoing migration
 */
export const cancelMigration = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (!migrationService) {
    throw new AppError("No migration in progress", 400);
  }

  migrationService.cancel();

  return res.json({
    message: "Migration cancelled",
    progress: migrationService.getProgress()
  });
};

/**
 * Verify migration - check that all local files are in S3
 */
export const verifyMigration = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const service = new StorageMigrationService();

  if (!service.isS3Available()) {
    return res.status(400).json({
      error: "S3 is not configured",
      message: "Cannot verify migration without S3 configuration"
    });
  }

  const result = await service.verifyMigration();

  return res.json({
    totalVerified: result.verified,
    missingInS3: result.missing.length,
    extraInS3: result.extra.length,
    missing: result.missing,
    extra: result.extra
  });
};

/**
 * Clean up local files that have been migrated to S3
 */
export const cleanupLocalFiles = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const service = new StorageMigrationService();

  const isS3Available = await service.isS3Available();
  if (!isS3Available) {
    throw new AppError(
      "S3 is not available. Cannot verify files before cleanup.",
      503
    );
  }

  const result = await service.cleanupLocalAfterMigration();

  return res.json({
    deleted: result.deleted,
    errors: result.errors
  });
};

/**
 * Get sync status and statistics
 */
export const getSyncStatus = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (!syncService) {
    syncService = new StorageSyncService();
  }

  const [stats, isS3Available] = await Promise.all([
    syncService.getStats(),
    syncService.isS3Available()
  ]);

  // Get S3 files count
  let s3FilesCount = 0;
  if (isS3Available) {
    try {
      const migrationSvc = new StorageMigrationService();
      const s3Files = await migrationSvc.getS3Files();
      s3FilesCount = s3Files.length;
    } catch (e) {
      logger.warn(`Failed to get S3 files count: ${e}`);
    }
  }

  return res.json({
    isS3Available,
    s3FilesCount,
    ...stats,
    autoSyncRunning: !!syncService
  });
};

/**
 * Manually trigger sync of pending uploads
 */
export const triggerSync = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (!syncService) {
    syncService = new StorageSyncService();
  }

  const { deleteLocalAfterSync = false } = req.body;

  const isS3Available = await syncService.isS3Available();
  if (!isS3Available) {
    throw new AppError("S3 is not available", 503);
  }

  const result = await syncService.syncPendingUploads({
    deleteLocalAfterSync
  });

  return res.json(result);
};

/**
 * Retry a specific failed upload
 */
export const retryUpload = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { filename } = req.params;

  if (!syncService) {
    syncService = new StorageSyncService();
  }

  const success = await syncService.retryUpload(filename);

  return res.json({
    success,
    filename
  });
};

/**
 * Get list of pending uploads
 */
export const getPendingUploads = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (!syncService) {
    syncService = new StorageSyncService();
  }

  const pending = await syncService.getPendingUploads();

  return res.json(pending);
};

/**
 * Clear completed uploads from tracking
 */
export const clearCompletedUploads = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (!syncService) {
    syncService = new StorageSyncService();
  }

  const count = await syncService.clearCompletedUploads();

  return res.json({
    cleared: count
  });
};

/**
 * Get list of local files
 */
export const getLocalFiles = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const service = new StorageMigrationService();
  const files = await service.getLocalFiles();

  // Count how many need migration (not in S3)
  let needsMigration = 0;
  let alreadyInS3 = 0;

  if (service.isS3Available()) {
    const verifyResult = await service.verifyMigration();
    needsMigration = verifyResult.missing.length;
    alreadyInS3 = verifyResult.verified - needsMigration;
  }

  return res.json({
    count: files.length,
    needsMigration,
    alreadyInS3,
    files
  });
};
