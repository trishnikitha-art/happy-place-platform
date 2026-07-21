/**
 * ImageSource — abstract interface for photo ingestion.
 *
 * The pipeline depends ONLY on this interface. Nothing downstream knows
 * whether bytes come from a local filesystem, Google Drive, S3, Dropbox,
 * or any future storage backend.
 *
 * Constitutional invariant: the repository never owns original photography.
 * This interface is the only coupling point between the pipeline and storage.
 *
 * Implementations:
 *   - FilesystemImageSource (local folder)
 *   - DriveImageSource (future: Google Drive API)
 *   - S3ImageSource (future: AWS S3)
 */
export class ImageSource {
  /**
   * List all project folders at the intake root.
   * @returns {Promise<ProjectInfo[]>}
   */
  async listProjects() {
    throw new Error("ImageSource.listProjects() must be implemented");
  }

  /**
   * List all image files within a project, recursively.
   * @param {string} project - project identifier (from listProjects)
   * @returns {Promise<ImageFile[]>}
   */
  async listFiles(project) {
    throw new Error("ImageSource.listFiles() must be implemented");
  }

  /**
   * Read file contents as a Buffer.
   * @param {string} project - project identifier
   * @param {string} filePath - relative path within project (from listFiles)
   * @returns {Promise<Buffer>}
   */
  async open(project, filePath) {
    throw new Error("ImageSource.open() must be implemented");
  }

  /**
   * Get file metadata.
   * @param {string} project - project identifier
   * @param {string} filePath - relative path within project
   * @returns {Promise<FileStat>}
   */
  async stat(project, filePath) {
    throw new Error("ImageSource.stat() must be implemented");
  }

  /**
   * Check if a path exists.
   * @param {string} project - project identifier
   * @param {string} filePath - relative path within project
   * @returns {Promise<boolean>}
   */
  async exists(project, filePath) {
    throw new Error("ImageSource.exists() must be implemented");
  }
}

/**
 * @typedef {Object} ProjectInfo
 * @property {string} name - folder name (e.g. "Fences", "Deck Build - Corvallis")
 * @property {string} slug - URL-safe identifier (e.g. "fences", "deck-build-corvallis")
 */

/**
 * @typedef {Object} ImageFile
 * @property {string} name - filename (e.g. "hero.jpg")
 * @property {string} path - relative path within project (e.g. "subfolder/hero.jpg")
 * @property {number} size - file size in bytes
 */

/**
 * @typedef {Object} FileStat
 * @property {number} size - file size in bytes
 * @property {Date} mtime - last modification time
 */
