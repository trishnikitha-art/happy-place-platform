/**
 * DriveImageSource — Google Drive adapter for ImageSource.
 *
 * Reads photos from Google Drive and downloads them to a local cache
 * for processing by the image pipeline.
 *
 * Constitutional role: the only module that touches Google Drive for
 * source photography. The pipeline never calls Drive API directly —
 * it goes through ImageSource.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ImageSource } from "./image-source.mjs";
import { google } from "googleapis";

const RASTER = /\.(jpe?g|png|webp|tiff?|heic?)$/i;

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export class DriveImageSource extends ImageSource {
  /** @type {string} Google Drive folder ID */
  #folderId;
  
  /** @type {string} local cache directory for downloaded files */
  #cacheDir;
  
  /** @type {Object} Drive API client */
  #drive;

  /**
   * @param {string} folderId - Google Drive folder ID
   * @param {string} cacheDir - local cache directory
   */
  constructor(folderId, cacheDir) {
    super();
    this.#folderId = folderId;
    this.#cacheDir = cacheDir;
    this.#drive = null;
  }

  /**
   * Initialize Drive API client with service account credentials
   */
  async #initializeDrive() {
    if (this.#drive) return;

    const serviceAccountKey = process.env.DRIVE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      throw new Error("DRIVE_SERVICE_ACCOUNT_KEY environment variable not set");
    }

    let credentials;
    try {
      credentials = JSON.parse(serviceAccountKey);
    } catch (e) {
      throw new Error("DRIVE_SERVICE_ACCOUNT_KEY must be valid JSON");
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });

    this.#drive = google.drive({ version: "v3", auth });
    console.log("Drive API client initialized");
  }

  /** @returns {string} the cache directory path */
  get cacheDir() {
    return this.#cacheDir;
  }

  async listProjects() {
    console.log("Listing projects from Drive...");
    await this.#initializeDrive();

    const response = await this.#drive.files.list({
      q: `'${this.#folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id,name)',
    });

    return response.data.files.map((folder) => ({
      name: folder.name,
      slug: slugify(folder.name),
      driveId: folder.id,
    }));
  }

  async listFiles(project) {
    console.log(`Listing files for project: ${project}`);
    await this.#initializeDrive();

    const response = await this.#drive.files.list({
      q: `'${project.driveId}' in parents and trashed = false`,
      fields: 'files(id,name,size,md5Checksum,modifiedTime)',
    });

    return response.data.files
      .filter((file) => RASTER.test(file.name))
      .map((file) => ({
        name: file.name,
        path: file.name,
        size: parseInt(file.size, 10),
        driveId: file.id,
        md5Checksum: file.md5Checksum,
        modifiedTime: file.modifiedTime,
      }));
  }

  async open(project, filePath) {
    const cachePath = path.join(this.#cacheDir, project.slug, filePath);
    
    // Check if file is already cached
    if (await this.exists(project.slug, filePath)) {
      return fs.readFile(cachePath);
    }
    
    // Download from Drive and cache
    console.log(`Downloading ${filePath} from Drive...`);
    await this.#initializeDrive();

    const file = await this.#drive.files.get(
      { fileId: filePath.driveId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, Buffer.from(file.data));
    
    return fs.readFile(cachePath);
  }

  async stat(project, filePath) {
    const cachePath = path.join(this.#cacheDir, project.slug, filePath);
    const s = await fs.stat(cachePath);
    return { size: s.size, mtime: s.mtime };
  }

  async exists(project, filePath) {
    try {
      await fs.access(path.join(this.#cacheDir, project.slug, filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear the local cache
   */
  async clearCache() {
    try {
      await fs.rm(this.#cacheDir, { recursive: true, force: true });
      console.log(`Cleared cache: ${this.#cacheDir}`);
    } catch (e) {
      console.warn(`Failed to clear cache: ${e.message}`);
    }
  }

  /**
   * Get cache size in bytes
   */
  async getCacheSize() {
    let totalSize = 0;
    
    try {
      const files = await this.#walkCache(this.#cacheDir);
      for (const file of files) {
        const s = await fs.stat(file);
        totalSize += s.size;
      }
    } catch {
      // Cache may not exist yet
    }
    
    return totalSize;
  }

  async #walkCache(dir, acc = []) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return acc;
    }
    
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await this.#walkCache(full, acc);
      } else {
        acc.push(full);
      }
    }
    
    return acc;
  }
}
