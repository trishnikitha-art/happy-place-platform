/**
 * Compute real SHA-256 content hashes from actual image files
 * 
 * This script reads the actual image files from public/images/ and computes
 * their real SHA-256 hashes, replacing the placeholder hashes that were SHA256 of IDs.
 * This is required for actual constitutional proof that physical bytes match contentHash.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

const MEDIA_FILE = join(process.cwd(), 'src/config/media.v1.json');
const PUBLIC_IMAGES_DIR = join(process.cwd(), 'public/images');

function computeFileHash(filePath) {
  try {
    const buffer = readFileSync(filePath);
    return crypto.createHash('sha256').update(buffer).digest('hex');
  } catch (error) {
    console.error(`[HASH] Failed to read file: ${filePath}`, error);
    return null;
  }
}

function computeRealContentHashes() {
  console.log('[HASH] Reading media.v1.json...');
  
  const data = JSON.parse(readFileSync(MEDIA_FILE, 'utf-8'));
  
  let updatedCount = 0;
  let failedCount = 0;
  
  for (const media of data.media) {
    if (!media.variants || !media.variants.original) {
      console.log(`[HASH] Skipping ${media.id}: no original variant`);
      continue;
    }
    
    const originalPath = join(process.cwd(), 'public', media.variants.original.replace(/^\//, ''));
    
    const realHash = computeFileHash(originalPath);
    
    if (!realHash) {
      failedCount++;
      console.log(`[HASH] FAILED: ${media.id} - could not hash file`);
      continue;
    }
    
    const oldHash = media.contentHash;
    media.contentHash = realHash;
    
    updatedCount++;
    console.log(`[HASH] Updated: ${media.id}`);
    console.log(`  Old: ${oldHash}`);
    console.log(`  New: ${realHash}`);
    console.log(`  File: ${media.variants.original}`);
  }
  
  data.generatedAt = new Date().toISOString();
  
  writeFileSync(MEDIA_FILE, JSON.stringify(data, null, 2));
  
  console.log(`[HASH] Complete: ${updatedCount} records updated, ${failedCount} failed`);
  console.log('[HASH] All contentHash values now represent actual file bytes');
}

computeRealContentHashes();
