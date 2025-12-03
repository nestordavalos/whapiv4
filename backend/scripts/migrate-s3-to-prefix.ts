/**
 * Script to migrate S3 files from root to prefix folder
 *
 * This script moves all files from the root of the S3 bucket
 * to the configured prefix folder (e.g., whapi/)
 *
 * Usage: npx ts-node scripts/migrate-s3-to-prefix.ts [--dry-run]
 */

import {
  S3Client,
  ListObjectsV2Command,
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand
} from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";

dotenv.config();

interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string | undefined;
  forcePathStyle: boolean;
  prefix: string;
}

interface S3ClientConfig {
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  endpoint?: string;
  forcePathStyle?: boolean;
}

interface MigrationResult {
  migrated: number;
  skipped: number;
  failed: number;
}

const config: S3Config = {
  bucket: process.env.STORAGE_S3_BUCKET || "",
  region: process.env.STORAGE_S3_REGION || "us-east-1",
  accessKeyId: process.env.STORAGE_S3_ACCESS_KEY || "",
  secretAccessKey: process.env.STORAGE_S3_SECRET_KEY || "",
  endpoint: process.env.STORAGE_S3_ENDPOINT || undefined,
  forcePathStyle: process.env.STORAGE_S3_FORCE_PATH_STYLE === "true",
  prefix: process.env.STORAGE_S3_PREFIX || "whapi"
};

const dryRun = process.argv.includes("--dry-run");

function printHeader(): void {
  console.log("=".repeat(60));
  console.log("S3 Migration: Root to Prefix");
  console.log("=".repeat(60));
  console.log(`Bucket: ${config.bucket}`);
  console.log(`Endpoint: ${config.endpoint || "AWS S3"}`);
  console.log(`Target Prefix: ${config.prefix}/`);
  console.log(`Dry Run: ${dryRun}`);
  console.log("=".repeat(60));
}

function printSummary(result: MigrationResult): void {
  console.log(`\n${"=".repeat(60)}`);
  console.log("Migration Summary");
  console.log("=".repeat(60));
  console.log(`Migrated: ${result.migrated}`);
  console.log(`Skipped (already exists): ${result.skipped}`);
  console.log(`Failed: ${result.failed}`);

  if (dryRun) {
    console.log("\nThis was a DRY RUN. No changes were made.");
    console.log("Run without --dry-run to perform actual migration.");
  }
}

async function listAllObjects(client: S3Client): Promise<string[]> {
  console.log("\nListing objects in bucket...");

  const allObjects: string[] = [];
  let continuationToken: string | undefined;

  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: config.bucket,
      ContinuationToken: continuationToken
    });

    const response = await client.send(listCommand);

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key) {
          allObjects.push(obj.Key);
        }
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return allObjects;
}

async function checkTargetExists(
  client: S3Client,
  targetKey: string
): Promise<boolean> {
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: config.bucket,
        Key: targetKey
      })
    );
    return true;
  } catch {
    return false;
  }
}

async function migrateObject(
  client: S3Client,
  sourceKey: string,
  targetKey: string
): Promise<"migrated" | "skipped" | "failed"> {
  try {
    // Check if target already exists
    const exists = await checkTargetExists(client, targetKey);
    if (exists) {
      console.log(`SKIP: ${sourceKey} -> already exists at ${targetKey}`);
      return "skipped";
    }

    if (dryRun) {
      console.log(`[DRY RUN] COPY: ${sourceKey} -> ${targetKey}`);
      return "migrated";
    }

    // Copy object to new location
    await client.send(
      new CopyObjectCommand({
        Bucket: config.bucket,
        CopySource: `${config.bucket}/${sourceKey}`,
        Key: targetKey,
        ACL: "public-read"
      })
    );

    // Delete original
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: sourceKey
      })
    );

    console.log(`OK: ${sourceKey} -> ${targetKey}`);
    return "migrated";
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`FAIL: ${sourceKey} - ${msg}`);
    return "failed";
  }
}

async function main(): Promise<void> {
  printHeader();

  if (!config.bucket || !config.accessKeyId || !config.secretAccessKey) {
    console.error("ERROR: Missing S3 configuration. Check your .env file.");
    process.exit(1);
  }

  const clientConfig: S3ClientConfig = {
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  };

  if (config.endpoint) {
    clientConfig.endpoint = config.endpoint;
    clientConfig.forcePathStyle = config.forcePathStyle;
  }

  const client = new S3Client(clientConfig);

  const allObjects = await listAllObjects(client);
  console.log(`Total objects in bucket: ${allObjects.length}`);

  // Separate objects: root vs already in prefix
  const rootObjects = allObjects.filter(
    key => !key.startsWith(`${config.prefix}/`)
  );
  const prefixObjects = allObjects.filter(key =>
    key.startsWith(`${config.prefix}/`)
  );

  console.log(`Objects in root (to migrate): ${rootObjects.length}`);
  console.log(`Objects already in ${config.prefix}/: ${prefixObjects.length}`);

  if (rootObjects.length === 0) {
    console.log(
      "\nNo objects to migrate. All files are already in the prefix folder."
    );
    process.exit(0);
  }

  // Migrate each root object to prefix
  console.log("\nStarting migration...\n");

  const result: MigrationResult = {
    migrated: 0,
    skipped: 0,
    failed: 0
  };

  for (const sourceKey of rootObjects) {
    const targetKey = `${config.prefix}/${sourceKey}`;
    const status = await migrateObject(client, sourceKey, targetKey);

    if (status === "migrated") {
      result.migrated += 1;
    } else if (status === "skipped") {
      result.skipped += 1;
    } else {
      result.failed += 1;
    }
  }

  printSummary(result);
}

main().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error("Migration failed:", errorMessage);
  process.exit(1);
});
