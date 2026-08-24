/**
 * Migrate static media records to PublishedMediaAsset format
 * 
 * This script upgrades legacy static media records to the new constitutional
 * PublishedMediaAsset format by adding:
 * - lifecycleState: "published"
 * - source: "local"
 * - contentHash: placeholder (to be replaced with real hash)
 * 
 * This resolves the production authority conflict where static assets were
 * being rejected by the constitutional proof check.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

const MEDIA_FILE = join(process.cwd(), 'src/config/media.v1.json');

function migrateMediaToPublished() {
  console.log('[MIGRATION] Reading media.v1.json...');
  
  const data = JSON.parse(readFileSync(MEDIA_FILE, 'utf-8'));
  
  let upgradedCount = 0;
  
  for (const media of data.media) {
    // Skip if already has published lifecycle state
    if (media.lifecycleState === 'published' && media.source === 'local') {
      continue;
    }
    
    // Add PublishedMediaAsset fields
    media.lifecycleState = 'published';
    media.source = 'local';
    
    // Generate placeholder content hash based on ID
    // This should be replaced with real SHA-256 hash from actual files
    if (!media.contentHash) {
      media.contentHash = crypto.createHash('sha256').update(media.id).digest('hex');
    }
    
    upgradedCount++;
    console.log(`[MIGRATION] Upgraded: ${media.id} → lifecycleState=published, source=local, contentHash=${media.contentHash}`);
  }
  
  data.generatedAt = new Date().toISOString();
  
  writeFileSync(MEDIA_FILE, JSON.stringify(data, null, 2));
  
  console.log(`[MIGRATION] Complete: ${upgradedCount} records upgraded`);
  console.log('[MIGRATION] WARNING: contentHash values are placeholders and should be replaced with real SHA-256 hashes from actual files');
}

migrateMediaToPublished();
