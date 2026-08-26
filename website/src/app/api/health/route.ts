/**
 * Health Check API Route
 *
 * Simple endpoint to verify the production deployment is running.
 * Returns environment variable presence without exposing values.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const environmentCheck = {
    kv_rest_api_url: !!process.env.KV_REST_API_URL,
    kv_rest_api_token: !!process.env.KV_REST_API_TOKEN,
    encryption_key: !!process.env.ENCRYPTION_KEY,
    google_client_id: !!process.env.GOOGLE_CLIENT_ID,
    google_client_secret: !!process.env.GOOGLE_CLIENT_SECRET,
    google_redirect_uri: !!process.env.GOOGLE_REDIRECT_URI,
    vercel_env: process.env.VERCEL_ENV || 'unknown',
    node_env: process.env.NODE_ENV || 'unknown',
  };

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: environmentCheck,
  });
}
