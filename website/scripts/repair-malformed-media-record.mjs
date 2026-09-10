#!/usr/bin/env node
/**
 * Targeted repair for malformed media record 07c0eae184dc5a375f943a3ac2b67e95
 * 
 * This script repairs the specific malformed record causing PUBLIC_GATE_REJECTED:
 * - Missing storage field
 * - This record needs storage: "static" to pass the public media gate
 * 
 * Usage:
 *   node scripts/repair-malformed-media-record.mjs
 * 
 * Environment variables required:
 *   KV_REST_API_URL
 *   KV_REST_API_TOKEN
 *   VERCEL_ENV (defaults to production)
 */

import { Redis } from '@upstash/redis';

const MEDIA_ID = '07c0eae184dc5a375f943a3ac2b67e95';

function getKvNamespace() {
  const vercelEnv = process.env.VERCEL_ENV || 'production';
  return `hpp:${vercelEnv}:`;
}

function namespacedKey(key) {
  const namespace = getKvNamespace();
  return `${namespace}${key}`;
}

async function repairMalformedRecord() {
  console.log('[MALFORMED_MEDIA_REPAIR] STARTED');
  console.log('[MALFORMED_MEDIA_REPAIR] Target media ID:', MEDIA_ID);
  console.log('[MALFORMED_MEDIA_REPAIR] Environment:', process.env.VERCEL_ENV || 'production');

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) {
    console.error('[MALFORMED_MEDIA_REPAIR] ERROR: KV credentials not found');
    console.error('[MALFORMED_MEDIA_REPAIR] Required: KV_REST_API_URL, KV_REST_API_TOKEN');
    process.exit(1);
  }

  const redis = new Redis({ url: kvUrl, token: kvToken });

  try {
    // Read the malformed record
    const mediaKey = namespacedKey(`media:${MEDIA_ID}`);
    const existingRecord = await redis.get(mediaKey);

    if (!existingRecord) {
      console.error('[MALFORMED_MEDIA_REPAIR] ERROR: Record not found in KV');
      process.exit(1);
    }

    console.log('[MALFORMED_MEDIA_REPAIR] Current record state:', {
      id: existingRecord.id,
      storage: existingRecord.storage,
      lifecycleState: existingRecord.lifecycleState,
      source: existingRecord.source,
    });

    // Check if storage field is missing or invalid
    if (existingRecord.storage !== 'static' && existingRecord.storage !== 'blob') {
      console.log('[MALFORMED_MEDIA_REPAIR] Storage field missing or invalid - repairing');
      
      // Repair: set storage to "static" for published local records
      const repairedRecord = {
        ...existingRecord,
        storage: 'static',
      };

      // Write repaired record
      await redis.set(mediaKey, repairedRecord);
      
      console.log('[MALFORMED_MEDIA_REPAIR] REPAIRED:', {
        id: repairedRecord.id,
        storage: repairedRecord.storage,
        before: existingRecord.storage,
        after: repairedRecord.storage,
      });

      // Verify repair
      const verifiedRecord = await redis.get(mediaKey);
      console.log('[MALFORMED_MEDIA_REPAIR] VERIFIED:', {
        storage: verifiedRecord.storage,
        lifecycleState: verifiedRecord.lifecycleState,
        source: verifiedRecord.source,
      });

      console.log('[MALFORMED_MEDIA_REPAIR] SUCCESS - Record now has valid storage field');
    } else {
      console.log('[MALFORMED_MEDIA_REPAIR] Record already has valid storage field - no repair needed');
    }

  } catch (error) {
    console.error('[MALFORMED_MEDIA_REPAIR] ERROR:', error);
    process.exit(1);
  }
}

repairMalformedRecord();
