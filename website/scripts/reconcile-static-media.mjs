/**
 * Direct reconciliation of static media into MEDIA_KV
 * Uses authoritative media writer (saveMedia) to enforce constitutional path
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { saveMedia, getMediaRecordRaw } from '../src/lib/media-kv-store.js';

const MEDIA_KV_URL = process.env.KV_REST_API_URL;
const MEDIA_KV_TOKEN = process.env.KV_REST_API_TOKEN;

if (!MEDIA_KV_URL || !MEDIA_KV_TOKEN) {
  console.error('[STATIC_MEDIA_RECONCILIATION] ERROR: Missing KV credentials');
  console.error('Set KV_REST_API_URL and KV_REST_API_TOKEN environment variables');
  process.exit(1);
}

console.log('[STATIC_MEDIA_RECONCILIATION] STARTED');
console.log('[STATIC_MEDIA_RECONCILIATION] Using authoritative media writer (saveMedia)');

try {
  // Load canonical authority
  const mediaPath = join(process.cwd(), 'src/config/media.v1.main.json');
  const manifest = JSON.parse(readFileSync(mediaPath, 'utf8'));
  
  if (!manifest || !manifest.media || manifest.media.length === 0) {
    console.error('[STATIC_MEDIA_RECONCILIATION] ERROR: No media records in canonical authority');
    process.exit(1);
  }
  
  console.log('[STATIC_MEDIA_RECONCILIATION] CANONICAL_LOADED', { 
    totalCanonical: manifest.media.length 
  });
  
  let reconciled = 0;
  let skipped = 0;
  let failed = 0;
  const errors = {};
  
  for (const media of manifest.media) {
    try {
      // Check if already in KV using authoritative media reader
      const existing = await getMediaRecordRaw(media.id);
      if (existing) {
        skipped++;
        console.log('[STATIC_MEDIA_RECONCILIATION] SKIPPED', { 
          mediaId: media.id,
          reason: 'Already in KV'
        });
        continue;
      }
      
      // Add storage field for proper authority resolution
      // Static storage: served from /public/images/, no Blob metadata required
      // Blob storage: materialized from Drive, requires Blob metadata
      const reconciledMedia = {
        ...media,
        storage: media.source === 'local' ? 'static' : undefined,
      };
      
      // Write to KV using authoritative media writer
      await saveMedia(reconciledMedia);
      
      reconciled++;
      console.log('[STATIC_MEDIA_RECONCILIATION] RECONCILED', { 
        mediaId: media.id,
        storage: reconciledMedia.storage
      });
      
    } catch (error) {
      failed++;
      errors[media.id] = error.message;
      console.error('[STATIC_MEDIA_RECONCILIATION] FAILED', {
        mediaId: media.id,
        error: error.message,
      });
    }
  }
  
  console.log('[STATIC_MEDIA_RECONCILIATION] COMPLETE', {
    totalCanonical: manifest.media.length,
    reconciled,
    skipped,
    failed,
    errors: failed > 0 ? errors : undefined,
  });
  
  if (failed > 0) {
    process.exit(1);
  }
  
} catch (error) {
  console.error('[STATIC_MEDIA_RECONCILIATION] ERROR', {
    error: error.message,
  });
  process.exit(1);
}
