import { promises as fs } from "fs";
import path from "path";
import { StorageProvider, UploadResult } from "./StorageProvider";
import getStorageConfig from "../../config/storage";
import { logger } from "../../utils/logger";

export class LocalStorageProvider implements StorageProvider {
  private directory: string;

  private publicUrl: string;

  constructor() {
    const config = getStorageConfig();
    this.directory = path.resolve(__dirname, "..", "..", "..", "public");
    this.publicUrl = config.local.publicUrl;
  }

  // eslint-disable-next-line class-methods-use-this
  getType(): "local" {
    return "local";
  }

  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadResult> {
    const filePath = path.join(this.directory, filename);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);

    return {
      filename,
      path: filePath,
      url: this.getPublicUrl(filename),
      size: buffer.length,
      mimeType,
      storageType: "local"
    };
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
    const filePath = path.join(this.directory, filename);
    return fs.readFile(filePath);
  }

  async delete(filename: string): Promise<boolean> {
    try {
      const filePath = path.join(this.directory, filename);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      logger.warn(`LocalStorage: Failed to delete ${filename}: ${error}`);
      return false;
    }
  }

  async exists(filename: string): Promise<boolean> {
    try {
      const filePath = path.join(this.directory, filename);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(filename: string): string {
    return `${this.publicUrl}/${filename}`;
  }

  async isHealthy(): Promise<boolean> {
    try {
      await fs.access(this.directory);
      return true;
    } catch {
      return false;
    }
  }

  async listFiles(prefix?: string): Promise<string[]> {
    try {
      const files = await fs.readdir(this.directory);
      if (prefix) {
        return files.filter(file => file.startsWith(prefix));
      }
      return files;
    } catch (error) {
      logger.error(`LocalStorage: Failed to list files: ${error}`);
      return [];
    }
  }

  getDirectory(): string {
    return this.directory;
  }
}
