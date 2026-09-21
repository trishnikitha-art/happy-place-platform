#!/usr/bin/env node
/**
 * Production Quarantine Script for Malformed Media Record
 * 
 * This script quarantines (deletes) the malformed production KV record:
 * 07c0eae184dc5a375f943a3ac2b67e95 (storage: undefined)
 * 
 * The record is NOT in canonical static authority and has no valid purpose.
 * Public gate correctly rejects it. Safe to delete.
 * 
 * Usage:
 *   VERCEL_ENV=production KV_REST_API_URL=<url> KV_REST_API_TOKEN=<token> WORKBENCH_PASSWORD=<password> node scripts/quarantine-malformed-production-record.mjs
 * 
 * Security:
 * - Requires WORKBENCH_PASSWORD for authentication
 * - Media ID is in fail-closed allowlist
 * - Provides audit trail
 */

const TARGET_MEDIA_ID = '07c0eae184dc5a375f943a3ac2b67e95';
const QUARANTINE_API = 'https://happy-place-platform.vercel.app/api/admin/diagnostic/quarantine-media';

async function quarantineRecord() {
  console.log('[QUARANTINE_PRODUCTION] STARTED');
  console.log('[QUARANTINE_PRODUCTION] Target media ID:', TARGET_MEDIA_ID);
  console.log('[QUARANTINE_PRODUCTION] Environment:', process.env.VERCEL_ENV || 'production');

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  const workbenchPassword = process.env.WORKBENCH_PASSWORD;

  if (!kvUrl || !kvToken) {
    console.error('[QUARANTINE_PRODUCTION] ERROR: KV credentials not found');
    console.error('[QUARANTINE_PRODUCTION] Required: KV_REST_API_URL, KV_REST_API_TOKEN');
    process.exit(1);
  }

  if (!workbenchPassword) {
    console.error('[QUARANTINE_PRODUCTION] ERROR: WORKBENCH_PASSWORD not found');
    console.error('[QUARANTINE_PRODUCTION] Required: WORKBENCH_PASSWORD for Workbench authentication');
    process.exit(1);
  }

  try {
    // Step 1: Authenticate with Workbench
    console.log('[QUARANTINE_PRODUCTION] Step 1: Authenticating with Workbench...');
    const loginResponse = await fetch('https://happy-place-platform.vercel.app/api/workbench/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: workbenchPassword }),
    });

    if (!loginResponse.ok) {
      console.error('[QUARANTINE_PRODUCTION] ERROR: Workbench authentication failed');
      console.error('[QUARANTINE_PRODUCTION] Status:', loginResponse.status);
      const errorText = await loginResponse.text();
      console.error('[QUARANTINE_PRODUCTION] Response:', errorText);
      process.exit(1);
    }

    const workbenchCookie = loginResponse.headers.get('set-cookie')?.split(';')[0];
    console.log('[QUARANTINE_PRODUCTION] Workbench authentication successful');

    // Step 2: Quarantine the malformed record
    console.log('[QUARANTINE_PRODUCTION] Step 2: Quarantining malformed record...');
    const quarantineResponse = await fetch(QUARANTINE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': workbenchCookie || '',
      },
      body: JSON.stringify({
        mediaId: TARGET_MEDIA_ID,
        confirm: true,
      }),
    });

    const result = await quarantineResponse.json();

    if (!quarantineResponse.ok) {
      console.error('[QUARANTINE_PRODUCTION] ERROR: Quarantine request failed');
      console.error('[QUARANTINE_PRODUCTION] Status:', quarantineResponse.status);
      console.error('[QUARANTINE_PRODUCTION] Response:', result);
      process.exit(1);
    }

    console.log('[QUARANTINE_PRODUCTION] SUCCESS:', result);
    console.log('[QUARANTINE_PRODUCTION] Malformed record quarantined from production KV');
    console.log('[QUARANTINE_PRODUCTION] Public gate will no longer reject this record (it no longer exists)');

  } catch (error) {
    console.error('[QUARANTINE_PRODUCTION] ERROR:', error);
    process.exit(1);
  }
}

quarantineRecord();
