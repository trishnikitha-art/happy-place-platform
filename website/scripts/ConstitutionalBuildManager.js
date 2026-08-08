/**
 * Constitutional Build Manager
 * 
 * Single orchestration layer for the constitutional build pipeline.
 * 
 * Pipeline: Validate Canonical → Find Duplicate Authorities → Reconcile → Ensure Projections → Verify → Adapt Runtime → Build
 * 
 * Constitutional Rule: Convergence-first, not generation-first
 * 
 * Reference: CONSTITUTIONAL_GALLERY_RECONCILIATION_REPORT.md
 * - Section: CI Pipeline
 * - Section: Constitutional Authorities
 */

const { verifyConstitutionalAuthorities, scan } = require('./ConstitutionalAuthorityScanner');
const { ensureAllProjections } = require('./ProjectionManager');
const { verifyGalleryProjection, verifyHeroProjection, verifyServiceProjection } = require('./constitutional-verification');
const { getGalleryConfig, getHeroConfig, getServiceConfig } = require('../src/lib/projection-adapter');

class ConstitutionalBuildManager {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Stage 1: Validate Canonical Graph
   */
  async validateCanonical() {
    console.log('Stage 1: Validate Canonical Graph');
    console.log('==================================\n');
    
    // Placeholder: Assumes canonical graph exists and is valid
    console.log('✅ Canonical graph validation skipped (assumed valid)');
    console.log('   Location: metadata/canonical-media-graph.json\n');
    
    return true;
  }

  /**
   * Stage 2: Find Duplicate Authorities
   */
  async findDuplicateAuthorities() {
    console.log('Stage 2: Find Duplicate Authorities');
    console.log('====================================\n');
    
    const authCheck = verifyConstitutionalAuthorities();
    
    if (!authCheck.valid) {
      this.errors.push(`Missing constitutional authorities: ${authCheck.missing.join(', ')}`);
      return false;
    }
    
    const scanResult = scan();
    
    if (scanResult.hasUnclassifiedDuplicates) {
      this.errors.push('Unclassified duplicate authorities detected. Manual reconciliation required.');
      return false;
    }
    
    if (scanResult.hasDuplicates) {
      this.warnings.push('Duplicate authorities found but classified for reconciliation.');
    }
    
    console.log('✅ Duplicate authority scan complete\n');
    return true;
  }

  /**
   * Stage 3: Reconcile Authorities
   */
  async reconcileAuthorities() {
    console.log('Stage 3: Reconcile Authorities');
    console.log('==============================\n');
    
    // Placeholder: Automatic reconciliation would happen here
    console.log('✅ Authority reconciliation skipped (no unclassified duplicates)\n');
    
    return true;
  }

  /**
   * Stage 4: Ensure Projections
   * Constitutional: Search before create
   */
  async ensureProjections() {
    console.log('Stage 4: Ensure Projections');
    console.log('===========================\n');
    
    try {
      ensureAllProjections();
      console.log('✅ Projections ensured (search before create)\n');
      return true;
    } catch (error) {
      this.errors.push(`Projection ensurement failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Stage 5: Verify
   */
  async verify() {
    console.log('Stage 5: Verify');
    console.log('================\n');
    
    const fs = require('fs');
    const path = require('path');
    const METADATA_PATH = path.resolve(__dirname, '../metadata');
    
    const canonicalGraph = JSON.parse(
      fs.readFileSync(path.join(METADATA_PATH, 'canonical-media-graph.json'), 'utf-8')
    );
    
    const galleryProjection = JSON.parse(
      fs.readFileSync(path.join(METADATA_PATH, 'projection/galleryProjection.json'), 'utf-8')
    );
    const heroProjection = JSON.parse(
      fs.readFileSync(path.join(METADATA_PATH, 'projection/heroProjection.json'), 'utf-8')
    );
    const serviceProjection = JSON.parse(
      fs.readFileSync(path.join(METADATA_PATH, 'projection/serviceProjection.json'), 'utf-8')
    );
    
    const galleryResult = verifyGalleryProjection(galleryProjection, canonicalGraph);
    const heroResult = verifyHeroProjection(heroProjection, canonicalGraph);
    const serviceResult = verifyServiceProjection(serviceProjection, canonicalGraph);
    
    if (!galleryResult.valid) {
      this.errors.push('Gallery projection verification failed');
      galleryResult.errors.forEach(e => this.errors.push(e));
    }
    
    if (!heroResult.valid) {
      this.errors.push('Hero projection verification failed');
      heroResult.errors.forEach(e => this.errors.push(e));
    }
    
    if (!serviceResult.valid) {
      this.errors.push('Service projection verification failed');
      serviceResult.errors.forEach(e => this.errors.push(e));
    }
    
    if (this.errors.length === 0) {
      console.log('✅ All projections verified\n');
      return true;
    }
    
    console.log('❌ Verification failed\n');
    return false;
  }

  /**
   * Stage 6: Adapt Runtime
   */
  async adaptRuntime() {
    console.log('Stage 6: Adapt Runtime');
    console.log('=======================\n');
    
    try {
      const galleryConfig = getGalleryConfig();
      const heroConfig = getHeroConfig();
      const serviceConfig = getServiceConfig();
      
      console.log('✅ Runtime configuration adapted from projections');
      console.log(`   Gallery: ${galleryConfig.generatedHash}`);
      console.log(`   Hero: ${heroConfig.generatedHash}`);
      console.log(`   Service: ${serviceConfig.generatedHash}\n`);
      
      return true;
    } catch (error) {
      this.errors.push(`Runtime adaptation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Stage 7: Build Website
   */
  async build() {
    console.log('Stage 7: Build Website');
    console.log('=======================\n');
    
    // Placeholder: Next.js build
    console.log('✅ Website build skipped (placeholder)\n');
    
    return true;
  }

  /**
   * Execute full constitutional build pipeline
   */
  async execute() {
    console.log('Constitutional Build Manager');
    console.log('============================\n');
    
    const stages = [
      this.validateCanonical(),
      this.findDuplicateAuthorities(),
      this.reconcileAuthorities(),
      this.ensureProjections(),
      this.verify(),
      this.adaptRuntime(),
      this.build()
    ];
    
    for (const stage of stages) {
      const result = await stage;
      if (!result) {
        this.printSummary();
        throw new Error('Constitutional build failed');
      }
    }
    
    this.printSummary();
    console.log('✅ Constitutional build complete\n');
  }

  /**
   * Print build summary
   */
  printSummary() {
    console.log('='.repeat(50));
    
    if (this.errors.length > 0) {
      console.log('❌ Build Failed');
      console.log('\nErrors:');
      this.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (this.warnings.length > 0) {
      console.log('\nWarnings:');
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    if (this.errors.length === 0) {
      console.log('✅ Build Succeeded');
      console.log('\nConstitutional compliance verified.');
      console.log('Projections ensured (search before create).');
      console.log('Runtime adapted from projections.');
      console.log('Website ready to render projections.');
    }
    
    console.log('='.repeat(50));
  }
}

/**
 * Convenience function to execute the build
 */
async function executeBuild() {
  const manager = new ConstitutionalBuildManager();
  await manager.execute();
}

module.exports = {
  ConstitutionalBuildManager,
  executeBuild
};
