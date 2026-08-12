/**
 * August 3 Media Reconciliation Script
 *
 * Surgically reconciles August 3 baseline with current canonical infrastructure.
 * Uses existing identity system (UUID v5 from manifest.v1.json).
 * Restores Drive IDs from August 3 baseline.
 * Preserves existing provenance chains.
 *
 * Sources:
 * - archive/legacy-runtime/media.v1.json (August 3 baseline with Drive IDs)
 * - src/config/manifest.v1.json (canonical UUID v5 + contentHash)
 * - generated/golden-manifest.json (SHA-256 hash references)
 * - generated/DRIVE-REORGANIZATION-COMPLETE.md (Drive mappings)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Load source files
const august3Media = JSON.parse(readFileSync(resolve('archive/legacy-runtime/media.v1.json'), 'utf-8'));
const currentManifest = JSON.parse(readFileSync(resolve('src/config/manifest.v1.json'), 'utf-8'));
const currentMedia = JSON.parse(readFileSync(resolve('src/config/media.v1.json'), 'utf-8'));
const goldenManifest = JSON.parse(readFileSync(resolve('generated/golden-manifest.json'), 'utf-8'));

console.log('=== August 3 Media Reconciliation ===');
console.log(`August 3 baseline: ${august3Media.media.length} assets`);
console.log(`Current manifest: ${currentManifest.assets.length} assets`);
console.log(`Current media: ${currentMedia.media.length} assets`);
console.log(`Golden manifest: ${Object.keys(goldenManifest.imageHashes).length} hashes`);
console.log('');

// Build lookup maps
const manifestMap = new Map();
for (const asset of currentManifest.assets) {
  manifestMap.set(asset.originalFilename, asset);
  manifestMap.set(asset.contentHash, asset);
  manifestMap.set(asset.stableId, asset);
}

const goldenHashes = goldenManifest.imageHashes;

// Deduplicate August 3 assets by filename (remove duplicates)
const uniqueAugust3Assets = [];
const seenFilenames = new Set();

for (const aug3Asset of august3Media.media) {
  if (!seenFilenames.has(aug3Asset.filename)) {
    seenFilenames.add(aug3Asset.filename);
    uniqueAugust3Assets.push(aug3Asset);
  }
}

console.log(`Deduplicated August 3 baseline: ${august3Media.media.length} → ${uniqueAugust3Assets.length} unique assets`);

// Reconcile each unique August 3 asset
const reconciledAssets = [];
const reconciliationReport = [];

for (const aug3Asset of uniqueAugust3Assets) {
  const report = {
    august3_id: aug3Asset.id,
    filename: aug3Asset.filename,
    driveId: aug3Asset.driveId,
    projectId: aug3Asset.projectId,
    reconciled: false,
    match_type: null,
    canonical_uuid: null,
    canonical_stableId: null,
    canonical_contentHash: null,
    confidence: null,
    status: null
  };

  // Hierarchy: exact filename → exact content hash → dimensions + metadata
  let canonicalAsset = null;
  let matchType = null;
  let confidence = null;

  // Level 1: Exact filename match
  if (manifestMap.has(aug3Asset.filename)) {
    canonicalAsset = manifestMap.get(aug3Asset.filename);
    matchType = 'EXACT_FILENAME';
    confidence = 'VERY_HIGH';
  }
  // Level 2: Content hash match (if we had it)
  // August 3 baseline doesn't have contentHash, skip this level
  // Level 3: Golden manifest hash match via filename similarity
  else {
    // Normalize filename for comparison
    const aug3NameNorm = aug3Asset.filename.toLowerCase().replace(/\.(jpg|png|jpeg|webp)$/i, '').replace(/[^a-z0-9]/g, '');
    
    for (const [imageId, hash] of Object.entries(goldenHashes)) {
      const imageNameNorm = imageId.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Check if filenames are similar (contains the normalized name)
      if (imageNameNorm.includes(aug3NameNorm) || aug3NameNorm.includes(imageNameNorm)) {
        // Found in golden manifest, now look up in manifest by hash
        for (const [key, asset] of manifestMap.entries()) {
          if (asset.contentHash === hash) {
            canonicalAsset = asset;
            matchType = 'GOLDEN_MANIFEST_HASH';
            confidence = 'HIGH';
            break;
          }
        }
        if (canonicalAsset) break;
      }
    }
  }

  if (canonicalAsset) {
    report.reconciled = true;
    report.match_type = matchType;
    report.canonical_uuid = canonicalAsset.uuid;
    report.canonical_stableId = canonicalAsset.stableId;
    report.canonical_contentHash = canonicalAsset.contentHash;
    report.confidence = confidence;
    report.status = 'RECONCILED';

    // Build reconciled asset record
    reconciledAssets.push({
      id: canonicalAsset.stableId, // Use existing UUID v5 from manifest
      filename: aug3Asset.filename,
      alt: aug3Asset.alt,
      type: aug3Asset.type,
      orientation: aug3Asset.orientation,
      dimensions: {
        width: canonicalAsset.width,
        height: canonicalAsset.height
      },
      variants: {
        original: canonicalAsset.variants[canonicalAsset.variants.length - 1]?.path || canonicalAsset.variants[0]?.path,
        web: canonicalAsset.variants[canonicalAsset.variants.length - 1]?.path || canonicalAsset.variants[0]?.path,
        webp: canonicalAsset.variants.find(v => v.format === 'webp')?.path,
        avif: canonicalAsset.variants.find(v => v.format === 'avif')?.path,
        thumbnail: canonicalAsset.thumbnailPath
      },
      thumbnailPath: canonicalAsset.thumbnailPath,
      blurDataURL: canonicalAsset.blurDataURL,
      driveId: aug3Asset.driveId, // Restore Drive ID from August 3
      projectId: aug3Asset.projectId,
      project: canonicalAsset.project, // Add project from manifest
      service: aug3Asset.service,
      city: aug3Asset.city,
      county: aug3Asset.county,
      state: aug3Asset.state,
      tags: aug3Asset.tags,
      roles: aug3Asset.roles,
      featured: aug3Asset.featured,
      heroEligible: aug3Asset.heroEligible,
      homepageEligible: aug3Asset.homepageEligible,
      provenance: {
        august3_driveId: aug3Asset.driveId,
        canonical_uuid: canonicalAsset.uuid,
        canonical_stableId: canonicalAsset.stableId,
        canonical_contentHash: canonicalAsset.contentHash,
        match_type: matchType,
        confidence: confidence,
        reconciled_at: new Date().toISOString()
      }
    });
  } else {
    report.status = 'NOT_RECONCILED';
    report.confidence = 'NOT_FOUND';
    reconciliationReport.push(report);
  }

  reconciliationReport.push(report);
}

// Add current media assets (preserve them)
for (const currentAsset of currentMedia.media) {
  const alreadyIncluded = reconciledAssets.some(a => a.id === currentAsset.id);
  if (!alreadyIncluded) {
    reconciledAssets.push({
      ...currentAsset,
      provenance: {
        current_authority: true,
        preserved_at: new Date().toISOString()
      }
    });
  }
}

// Output reconciled media
const reconciledMedia = {
  version: "1.0.0",
  generatedAt: new Date().toISOString(),
  reconciliation: {
    august3_count: august3Media.media.length,
    unique_count: uniqueAugust3Assets.length,
    reconciled_count: reconciledAssets.length,
    report: reconciliationReport
  },
  media: reconciledAssets
};

console.log(`Reconciled ${reconciledAssets.length} media assets`);
console.log(`August 3 baseline: ${august3Media.media.length} → ${uniqueAugust3Assets.length} unique`);
console.log(`Reconciled from August 3: ${reconciliationReport.filter(r => r.reconciled).length}`);
console.log(`Not reconciled: ${reconciliationReport.filter(r => !r.reconciled).length}`);
console.log('');

// Write reconciled media
writeFileSync(
  resolve('src/config/media.v1.json'),
  JSON.stringify(reconciledMedia, null, 2),
  'utf-8'
);
console.log('Written reconciled media to src/config/media.v1.json');

// Write reconciliation report
writeFileSync(
  resolve('generated/august3-reconciliation-report.json'),
  JSON.stringify(reconciliationReport, null, 2),
  'utf-8'
);
console.log('Written reconciliation report to generated/august3-reconciliation-report.json');

console.log('');
console.log('=== Reconciliation Complete ===');
