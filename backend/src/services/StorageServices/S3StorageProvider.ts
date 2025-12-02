import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand
} from "@aws-sdk/client-s3";
import { promises as fs } from "fs";
import { Readable } from "stream";
import { StorageProvider, UploadResult } from "./StorageProvider";
import getStorageConfig from "../../config/storage";
import { logger } from "../../utils/logger";

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;

  private bucket: string;

  private publicUrl: string;

  private storageType: "s3" | "s3_compatible";

  private prefix: string;

  constructor(type: "s3" | "s3_compatible" = "s3") {
    const config = getStorageConfig();
    this.bucket = config.s3.bucket;
    this.storageType = type;
    this.prefix = config.s3.prefix;

    const clientConfig: any = {
      region: config.s3.region,
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey
      }
    };

    // For S3-compatible services (MinIO, DigitalOcean Spaces, Cloudflare R2, etc.)
    if (config.s3.endpoint) {
      clientConfig.endpoint = config.s3.endpoint;
      clientConfig.forcePathStyle = config.s3.forcePathStyle;
    }

    this.client = new S3Client(clientConfig);

    // Build public URL
    if (config.s3.publicUrl) {
      this.publicUrl = config.s3.publicUrl;
    } else if (config.s3.endpoint) {
      // For S3-compatible services
      this.publicUrl = `${config.s3.endpoint}/${this.bucket}`;
    } else {
      // Standard AWS S3
      this.publicUrl = `https://${this.bucket}.s3.${config.s3.region}.amazonaws.com`;
    }

    logger.info(
      `S3StorageProvider initialized: bucket=${this.bucket}, prefix=${this.prefix}`
    );
  }

  /**
   * Get the full S3 key with prefix
   */
  private getFullKey(filename: string): string {
    if (this.prefix) {
      return `${this.prefix}/${filename}`;
    }
    return filename;
  }

  getType(): "s3" | "s3_compatible" {
    return this.storageType;
  }

  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadResult> {
    const key = this.getFullKey(filename);
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ACL: "public-read"
    });

    try {
      await this.client.send(command);

      return {
        filename,
        path: `s3://${this.bucket}/${key}`,
        url: this.getPublicUrl(filename),
        size: buffer.length,
        mimeType,
        storageType: this.storageType
      };
    } catch (error) {
      logger.error(`S3Storage: Failed to upload ${filename}: ${error}`);
      throw error;
    }
  }

  async uploadBase64(
    base64Data: string,
    filename: string,
    mimeType: string
  ): Promise<UploadResult> {
    const buffer = Buffer.from(base64Data, "base64");
    return this.uploadBuffer(buffer, filename, mimeType);
  }

  async uploadFromPath(
    localPath: string,
    filename: string,
    mimeType: string
  ): Promise<UploadResult> {
    const buffer = await fs.readFile(localPath);
    return this.uploadBuffer(buffer, filename, mimeType);
  }

  async downloadToBuffer(filename: string): Promise<Buffer> {
    const key = this.getFullKey(filename);
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    });

    try {
      const response = await this.client.send(command);
      const stream = response.Body as Readable;

      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on("data", chunk => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
      });
    } catch (error) {
      logger.error(`S3Storage: Failed to download ${filename}: ${error}`);
      throw error;
    }
  }

  async delete(filename: string): Promise<boolean> {
    const key = this.getFullKey(filename);
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key
    });

    try {
      await this.client.send(command);
      return true;
    } catch (error) {
      logger.warn(`S3Storage: Failed to delete ${filename}: ${error}`);
      return false;
    }
  }

  async exists(filename: string): Promise<boolean> {
    const key = this.getFullKey(filename);
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key
    });

    try {
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(filename: string): string {
    const key = this.getFullKey(filename);
    return `${this.publicUrl}/${key}`;
  }

  async isHealthy(): Promise<boolean> {
    const command = new HeadBucketCommand({
      Bucket: this.bucket
    });

    try {
      await this.client.send(command);
      return true;
    } catch (error) {
      logger.warn(`S3Storage: Health check failed: ${error}`);
      return false;
    }
  }

  async listFiles(prefix?: string): Promise<string[]> {
    // Combine base prefix with optional additional prefix
    let fullPrefix = this.prefix;
    if (prefix) {
      fullPrefix = this.prefix ? `${this.prefix}/${prefix}` : prefix;
    }

    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: fullPrefix
    });

    try {
      const response = await this.client.send(command);
      // Remove the base prefix from results to return relative filenames
      const prefixToRemove = this.prefix ? `${this.prefix}/` : "";
      return (response.Contents || [])
        .map(item => item.Key)
        .filter((key): key is string => !!key)
        .map(key => key.replace(prefixToRemove, ""));
    } catch (error) {
      logger.error(`S3Storage: Failed to list files: ${error}`);
      return [];
    }
  }
}
