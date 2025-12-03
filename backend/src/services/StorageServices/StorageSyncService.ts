import { Op } from "sequelize";
import { LocalStorageProvider } from "./LocalStorageProvider";
import { S3StorageProvider } from "./S3StorageProvider";
import { logger } from "../../utils/logger";
import getStorageConfig from "../../config/storage";
import PendingUpload, { PendingUploadStatus } from "../../models/PendingUpload";

export interface SyncResult {
  synced: number;
  failed: number;
  remaining: number;
  errors: Array<{ filename: string; error: string }>;
}

export interface SyncOptions {
  batchSize?: number;
  maxRetries?: number;
  deleteLocalAfterSync?: boolean;
}

/**
 * Service for synchronizing pending uploads to S3
 *
 * This service handles files that were saved locally due to S3 being unavailable.
 * It periodically checks for pending uploads and syncs them to S3 when available.
 */
class StorageSyncService {
  private localProvider: LocalStorageProvider;

  private s3Provider: S3StorageProvider | null = null;

  private deleteLocalAfterUpload: boolean;

  private isRunning = false;

  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.localProvider = new LocalStorageProvider();

    const config = getStorageConfig();
    if (config.type === "s3" || config.type === "s3_compatible") {
      this.s3Provider = new S3StorageProvider(config.type);
    }
    this.deleteLocalAfterUpload = config.deleteLocalAfterUpload;
  }

  /**
   * Start automatic sync at specified interval
   */
  startAutoSync(intervalMs: number = 60000): void {
    if (this.syncInterval) {
      logger.warn("Auto sync is already running");
      return;
    }

    logger.info(`Starting auto sync with interval: ${intervalMs}ms`);

    // Run immediately, then on interval
    this.syncPendingUploads();

    this.syncInterval = setInterval(() => {
      this.syncPendingUploads();
    }, intervalMs);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      logger.info("Auto sync stopped");
    }
  }

  /**
   * Check if S3 is available
   */
  async isS3Available(): Promise<boolean> {
    if (!this.s3Provider) {
      return false;
    }
    return this.s3Provider.isHealthy();
  }

  /**
   * Get count of pending uploads
   */
  // eslint-disable-next-line class-methods-use-this
  async getPendingCount(): Promise<number> {
    return PendingUpload.count({
      where: {
        status: {
          [Op.in]: ["pending", "failed"]
        }
      }
    });
  }

  /**
   * Get all pending uploads
   */
  // eslint-disable-next-line class-methods-use-this
  async getPendingUploads(): Promise<PendingUpload[]> {
    return PendingUpload.findAll({
      where: {
        status: {
          [Op.in]: ["pending", "failed"]
        }
      },
      order: [["createdAt", "ASC"]]
    });
  }

  /**
   * Sync all pending uploads to S3
   */
  async syncPendingUploads(options: SyncOptions = {}): Promise<SyncResult> {
    const {
      batchSize = 10,
      maxRetries = 5,
      deleteLocalAfterSync = this.deleteLocalAfterUpload
    } = options;

    if (!this.s3Provider) {
      logger.debug("S3 not configured, skipping sync");
      return { synced: 0, failed: 0, remaining: 0, errors: [] };
    }

    if (this.isRunning) {
      logger.debug("Sync already in progress, skipping");
      return { synced: 0, failed: 0, remaining: 0, errors: [] };
    }

    this.isRunning = true;
    const result: SyncResult = {
      synced: 0,
      failed: 0,
      remaining: 0,
      errors: []
    };

    try {
      // Check if S3 is healthy
      const isHealthy = await this.s3Provider.isHealthy();
      if (!isHealthy) {
        logger.debug("S3 is not healthy, skipping sync");
        result.remaining = await this.getPendingCount();
        return result;
      }

      // Get pending uploads
      const pendingUploads = await PendingUpload.findAll({
        where: {
          status: {
            [Op.in]: ["pending", "failed"]
          },
          retryCount: {
            [Op.lt]: maxRetries
          }
        },
        order: [
          ["retryCount", "ASC"],
          ["createdAt", "ASC"]
        ],
        limit: batchSize
      });

      if (pendingUploads.length === 0) {
        return result;
      }

      logger.info(`Syncing ${pendingUploads.length} pending uploads to S3`);

      for (const upload of pendingUploads) {
        try {
          await this.syncSingleFile(upload, deleteLocalAfterSync);
          result.synced += 1;
        } catch (error: any) {
          result.failed += 1;
          result.errors.push({
            filename: upload.filename,
            error: error.message || String(error)
          });
        }
      }

      // Update remaining count
      result.remaining = await this.getPendingCount();

      if (result.synced > 0 || result.failed > 0) {
        logger.info(
          `Sync completed: ${result.synced} synced, ${result.failed} failed, ${result.remaining} remaining`
        );
      }

      return result;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Sync a single file to S3
   */
  private async syncSingleFile(
    upload: PendingUpload,
    deleteLocalAfterSync: boolean
  ): Promise<void> {
    const { filename, mimeType } = upload;

    try {
      // Mark as syncing
      await upload.update({
        status: "syncing" as PendingUploadStatus,
        lastAttempt: new Date()
      });

      // Check if file exists locally
      const existsLocally = await this.localProvider.exists(filename);
      if (!existsLocally) {
        logger.warn(`Local file not found: ${filename}`);
        await upload.update({
          status: "failed" as PendingUploadStatus,
          lastError: "Local file not found",
          retryCount: upload.retryCount + 1
        });
        return;
      }

      // Upload to S3
      const buffer = await this.localProvider.downloadToBuffer(filename);
      await this.s3Provider!.uploadBuffer(
        buffer,
        filename,
        mimeType || "application/octet-stream"
      );

      // Mark as completed
      await upload.update({
        status: "completed" as PendingUploadStatus
      });

      logger.info(`Successfully synced: ${filename}`);

      // Optionally delete local file
      if (deleteLocalAfterSync) {
        await this.localProvider.delete(filename);
        logger.debug(`Deleted local file after sync: ${filename}`);
      }
    } catch (error: any) {
      logger.warn(`Failed to sync ${filename}: ${error}`);
      await upload.update({
        status: "failed" as PendingUploadStatus,
        lastError: error.message || String(error),
        retryCount: upload.retryCount + 1
      });
      throw error;
    }
  }

  /**
   * Force retry a failed upload
   */
  async retryUpload(filename: string): Promise<boolean> {
    const upload = await PendingUpload.findOne({
      where: { filename }
    });

    if (!upload) {
      throw new Error(`Upload not found: ${filename}`);
    }

    if (!this.s3Provider) {
      throw new Error("S3 is not configured");
    }

    const isHealthy = await this.s3Provider.isHealthy();
    if (!isHealthy) {
      throw new Error("S3 is not available");
    }

    try {
      await this.syncSingleFile(upload, false);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear completed uploads from tracking table
   */
  // eslint-disable-next-line class-methods-use-this
  async clearCompletedUploads(): Promise<number> {
    const result = await PendingUpload.destroy({
      where: {
        status: "completed"
      }
    });
    logger.info(`Cleared ${result} completed uploads from tracking`);
    return result;
  }

  /**
   * Clear failed uploads that exceeded max retries
   */
  // eslint-disable-next-line class-methods-use-this
  async clearFailedUploads(maxRetries: number = 5): Promise<number> {
    const result = await PendingUpload.destroy({
      where: {
        status: "failed",
        retryCount: {
          [Op.gte]: maxRetries
        }
      }
    });
    logger.info(`Cleared ${result} failed uploads from tracking`);
    return result;
  }

  /**
   * Get sync statistics
   */
  // eslint-disable-next-line class-methods-use-this
  async getStats(): Promise<{
    pending: number;
    syncing: number;
    completed: number;
    failed: number;
  }> {
    const [pending, syncing, completed, failed] = await Promise.all([
      PendingUpload.count({ where: { status: "pending" } }),
      PendingUpload.count({ where: { status: "syncing" } }),
      PendingUpload.count({ where: { status: "completed" } }),
      PendingUpload.count({ where: { status: "failed" } })
    ]);

    return { pending, syncing, completed, failed };
  }
}

export default StorageSyncService;
