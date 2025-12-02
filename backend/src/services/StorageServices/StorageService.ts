import { StorageProvider, UploadResult } from "./StorageProvider";
import { LocalStorageProvider } from "./LocalStorageProvider";
import { S3StorageProvider } from "./S3StorageProvider";
import getStorageConfig from "../../config/storage";
import { logger } from "../../utils/logger";
import PendingUpload from "../../models/PendingUpload";

/**
 * StorageService with fallback support
 *
 * Features:
 * - Automatic fallback to local storage when S3 fails
 * - Tracks pending uploads for later synchronization
 * - Unified API for all storage types
 */
export class StorageService {
  private primaryProvider: StorageProvider;

  private localProvider: LocalStorageProvider;

  private fallbackEnabled: boolean;

  private deleteLocalAfterUpload: boolean;

  private static instance: StorageService | null = null;

  constructor() {
    const config = getStorageConfig();
    this.localProvider = new LocalStorageProvider();
    this.fallbackEnabled = config.fallbackToLocal;
    this.deleteLocalAfterUpload = config.deleteLocalAfterUpload;

    switch (config.type) {
      case "s3":
        this.primaryProvider = new S3StorageProvider("s3");
        break;
      case "s3_compatible":
        this.primaryProvider = new S3StorageProvider("s3_compatible");
        break;
      case "local":
      default:
        this.primaryProvider = this.localProvider;
        break;
    }

    logger.info(
      `StorageService initialized with type: ${config.type}, fallback: ${this.fallbackEnabled}, deleteLocalAfterUpload: ${this.deleteLocalAfterUpload}`
    );
  }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  static resetInstance(): void {
    StorageService.instance = null;
  }

  getPrimaryProvider(): StorageProvider {
    return this.primaryProvider;
  }

  getLocalProvider(): LocalStorageProvider {
    return this.localProvider;
  }

  /**
   * Upload a file with automatic fallback
   * If S3 upload succeeds and deleteLocalAfterUpload is true, local file is deleted
   * If S3 fails and fallback is enabled, saves locally and tracks for later sync
   */
  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadResult> {
    // If primary is local, just upload directly
    if (this.primaryProvider.getType() === "local") {
      return this.primaryProvider.uploadBuffer(buffer, filename, mimeType);
    }

    // Try primary provider (S3)
    try {
      const isHealthy = await this.primaryProvider.isHealthy();
      if (isHealthy) {
        const result = await this.primaryProvider.uploadBuffer(
          buffer,
          filename,
          mimeType
        );

        // S3 upload successful - delete local file if it exists and option is enabled
        if (this.deleteLocalAfterUpload) {
          try {
            if (await this.localProvider.exists(filename)) {
              await this.localProvider.delete(filename);
              logger.debug(`Deleted local file after S3 upload: ${filename}`);
            }
          } catch (deleteError) {
            logger.warn(
              `Failed to delete local file after S3 upload: ${deleteError}`
            );
          }
        }

        return result;
      }
      throw new Error("Primary storage is not healthy");
    } catch (error) {
      logger.warn(
        `Primary storage failed for ${filename}, falling back to local: ${error}`
      );

      if (!this.fallbackEnabled) {
        throw error;
      }

      // Fallback to local storage
      const result = await this.localProvider.uploadBuffer(
        buffer,
        filename,
        mimeType
      );

      // Track as pending upload for later sync
      await this.trackPendingUpload(filename, mimeType, buffer.length);

      return {
        ...result,
        storageType: "local" // Mark as local fallback
      };
    }
  }

  /**
   * Upload from base64 with automatic fallback
   */
  async uploadBase64(
    base64Data: string,
    filename: string,
    mimeType: string
  ): Promise<UploadResult> {
    const buffer = Buffer.from(base64Data, "base64");
    return this.uploadBuffer(buffer, filename, mimeType);
  }

  /**
   * Upload from path with automatic fallback
   * If S3 upload succeeds and deleteLocalAfterUpload is true, local file is deleted
   */
  async uploadFromPath(
    localPath: string,
    filename: string,
    mimeType: string
  ): Promise<UploadResult> {
    // If primary is local, just copy
    if (this.primaryProvider.getType() === "local") {
      return this.primaryProvider.uploadFromPath(localPath, filename, mimeType);
    }

    try {
      const isHealthy = await this.primaryProvider.isHealthy();
      if (isHealthy) {
        const result = await this.primaryProvider.uploadFromPath(
          localPath,
          filename,
          mimeType
        );

        // S3 upload successful - delete local file if option is enabled
        if (this.deleteLocalAfterUpload) {
          try {
            if (await this.localProvider.exists(filename)) {
              await this.localProvider.delete(filename);
              logger.debug(`Deleted local file after S3 upload: ${filename}`);
            }
          } catch (deleteError) {
            logger.warn(
              `Failed to delete local file after S3 upload: ${deleteError}`
            );
          }
        }

        return result;
      }
      throw new Error("Primary storage is not healthy");
    } catch (error) {
      logger.warn(
        `Primary storage failed for ${filename}, falling back to local: ${error}`
      );

      if (!this.fallbackEnabled) {
        throw error;
      }

      const result = await this.localProvider.uploadFromPath(
        localPath,
        filename,
        mimeType
      );

      const stats = await require("fs").promises.stat(localPath);
      await this.trackPendingUpload(filename, mimeType, stats.size);

      return {
        ...result,
        storageType: "local"
      };
    }
  }

  /**
   * Download a file - tries primary first, then local
   */
  async downloadToBuffer(filename: string): Promise<Buffer> {
    // Try primary provider first
    if (this.primaryProvider.getType() !== "local") {
      try {
        if (await this.primaryProvider.exists(filename)) {
          return await this.primaryProvider.downloadToBuffer(filename);
        }
      } catch (error) {
        logger.warn(`Failed to download from primary storage: ${error}`);
      }
    }

    // Try local storage
    return this.localProvider.downloadToBuffer(filename);
  }

  /**
   * Delete a file from all storage locations
   */
  async delete(filename: string): Promise<boolean> {
    let success = true;

    // Delete from primary
    if (this.primaryProvider.getType() !== "local") {
      try {
        await this.primaryProvider.delete(filename);
      } catch (error) {
        logger.warn(`Failed to delete from primary storage: ${error}`);
        success = false;
      }
    }

    // Also delete from local if it exists
    try {
      if (await this.localProvider.exists(filename)) {
        await this.localProvider.delete(filename);
      }
    } catch (error) {
      logger.warn(`Failed to delete from local storage: ${error}`);
    }

    // Remove from pending uploads
    await this.removePendingUpload(filename);

    return success;
  }

  /**
   * Check if file exists in any storage
   */
  async exists(filename: string): Promise<boolean> {
    if (await this.localProvider.exists(filename)) {
      return true;
    }

    if (
      this.primaryProvider.getType() !== "local" &&
      (await this.primaryProvider.exists(filename))
    ) {
      return true;
    }

    return false;
  }

  /**
   * Get public URL for a file
   * Returns S3 URL if file is in S3, otherwise local URL
   */
  getPublicUrl(filename: string): string {
    // For now, return the primary provider URL
    // The actual URL will be determined by where the file is stored
    return this.primaryProvider.getPublicUrl(filename);
  }

  /**
   * Get public URL based on storage location
   */
  async getResolvedPublicUrl(filename: string): Promise<string> {
    // Check primary first if it's S3
    if (
      this.primaryProvider.getType() !== "local" &&
      (await this.primaryProvider.exists(filename))
    ) {
      return this.primaryProvider.getPublicUrl(filename);
    }

    // Check local
    if (await this.localProvider.exists(filename)) {
      return this.localProvider.getPublicUrl(filename);
    }

    // Default to primary URL
    return this.primaryProvider.getPublicUrl(filename);
  }

  /**
   * Check if primary storage is healthy
   */
  async isPrimaryHealthy(): Promise<boolean> {
    return this.primaryProvider.isHealthy();
  }

  /**
   * Get storage type
   */
  getStorageType(): "local" | "s3" | "s3_compatible" {
    return this.primaryProvider.getType();
  }

  /**
   * Track a file as pending upload to S3
   */
  // eslint-disable-next-line class-methods-use-this
  private async trackPendingUpload(
    filename: string,
    mimeType: string,
    size: number
  ): Promise<void> {
    try {
      await PendingUpload.create({
        filename,
        mimeType,
        size,
        status: "pending",
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      logger.info(`Tracked pending upload: ${filename}`);
    } catch (error: any) {
      // If duplicate, just update
      if (error.name === "SequelizeUniqueConstraintError") {
        await PendingUpload.update(
          { status: "pending", retryCount: 0, updatedAt: new Date() },
          { where: { filename } }
        );
      } else {
        logger.error(`Failed to track pending upload: ${error}`);
      }
    }
  }

  /**
   * Remove a file from pending uploads
   */
  // eslint-disable-next-line class-methods-use-this
  private async removePendingUpload(filename: string): Promise<void> {
    try {
      await PendingUpload.destroy({ where: { filename } });
    } catch (error) {
      logger.warn(`Failed to remove pending upload: ${error}`);
    }
  }
}

// Export singleton instance getter
export const getStorageService = (): StorageService => {
  return StorageService.getInstance();
};

export default StorageService;
