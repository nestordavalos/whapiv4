/**
 * Storage Configuration
 *
 * Supports: local, s3, s3_compatible
 *
 * Environment Variables:
 * - STORAGE_TYPE: local | s3 | s3_compatible
 * - STORAGE_S3_BUCKET: S3 bucket name
 * - STORAGE_S3_REGION: AWS region (default: us-east-1)
 * - STORAGE_S3_ACCESS_KEY: AWS access key ID
 * - STORAGE_S3_SECRET_KEY: AWS secret access key
 * - STORAGE_S3_ENDPOINT: Custom endpoint for S3-compatible services (MinIO, DigitalOcean Spaces, etc.)
 * - STORAGE_S3_FORCE_PATH_STYLE: Force path style URLs (required for some S3-compatible services)
 * - STORAGE_S3_PUBLIC_URL: Public URL for accessing files (optional, for custom CDN)
 * - STORAGE_S3_PREFIX: Folder prefix within the bucket (default: whapi)
 * - STORAGE_FALLBACK_TO_LOCAL: If true, falls back to local storage when S3 fails (default: true)
 * - STORAGE_DELETE_LOCAL_AFTER_UPLOAD: If true, deletes local files after successful S3 upload (default: false)
 */

export type StorageType = "local" | "s3" | "s3_compatible";

export interface StorageConfig {
  type: StorageType;
  local: {
    directory: string;
    publicUrl: string;
  };
  s3: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
    forcePathStyle: boolean;
    publicUrl?: string;
    prefix: string;
  };
  fallbackToLocal: boolean;
  deleteLocalAfterUpload: boolean;
}

const getStorageConfig = (): StorageConfig => {
  const storageType = (process.env.STORAGE_TYPE || "local") as StorageType;

  return {
    type: storageType,
    local: {
      directory: process.env.STORAGE_LOCAL_DIRECTORY || "./public",
      publicUrl: `${process.env.BACKEND_URL}:${process.env.PROXY_PORT}/public`
    },
    s3: {
      bucket: process.env.STORAGE_S3_BUCKET || "",
      region: process.env.STORAGE_S3_REGION || "us-east-1",
      accessKeyId: process.env.STORAGE_S3_ACCESS_KEY || "",
      secretAccessKey: process.env.STORAGE_S3_SECRET_KEY || "",
      endpoint: process.env.STORAGE_S3_ENDPOINT || undefined,
      forcePathStyle: process.env.STORAGE_S3_FORCE_PATH_STYLE === "true",
      publicUrl: process.env.STORAGE_S3_PUBLIC_URL || undefined,
      prefix: process.env.STORAGE_S3_PREFIX || "whapi"
    },
    fallbackToLocal: process.env.STORAGE_FALLBACK_TO_LOCAL !== "false",
    deleteLocalAfterUpload:
      process.env.STORAGE_DELETE_LOCAL_AFTER_UPLOAD === "true"
  };
};

export default getStorageConfig;
