import { Router } from "express";
import isAuth from "../middleware/isAuth";

import * as StorageController from "../controllers/StorageController";

const storageRoutes = Router();

// Storage status
storageRoutes.get(
  "/storage/status",
  isAuth,
  StorageController.getStorageStatus
);

// Migration routes
storageRoutes.get(
  "/storage/migration/status",
  isAuth,
  StorageController.getMigrationStatus
);
storageRoutes.post(
  "/storage/migration/to-s3",
  isAuth,
  StorageController.startMigrationToS3
);
storageRoutes.post(
  "/storage/migration/to-local",
  isAuth,
  StorageController.startMigrationToLocal
);
storageRoutes.post(
  "/storage/migration/cancel",
  isAuth,
  StorageController.cancelMigration
);
storageRoutes.get(
  "/storage/migration/verify",
  isAuth,
  StorageController.verifyMigration
);
storageRoutes.post(
  "/storage/migration/cleanup",
  isAuth,
  StorageController.cleanupLocalFiles
);

// Sync routes
storageRoutes.get(
  "/storage/sync/status",
  isAuth,
  StorageController.getSyncStatus
);
storageRoutes.post(
  "/storage/sync/trigger",
  isAuth,
  StorageController.triggerSync
);
storageRoutes.post(
  "/storage/sync/retry/:filename",
  isAuth,
  StorageController.retryUpload
);
storageRoutes.get(
  "/storage/sync/pending",
  isAuth,
  StorageController.getPendingUploads
);
storageRoutes.delete(
  "/storage/sync/completed",
  isAuth,
  StorageController.clearCompletedUploads
);

// Local files
storageRoutes.get(
  "/storage/local/files",
  isAuth,
  StorageController.getLocalFiles
);

export default storageRoutes;
