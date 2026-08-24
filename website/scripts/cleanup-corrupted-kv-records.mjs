/**
 * Cleanup Corrupted KV Records
 * 
 * This script deletes the corrupted media records that were stored with wrong format
 * during the materialization attempt.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const CANONICAL_IDS = [
  'brand-hero',
  'outdoor-living-001-hero',
  'repairs-001-hero',
  'builtins-001-secondary',
  'fences-001-hero',
];

function loadEnv() {
  const envPath = join(__dirname, '../.env.local');
  try {
    const envContent = readFileSync(envPath, 'utf-8');
    const env = {};
    for (const line of envContent.split('\n')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
    return env;
  } catch (error) {
    console.error('[CLEANUP] Failed to load .env.local:', error);
    return {};
  }
}

async function deleteMediaRecord(mediaId, env) {
  const { KV_REST_API_URL, KV_REST_API_TOKEN } = env;
  
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    return {
      mediaId,
      status: 'ERROR',
      reason: 'KV credentials not available',
    };
  }
  
  try {
    const key = `media:${mediaId}`;
    const response = await fetch(`${KV_REST_API_URL}/del/${key}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KV_REST_API_TOKEN}`,
      },
    });
    
    if (!response.ok) {
      return {
        mediaId,
        status: 'ERROR',
        reason: `KV delete failed: ${response.status} ${response.statusText}`,
      };
    }
    
    return {
      mediaId,
      status: 'DELETED',
    };
  } catch (error) {
    return {
      mediaId,
      status: 'ERROR',
      reason: `KV delete failed: ${error.message}`,
    };
  }
}

async function cleanupCorruptedRecords() {
  console.log('=== CLEANING UP CORRUPTED KV RECORDS ===\n');
  
  const env = loadEnv();
  console.log('[CLEANUP] KV credentials:', {
    hasUrl: !!env.KV_REST_API_URL,
    hasToken: !!env.KV_REST_API_TOKEN,
  });
  
  const results = [];
  
  for (const mediaId of CANONICAL_IDS) {
    console.log(`[CLEANUP] Deleting corrupted record: ${mediaId}`);
    const result = await deleteMediaRecord(mediaId, env);
    results.push(result);
    
    if (result.status === 'DELETED') {
      console.log(`[CLEANUP] ✓ Deleted: ${mediaId}`);
    } else {
      console.log(`[CLEANUP] ✗ Delete failed: ${result.reason}`);
    }
  }
  
  console.log('\n=== CLEANUP COMPLETE ===');
  console.log(`[CLEANUP] Total records: ${results.length}`);
  console.log(`[CLEANUP] Deleted: ${results.filter(r => r.status === 'DELETED').length}`);
  console.log(`[CLEANUP] Failed: ${results.filter(r => r.status === 'ERROR').length}`);
  
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupCorruptedRecords()
    .then(results => {
      console.log('\n=== CLEANUP RESULTS ===');
      console.log(JSON.stringify(results, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Cleanup failed:', error);
      process.exit(1);
    });
}

export { cleanupCorruptedRecords };
