/**
 * Production KV Connectivity Diagnostic
 * 
 * Tests which Redis credentials the deployed application can actually see
 * and performs a harmless authenticated operation to prove connectivity.
 * 
 * This is the correct way to diagnose "KV unavailable" issues:
 * - Don't guess at credential patterns
 * - Test all possible credential variable names the deployed runtime can see
 * - Perform a harmless operation (PING or set/read test key)
 * - Report results without logging secret values
 * 
 * GET /api/admin/diagnostic/kv-connectivity
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Test a specific credential configuration
 */
async function testCredentialConfig(name: string, url: string | undefined, token: string | undefined): Promise<{
  name: string;
  hasUrl: boolean;
  hasToken: boolean;
  connected: boolean;
  error?: string;
}> {
  const result = {
    name,
    hasUrl: !!url,
    hasToken: !!token,
    connected: false,
  };

  if (!url || !token) {
    return { ...result, error: 'Missing URL or token' };
  }

  try {
    const { Redis } = await import('@upstash/redis');
    const client = new Redis({ url, token });
    
    // Harmless operation: PING
    const pingResult = await client.ping();
    result.connected = !!pingResult;
    
    return result;
  } catch (error) {
    return { ...result, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function GET(request: Request) {
  // Require Workbench authentication for diagnostic
  const isWorkbenchAuthenticated = await workbenchSession.isAuthenticated();
  if (!isWorkbenchAuthenticated) {
    return NextResponse.json(
      { error: 'WORKBENCH_AUTH_REQUIRED', message: 'Workbench authentication required' },
      { status: 401 }
    );
  }

  const diagnostics = {
    environment: {
      nodeEnv: process.env.NODE_ENV,
      vercelUrl: process.env.VERCEL_URL,
      hasKvRestUrl: !!process.env.KV_REST_API_URL,
      hasKvRestToken: !!process.env.KV_REST_API_TOKEN,
    },
    credentialVariables: [] as Array<{
      name: string;
      hasUrl: boolean;
      hasToken: boolean;
      connected: boolean;
      error?: string;
      operation?: string;
    }>,
    summary: {
      workingConfigurations: 0,
      failedConfigurations: 0,
    },
  };

  // Test all possible credential variable combinations
  const configs = [
    {
      name: 'PRIMARY (KV_REST_API_URL + KV_REST_API_TOKEN)',
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    },
    {
      name: 'INTEGRATION 1 (KV_REST_API__KV_REST_API_URL + KV_REST_API__KV_REST_API_TOKEN)',
      url: process.env.KV_REST_API__KV_REST_API_URL,
      token: process.env.KV_REST_API__KV_REST_API_TOKEN,
    },
    {
      name: 'INTEGRATION 2 (KV_REST_API__REDIS_URL + KV_REST_API__KV_REST_API_TOKEN)',
      url: process.env.KV_REST_API__REDIS_URL,
      token: process.env.KV_REST_API__KV_REST_API_TOKEN,
    },
    {
      name: 'INTEGRATION 3 (KV_REST_API__KV_URL + KV_REST_API__KV_REST_API_TOKEN)',
      url: process.env.KV_REST_API__KV_URL,
      token: process.env.KV_REST_API__KV_REST_API_TOKEN,
    },
    {
      name: 'INTEGRATION 4 (KV_REST_API__KV_URL + KV_REST_API__KV_REST_API_READ_ONLY_TOKEN)',
      url: process.env.KV_REST_API__KV_URL,
      token: process.env.KV_REST_API__KV_REST_API_READ_ONLY_TOKEN,
    },
  ];

  for (const config of configs) {
    const result = await testCredentialConfig(config.name, config.url, config.token);
    diagnostics.credentialVariables.push(result);
    
    if (result.connected) {
      diagnostics.summary.workingConfigurations++;
    } else {
      diagnostics.summary.failedConfigurations++;
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    diagnostics,
    summary: {
      status: diagnostics.summary.workingConfigurations > 0 ? 'CONNECTED' : 'DISCONNECTED',
      workingConfigurations: diagnostics.summary.workingConfigurations,
      failedConfigurations: diagnostics.summary.failedConfigurations,
    },
  });
}
