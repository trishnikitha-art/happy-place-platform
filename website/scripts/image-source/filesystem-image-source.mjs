/**
 * FilesystemImageSource — local filesystem adapter for ImageSource.
 *
 * Reads photos from a directory on the local filesystem. This is the
 * default adapter for development and single-machine deployments.
 *
 * Constitutional role: the only module that touches the filesystem for
 * source photography. The pipeline never calls fs.readdir, fs.readFile,
 * or fs.stat directly — it goes through ImageSource.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { ImageSource } from "./image-source.mjs";

const RASTER = /\.(jpe?g|png|webp|tiff?|heic?)$/i;

export class FilesystemImageSource extends ImageSource {
  /** @type {string} absolute path to the intake root */
  #root;

  /**
   * @param {string} root - absolute path to the photo intake directory
   */
  constructor(root) {
    super();
    this.#root = root;
  }

  /** @returns {string} the root path (for display/logging) */
  get root() {
    return this.#root;
  }

  async listProjects() {
    let entries;
    try {
      entries = await fs.readdir(this.#root, { withFileTypes: true });
    } catch {
      return [];
    }
    return entries
      .filter((e) => e.isDirectory() && e.name !== "_archive")
      .map((e) => ({
        name: e.name,
        slug: slugify(e.name),
      }));
  }

  async listFiles(project) {
    const projectDir = path.join(this.#root, project);
    const files = [];
    await walkDir(projectDir, projectDir, files);
    return files;
  }

  async open(project, filePath) {
    return fs.readFile(path.join(this.#root, project, filePath));
  }

  async stat(project, filePath) {
    const s = await fs.stat(path.join(this.#root, project, filePath));
    return { size: s.size, mtime: s.mtime };
  }

  async exists(project, filePath) {
    try {
      await fs.access(path.join(this.#root, project, filePath));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Recursively walk a directory, collecting raster image files.
 * @param {string} dir - absolute path
 * @param {string} base - base path for relative path computation
 * @param {ImageFile[]} acc - accumulator
 */
async function walkDir(dir, base, acc) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      await walkDir(full, base, acc);
    } else if (RASTER.test(e.name)) {
      const s = await fs.stat(full);
      acc.push({
        name: e.name,
        path: path.relative(base, full).replace(/\\/g, "/"),
        size: s.size,
      });
    }
  }
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
