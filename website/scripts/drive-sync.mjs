#!/usr/bin/env node
/**
 * Drive Sync Module - Google Drive Integration
 * 
 * Lists files from a Google Drive folder, computes checksums, and detects
 * changes against last-known state for incremental sync.
 * 
 * Architecture:
 *   Drive folder change → Scheduled check → Diff detection → Download → Pipeline
 * 
 * Canonical Identity: Drive File ID (not filename)
 * Renaming in Drive should not break references.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SYNC_STATE = path.join(ROOT, "generated", "drive-sync-state.json");

/**
 * Drive file metadata
 */
class DriveFile {
  constructor(id, name, mimeType, modifiedTime, parents, size) {
    this.id = id;
    this.name = name;
    this.mimeType = mimeType;
    this.modifiedTime = modifiedTime;
    this.parents = parents || [];
    this.size = size || 0;
  }

  /**
   * Compute content hash for change detection
   * Uses MD5 for speed (Drive API already provides MD5 checksums)
   */
  get checksum() {
    return this.md5Checksum || this.id;
  }
}

/**
 * Sync state for incremental updates
 */
class SyncState {
  constructor() {
    this.lastSync = null;
    this.files = new Map(); // driveId -> file metadata
    this.checksums = new Map(); // driveId -> checksum
  }

  static async load() {
    try {
      const data = await fs.readFile(SYNC_STATE, "utf-8");
      const parsed = JSON.parse(data);
      const state = new SyncState();
      state.lastSync = parsed.lastSync;
      state.files = new Map(Object.entries(parsed.files || {}));
      state.checksums = new Map(Object.entries(parsed.checksums || {}));
      return state;
    } catch {
      return new SyncState();
    }
  }

  async save() {
    await fs.mkdir(path.dirname(SYNC_STATE), { recursive: true });
    await fs.writeFile(SYNC_STATE, JSON.stringify({
      lastSync: this.lastSync,
      files: Object.fromEntries(this.files),
      checksums: Object.fromEntries(this.checksums),
    }, null, 2));
  }

  updateFile(driveFile, checksum) {
    this.files.set(driveFile.id, driveFile);
    this.checksums.set(driveFile.id, checksum);
  }

  removeFile(driveId) {
    this.files.delete(driveId);
    this.checksums.delete(driveId);
  }
}

/**
 * Diff result for incremental sync
 */
class SyncDiff {
  constructor() {
    this.added = []; // New files
    this.changed = []; // Modified files
    this.removed = []; // Deleted files
    this.unchanged = []; // Unchanged files
  }
}

/**
 * Drive Sync Service
 * 
 * This is a stub implementation. The actual Google Drive API integration
 * will be added when credentials are configured.
 */
class DriveSyncService {
  constructor(folderId) {
    this.folderId = folderId;
    this.state = null;
  }

  /**
   * Initialize the sync service
   */
  async initialize() {
    this.state = await SyncState.load();
    console.log(`Drive sync initialized. Last sync: ${this.state.lastSync || "never"}`);
  }

  /**
   * List files from Drive folder
   * 
   * TODO: Implement actual Google Drive API call
   * Currently returns empty list as stub
   */
  async listFiles() {
    console.log("Listing files from Drive folder...");
    
    // Stub implementation - replace with actual Drive API call
    // const drive = google.drive({ version: 'v3', auth: oauth2Client });
    // const response = await drive.files.list({
    //   q: `'${this.folderId}' in parents`,
    //   fields: 'files(id,name,mimeType,modifiedTime,parents,size,md5Checksum)',
    // });
    
    return [];
  }

  /**
   * Compute diff between current Drive state and last-known state
   */
  async computeDiff() {
    const currentFiles = await this.listFiles();
    const diff = new SyncDiff();

    for (const file of currentFiles) {
      const existing = this.state.files.get(file.id);
      const checksum = file.checksum;

      if (!existing) {
        // New file
        diff.added.push(file);
        console.log(`  + ${file.name} (new)`);
      } else if (this.state.checksums.get(file.id) !== checksum) {
        // Changed file
        diff.changed.push(file);
        console.log(`  ~ ${file.name} (changed)`);
      } else {
        // Unchanged
        diff.unchanged.push(file);
      }
    }

    // Detect removed files
    for (const [driveId, file] of this.state.files) {
      const stillExists = currentFiles.find(f => f.id === driveId);
      if (!stillExists) {
        diff.removed.push(file);
        console.log(`  - ${file.name} (removed)`);
      }
    }

    return diff;
  }

  /**
   * Update sync state after successful sync
   */
  async updateState(diff) {
    this.state.lastSync = new Date().toISOString();

    for (const file of diff.added) {
      this.state.updateFile(file, file.checksum);
    }

    for (const file of diff.changed) {
      this.state.updateFile(file, file.checksum);
    }

    for (const file of diff.removed) {
      this.state.removeFile(file.id);
    }

    await this.state.save();
    console.log(`Sync state updated. Last sync: ${this.state.lastSync}`);
  }

  /**
   * Validate folder structure
   * 
   * Flags photos that have been in Drive for more than 24 hours
   * without a category/project folder assignment.
   */
  validateFolderStructure(files) {
    const now = new Date();
    const threshold = 24 * 60 * 60 * 1000; // 24 hours in ms
    const misfiled = [];

    for (const file of files) {
      const modifiedTime = new Date(file.modifiedTime);
      const age = now - modifiedTime;

      // Check if file is in root folder (no category/project assignment)
      if (file.parents.length === 0 || file.parents[0] === this.folderId) {
        if (age > threshold) {
          misfiled.push({
            file,
            ageHours: Math.floor(age / (60 * 60 * 1000)),
          });
        }
      }
    }

    if (misfiled.length > 0) {
      console.warn("\n⚠ Misfiled photos detected (no category/project folder):");
      for (const { file, ageHours } of misfiled) {
        console.warn(`  ${file.name} (${ageHours}h old)`);
      }
    }

    return misfiled;
  }
}

/**
 * Main sync function
 */
async function sync(folderId) {
  console.log("Starting Drive sync...");
  
  const service = new DriveSyncService(folderId);
  await service.initialize();

  const diff = await service.computeDiff();
  
  console.log(`\nDiff summary:`);
  console.log(`  Added: ${diff.added.length}`);
  console.log(`  Changed: ${diff.changed.length}`);
  console.log(`  Removed: ${diff.removed.length}`);
  console.log(`  Unchanged: ${diff.unchanged.length}`);

  if (diff.added.length > 0 || diff.changed.length > 0) {
    // Validate folder structure for new/changed files
    const allFiles = [...diff.added, ...diff.changed];
    service.validateFolderStructure(allFiles);

    // TODO: Download files and run through image-pipeline
    console.log("\nTODO: Download files and run through image-pipeline");
  }

  // Update state
  await service.updateState(diff);

  console.log("\nDrive sync complete.");
}

// Export for programmatic use
export { DriveSyncService, SyncState, SyncDiff, DriveFile };

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const folderId = process.env.DRIVE_FOLDER_ID;
  if (!folderId) {
    console.error("Error: DRIVE_FOLDER_ID environment variable not set");
    process.exit(1);
  }
  sync(folderId).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
