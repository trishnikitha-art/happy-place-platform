/**
 * Add Constitutional Fields to Media Authority
 * 
 * This script adds the missing constitutional fields to media.v1.main.json:
 * - lifecycleState: 'published' (for local files that exist)
 * - source: 'local' (for local files)
 * 
 * This is required for the public media gate to accept the records.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const MEDIA_MAIN_FILE = join(process.cwd(), 'src/config/media.v1.main.json');
const PUBLIC_IMAGES_DIR = join(process.cwd(), 'public/images');

function addConstitutionalFields() {
  console.log('[CONSTITUTIONAL] Reading media.v1.main.json...');
  
  const data = JSON.parse(readFileSync(MEDIA_MAIN_FILE, 'utf8'));
  
  let updatedCount = 0;
  let skippedCount = 0;
  
  for (const media of data.media) {
    // Skip if already has lifecycleState and source
    if (media.lifecycleState && media.source) {
      skippedCount++;
      console.log(`[CONSTITUTIONAL] SKIP: ${media.id} - already has constitutional fields`);
      continue;
    }
    
    // Check if physical file exists
    const hasPhysical = media.variants?.original && (() => {
      const filePath = media.variants.original.startsWith('/') 
        ? media.variants.original.substring(1) 
        : media.variants.original;
      const fullPath = join(process.cwd(), 'public', filePath);
      return existsSync(fullPath);
    })();
    
    if (!hasPhysical) {
      console.log(`[CONSTITUTIONAL] SKIP: ${media.id} - no physical file found`);
      continue;
    }
    
    // Add constitutional fields
    media.lifecycleState = 'published';
    media.source = 'local';
    
    updatedCount++;
    console.log(`[CONSTITUTIONAL] UPDATED: ${media.id}`);
    console.log(`  lifecycleState: ${media.lifecycleState}`);
    console.log(`  source: ${media.source}`);
    console.log(`  physical file: ${media.variants.original}`);
  }
  
  data.generatedAt = new Date().toISOString();
  
  writeFileSync(MEDIA_MAIN_FILE, JSON.stringify(data, null, 2));
  
  console.log(`[CONSTITUTIONAL] Complete: ${updatedCount} records updated, ${skippedCount} skipped`);
  console.log('[CONSTITUTIONAL] All local file records now have constitutional fields');
}

addConstitutionalFields();
