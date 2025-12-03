/**
 * Storage Provider Interface
 *
 * Abstract interface for storage operations supporting:
 * - Local filesystem
 * - AWS S3
 * - S3-compatible services (MinIO, DigitalOcean Spaces, Cloudflare R2, etc.)
 */

export interface UploadResult {
  filename: string;
  path: string;
  url: string;
  size: number;
  mimeType: string;
  storageType: "local" | "s3" | "s3_compatible";
}

export interface StorageProvider {
  /**
   * Upload a file from buffer
   */
  uploadBuffer(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadResult>;

  /**
   * Upload a file from base64 string
   */
  uploadBase64(
    base64Data: string,
    filename: string,
    mimeType: string
  ): Promise<UploadResult>;

  /**
   * Upload a file from local path
   */
  uploadFromPath(
    localPath: string,
    filename: string,
    mimeType: string
  ): Promise<UploadResult>;

  /**
   * Download a file to buffer
   */
  downloadToBuffer(filename: string): Promise<Buffer>;

  /**
   * Delete a file
   */
  delete(filename: string): Promise<boolean>;

  /**
   * Check if file exists
   */
  exists(filename: string): Promise<boolean>;

  /**
   * Get public URL for a file
   */
  getPublicUrl(filename: string): string;

  /**
   * Check if storage is available/healthy
   */
  isHealthy(): Promise<boolean>;

  /**
   * List files with optional prefix
   */
  listFiles(prefix?: string): Promise<string[]>;

  /**
   * Get storage type identifier
   */
  getType(): "local" | "s3" | "s3_compatible";
}
