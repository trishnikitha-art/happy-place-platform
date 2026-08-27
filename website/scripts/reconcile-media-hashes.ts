/**
 * Reconcile Media Content Hashes
 * 
 * This script calculates the actual SHA-256 hash of physical image files
 * and updates media.v1.json with the correct content hashes.
 * 
 * This fixes the content hash collision where fences-001-hero and fences-001-before
 * share the same hash but reference different source files.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, '..');
const PUBLIC_IMAGES = path.join(ROOT, 'public', 'images');
const MEDIA_CONFIG = path.join(ROOT, 'src', 'config', 'media.v1.json');

/**
 * Calculate SHA-256 hash of a file
 */
function calculateFileHash(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

/**
 * Find the actual physical file for a variant path
 */
function findPhysicalFile(variantPath: string): string | null {
  const fullPath = path.join(ROOT, variantPath.replace(/^\//, ''));
  if (fs.existsSync(fullPath)) {
    return fullPath;
  }
  return null;
}

/**
 * Reconcile media content hashes
 */
function reconcileMediaHashes() {
  console.log('Starting media hash reconciliation...');
  
  const mediaConfig = JSON.parse(fs.readFileSync(MEDIA_CONFIG, 'utf-8'));
  let updated = 0;
  let errors: Array<{ id: string; error: string }> = [];
  
  for (const media of mediaConfig.media) {
    const originalVariant = media.variants?.original;
    if (!originalVariant) {
      console.warn(`Skipping ${media.id}: no original variant`);
      continue;
    }
    
    const physicalPath = findPhysicalFile(originalVariant);
    if (!physicalPath) {
      errors.push({ id: media.id, error: `Physical file not found: ${originalVariant}` });
      console.error(`[${media.id}] Physical file not found: ${originalVariant}`);
      continue;
    }
    
    const actualHash = calculateFileHash(physicalPath);
    const currentHash = media.contentHash;
    
    if (actualHash !== currentHash) {
      console.log(`[${media.id}] Hash mismatch:`);
      console.log(`  Current: ${currentHash}`);
      console.log(`  Actual:  ${actualHash}`);
      console.log(`  File:    ${physicalPath}`);
      
      media.contentHash = actualHash;
      updated++;
    } else {
      console.log(`[${media.id}] Hash verified: ${actualHash.substring(0, 12)}...`);
    }
  }
  
  if (updated > 0) {
    console.log(`\nUpdated ${updated} media records with correct content hashes`);
    fs.writeFileSync(MEDIA_CONFIG, JSON.stringify(mediaConfig, null, 2));
    console.log(`Updated ${MEDIA_CONFIG}`);
  } else {
    console.log('\nNo hash updates needed');
  }
  
  if (errors.length > 0) {
    console.log(`\n${errors.length} errors encountered:`);
    errors.forEach(({ id, error }) => console.log(`  [${id}] ${error}`));
  }
  
  console.log('\nReconciliation complete');
}

reconcileMediaHashes();
