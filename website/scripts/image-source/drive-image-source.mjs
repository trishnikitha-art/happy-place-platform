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

const RASTER = /\.(jpe?g|png|webp|tiff?|heic?)$/i;

export class DriveImageSource extends ImageSource {
  /** @type {string} Google Drive folder ID */
  #folderId;
  
  /** @type {string} local cache directory for downloaded files */
  #cacheDir;
  
  /** @type {Object} Drive API client (stub) */
  #drive;

  /**
   * @param {string} folderId - Google Drive folder ID
   * @param {string} cacheDir - local cache directory
   */
  constructor(folderId, cacheDir) {
    super();
    this.#folderId = folderId;
    this.#cacheDir = cacheDir;
    this.#drive = null; // TODO: Initialize Google Drive client
  }

  /** @returns {string} the cache directory path */
  get cacheDir() {
    return this.#cacheDir;
  }

  async listProjects() {
    console.log("Listing projects from Drive...");
    
    // TODO: Implement actual Drive API call
    // const response = await this.#drive.files.list({
    //   q: `'${this.#folderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
    //   fields: 'files(id,name)',
    // });
    
    // Stub implementation - returns empty list
    return [];
  }

  async listFiles(project) {
    console.log(`Listing files for project: ${project}`);
    
    // TODO: Implement actual Drive API call
    // const response = await this.#drive.files.list({
    //   q: `'${project}' in parents`,
    //   fields: 'files(id,name,size,md5Checksum)',
    // });
    
    // Stub implementation - returns empty list
    return [];
  }

  async open(project, filePath) {
    const cachePath = path.join(this.#cacheDir, project, filePath);
    
    // Check if file is already cached
    if (await this.exists(project, filePath)) {
      return fs.readFile(cachePath);
    }
    
    // TODO: Download from Drive and cache
    console.log(`Downloading ${filePath} from Drive...`);
    
    // const response = await this.#drive.files.get(
    //   { fileId: fileId, alt: 'media' },
    //   { responseType: 'arraybuffer' }
    // );
    
    // await fs.mkdir(path.dirname(cachePath), { recursive: true });
    // await fs.writeFile(cachePath, Buffer.from(response.data));
    
    return fs.readFile(cachePath);
  }

  async stat(project, filePath) {
    const cachePath = path.join(this.#cacheDir, project, filePath);
    const s = await fs.stat(cachePath);
    return { size: s.size, mtime: s.mtime };
  }

  async exists(project, filePath) {
    try {
      await fs.access(path.join(this.#cacheDir, project, filePath));
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
