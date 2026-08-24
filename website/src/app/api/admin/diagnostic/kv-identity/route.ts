/**
 * KV Identity Diagnostic Endpoint
 * 
 * Returns the actual KV identity being used by the runtime.
 * This helps identify whether production is using the correct KV instance.
 * 
 * GET /api/admin/diagnostic/kv-identity
 * 
 * Returns environment variable configuration and Redis client info.
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const kvConfig = {
    canonicalUrl: process.env.KV_REST_API_URL || null,
    canonicalToken: process.env.KV_REST_API_TOKEN ? 'PRESENT' : null,
    integrationUrl: process.env.KV_REST_API__KV_REST_API_URL || process.env.KV_REST_API__REDIS_URL || process.env.KV_REST_API__KV_URL || null,
    integrationToken: process.env.KV_REST_API__KV_REST_API_TOKEN ? 'PRESENT' : null,
    readOnlyToken: process.env.KV_REST_API__KV_REST_API_READ_ONLY_TOKEN ? 'PRESENT' : null,
    vercelUrl: process.env.VERCEL_URL || null,
    environment: process.env.NODE_ENV || 'unknown',
    region: process.env.VERCEL_REGION || null,
  };
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    kvConfig,
    effectiveUrl: kvConfig.canonicalUrl || kvConfig.integrationUrl,
    source: kvConfig.canonicalUrl ? 'canonical' : (kvConfig.integrationUrl ? 'integration' : 'none'),
  });
}
