import path from "path";
import { Op } from "sequelize";
import { LocalStorageProvider } from "./LocalStorageProvider";
import { S3StorageProvider } from "./S3StorageProvider";
import { logger } from "../../utils/logger";
import getStorageConfig from "../../config/storage";
import Message from "../../models/Message";

export interface MigrationProgress {
  total: number;
  migrated: number;
  failed: number;
  skipped: number;
  currentFile: string;
  status: "idle" | "running" | "completed" | "failed" | "cancelled";
  errors: Array<{ filename: string; error: string }>;
  startTime?: Date;
  endTime?: Date;
}

export interface MigrationOptions {
  batchSize?: number;
  dryRun?: boolean;
  deleteLocalAfterMigration?: boolean;
  onProgress?: (progress: MigrationProgress) => void;
}

/**
 * Service for migrating media files from local storage to S3/S3-compatible
 */
class StorageMigrationService {
  private localProvider: LocalStorageProvider;

  private s3Provider: S3StorageProvider | null = null;

  private progress: MigrationProgress;

  private isCancelled = false;

  private deleteLocalAfterUpload: boolean;

  constructor() {
    this.localProvider = new LocalStorageProvider();
    this.progress = this.getInitialProgress();

    const config = getStorageConfig();
    if (config.type === "s3" || config.type === "s3_compatible") {
      this.s3Provider = new S3StorageProvider(config.type);
    }
    this.deleteLocalAfterUpload = config.deleteLocalAfterUpload;
  }

  // eslint-disable-next-line class-methods-use-this
  private getInitialProgress(): MigrationProgress {
    return {
      total: 0,
      migrated: 0,
      failed: 0,
      skipped: 0,
      currentFile: "",
      status: "idle",
      errors: []
    };
  }

  /**
   * Get current migration progress
   */
  getProgress(): MigrationProgress {
    return { ...this.progress };
  }

  /**
   * Cancel ongoing migration
   */
  cancel(): void {
    this.isCancelled = true;
    this.progress.status = "cancelled";
  }

  /**
   * Check if S3 is configured and available
   */
  async isS3Available(): Promise<boolean> {
    if (!this.s3Provider) {
      return false;
    }
    return this.s3Provider.isHealthy();
  }

  /**
   * Get list of local files that can be migrated
   */
  async getLocalFiles(): Promise<string[]> {
    return this.localProvider.listFiles();
  }

  /**
   * Get list of files in S3
   */
  async getS3Files(): Promise<string[]> {
    if (!this.s3Provider) {
      return [];
    }
    return this.s3Provider.listFiles();
  }

  /**
   * Get list of files referenced in messages
   */
  // eslint-disable-next-line class-methods-use-this
  async getReferencedFiles(): Promise<string[]> {
    const messages = await Message.findAll({
      where: {
        mediaUrl: {
          [Op.ne]: null
        }
      },
      attributes: ["mediaUrl"],
      raw: true
    });

    // Extract filename from mediaUrl (it's stored as just the filename)
    return messages
      .map((m: any) => {
        const { mediaUrl } = m;
        if (!mediaUrl) return null;
        // If it's a full URL, extract just the filename
        if (mediaUrl.includes("/")) {
          return mediaUrl.split("/").pop();
        }
        return mediaUrl;
      })
      .filter((f: string | null): f is string => !!f);
  }

  /**
   * Migrate all local files to S3
   */
  async migrateToS3(
    options: MigrationOptions = {}
  ): Promise<MigrationProgress> {
    const {
      batchSize = 10,
      dryRun = false,
      deleteLocalAfterMigration = this.deleteLocalAfterUpload,
      onProgress
    } = options;

    if (!this.s3Provider) {
      throw new Error(
        "S3 is not configured. Set STORAGE_TYPE to 's3' or 's3_compatible'"
      );
    }

    const isHealthy = await this.s3Provider.isHealthy();
    if (!isHealthy) {
      throw new Error("S3 storage is not available");
    }

    this.isCancelled = false;
    this.progress = this.getInitialProgress();
    this.progress.status = "running";
    this.progress.startTime = new Date();

    try {
      // Get all local files
      const localFiles = await this.getLocalFiles();
      this.progress.total = localFiles.length;

      logger.info(
        `Starting migration of ${localFiles.length} files to S3 (dryRun: ${dryRun})`
      );

      // Process in batches
      for (let i = 0; i < localFiles.length; i += batchSize) {
        if (this.isCancelled) {
          logger.info("Migration cancelled by user");
          break;
        }

        const batch = localFiles.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async filename => {
            await this.migrateFile(filename, dryRun, deleteLocalAfterMigration);
          })
        );

        if (onProgress) {
          onProgress(this.getProgress());
        }
      }

      this.progress.status = this.isCancelled ? "cancelled" : "completed";
      this.progress.endTime = new Date();

      logger.info(
        `Migration completed: ${this.progress.migrated} migrated, ${this.progress.failed} failed, ${this.progress.skipped} skipped`
      );

      return this.getProgress();
    } catch (error) {
      this.progress.status = "failed";
      this.progress.endTime = new Date();
      logger.error(`Migration failed: ${error}`);
      throw error;
    }
  }

  /**
   * Migrate a single file to S3
   */
  private async migrateFile(
    filename: string,
    dryRun: boolean,
    deleteLocal: boolean
  ): Promise<void> {
    this.progress.currentFile = filename;

    try {
      // Check if file already exists in S3
      const existsInS3 = await this.s3Provider!.exists(filename);
      if (existsInS3) {
        this.progress.skipped += 1;
        logger.debug(`Skipping ${filename} - already exists in S3`);

        // Even if skipped, delete local if option is enabled
        if (deleteLocal) {
          await this.localProvider.delete(filename);
          logger.debug(`Deleted local file (already in S3): ${filename}`);
        }
        return;
      }

      if (dryRun) {
        this.progress.migrated += 1;
        logger.info(`[DRY RUN] Would migrate: ${filename}`);
        return;
      }

      // Download from local
      const buffer = await this.localProvider.downloadToBuffer(filename);

      // Determine mime type from extension
      const mimeType = this.getMimeType(filename);

      // Upload to S3
      await this.s3Provider!.uploadBuffer(buffer, filename, mimeType);

      this.progress.migrated += 1;
      logger.info(`Migrated: ${filename}`);

      // Optionally delete local file
      if (deleteLocal) {
        await this.localProvider.delete(filename);
        logger.debug(`Deleted local file: ${filename}`);
      }
    } catch (error: any) {
      this.progress.failed += 1;
      this.progress.errors.push({
        filename,
        error: error.message || String(error)
      });
      logger.warn(`Failed to migrate ${filename}: ${error}`);
    }
  }

  /**
   * Migrate from S3 back to local (reverse migration)
   */
  async migrateToLocal(
    options: MigrationOptions = {}
  ): Promise<MigrationProgress> {
    const { batchSize = 10, dryRun = false, onProgress } = options;

    if (!this.s3Provider) {
      throw new Error("S3 is not configured");
    }

    this.isCancelled = false;
    this.progress = this.getInitialProgress();
    this.progress.status = "running";
    this.progress.startTime = new Date();

    try {
      const s3Files = await this.s3Provider.listFiles();
      this.progress.total = s3Files.length;

      logger.info(
        `Starting reverse migration of ${s3Files.length} files from S3 to local`
      );

      for (let i = 0; i < s3Files.length; i += batchSize) {
        if (this.isCancelled) break;

        const batch = s3Files.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async filename => {
            await this.migrateFileToLocal(filename, dryRun);
          })
        );

        if (onProgress) {
          onProgress(this.getProgress());
        }
      }

      this.progress.status = this.isCancelled ? "cancelled" : "completed";
      this.progress.endTime = new Date();

      return this.getProgress();
    } catch (error) {
      this.progress.status = "failed";
      this.progress.endTime = new Date();
      throw error;
    }
  }

  private async migrateFileToLocal(
    filename: string,
    dryRun: boolean
  ): Promise<void> {
    this.progress.currentFile = filename;

    try {
      const existsLocally = await this.localProvider.exists(filename);
      if (existsLocally) {
        this.progress.skipped += 1;
        return;
      }

      if (dryRun) {
        this.progress.migrated += 1;
        logger.info(`[DRY RUN] Would migrate to local: ${filename}`);
        return;
      }

      const buffer = await this.s3Provider!.downloadToBuffer(filename);
      const mimeType = this.getMimeType(filename);

      await this.localProvider.uploadBuffer(buffer, filename, mimeType);

      this.progress.migrated += 1;
      logger.info(`Migrated to local: ${filename}`);
    } catch (error: any) {
      this.progress.failed += 1;
      this.progress.errors.push({
        filename,
        error: error.message || String(error)
      });
      logger.warn(`Failed to migrate to local ${filename}: ${error}`);
    }
  }

  /**
   * Verify migration - check that all local files exist in S3
   */
  async verifyMigration(): Promise<{
    verified: number;
    missing: string[];
    extra: string[];
  }> {
    if (!this.s3Provider) {
      throw new Error("S3 is not configured");
    }

    const localFiles = await this.getLocalFiles();
    const s3Files = new Set(await this.s3Provider.listFiles());

    const missing: string[] = [];
    let verified = 0;

    for (const file of localFiles) {
      if (s3Files.has(file)) {
        verified += 1;
        s3Files.delete(file);
      } else {
        missing.push(file);
      }
    }

    return {
      verified,
      missing,
      extra: Array.from(s3Files)
    };
  }

  /**
   * Clean up local files that have been successfully migrated to S3
   */
  async cleanupLocalAfterMigration(): Promise<{
    deleted: number;
    errors: string[];
  }> {
    if (!this.s3Provider) {
      throw new Error("S3 is not configured");
    }

    const localFiles = await this.getLocalFiles();
    let deleted = 0;
    const errors: string[] = [];

    for (const filename of localFiles) {
      try {
        const existsInS3 = await this.s3Provider.exists(filename);
        if (existsInS3) {
          await this.localProvider.delete(filename);
          deleted += 1;
          logger.debug(`Cleaned up local file: ${filename}`);
        }
      } catch (error) {
        errors.push(filename);
        logger.warn(`Failed to clean up ${filename}: ${error}`);
      }
    }

    logger.info(`Cleanup completed: ${deleted} files deleted`);
    return { deleted, errors };
  }

  // eslint-disable-next-line class-methods-use-this
  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase().slice(1);
    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      mp4: "video/mp4",
      webm: "video/webm",
      mp3: "audio/mpeg",
      ogg: "audio/ogg",
      wav: "audio/wav",
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      zip: "application/zip",
      txt: "text/plain"
    };

    return mimeTypes[ext] || "application/octet-stream";
  }
}

export default StorageMigrationService;
