/**
 * Pipeline Context — constitutional state object for the image pipeline.
 *
 * All stages mutate a single context object instead of passing individual
 * parameters. This provides:
 * - Clear state boundaries
 * - Telemetry tracking
 * - Violation collection
 * - Stage orchestration
 */

export class PipelineContext {
  constructor(config) {
    this.config = config;
    this.source = config.source;
    this.root = config.root;
    
    // State
    this.projects = [];
    this.images = [];
    this.manifestAssets = [];
    this.presentation = null;
    
    // Telemetry
    this.statistics = {
      discovered: 0,
      processed: 0,
      skipped: 0,
      heroGenerated: 0,
      thumbnailGenerated: 0,
      galleryGenerated: 0,
      duplicatesDetected: 0,
    };
    
    // Cache
    this.cache = {};
    
    // Violations
    this.violations = [];
    
    // Duplicates
    this.duplicates = [];
  }

  /**
   * Add a violation to the context.
   * @param {Object} violation - structured violation object
   */
  addViolation(violation) {
    this.violations.push(violation);
  }

  /**
   * Add a duplicate detection to the context.
   * @param {Object} duplicate - duplicate information
   */
  addDuplicate(duplicate) {
    this.duplicates.push(duplicate);
    this.statistics.duplicatesDetected++;
  }

  /**
   * Get a summary of the pipeline execution.
   * @returns {Object} summary object
   */
  getSummary() {
    return {
      projects: this.projects.length,
      images: this.images.length,
      manifestAssets: this.manifestAssets.length,
      statistics: this.statistics,
      violations: this.violations.length,
      duplicates: this.duplicates.length,
    };
  }
}
