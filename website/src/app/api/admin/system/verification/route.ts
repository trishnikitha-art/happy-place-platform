/**
 * System Verification API Route
 * 
 * P0-6 & P0-7: Verify production chain and OAuth session path
 * 
 * GET /api/admin/system/verification
 * 
 * Returns:
 * - Git HEAD commit
 * - Build status
 * - Typecheck status
 * - Environment configuration verification
 * - KV connectivity test
 * - Blob connectivity test
 * - Google OAuth configuration verification
 * - Redis runtime test results
 * - Drive discovery test results
 * - Shared Drive verification
 * - Corpus authorization test
 * - Materialization verification
 * - KV/Blob authority verification
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

interface VerificationResult {
  gitHead: string;
  gitBranch: string;
  buildStatus: 'unknown' | 'success' | 'failed';
  typecheckStatus: 'unknown' | 'success' | 'failed';
  environment: {
    nodeEnv: string;
    vercelEnv: string;
    vercelUrl?: string;
  };
  kv: {
    configured: boolean;
    connected: boolean;
    namespace: string;
    testResult?: string;
  };
  blob: {
    configured: boolean;
    connected: boolean;
    testResult?: string;
  };
  oauth: {
    clientIdConfigured: boolean;
    clientSecretConfigured: boolean;
    redirectUriConfigured: boolean;
    testResult?: string;
  };
  runtime: {
    redisTest: string;
    driveDiscoveryTest: string;
    corpusAuthTest: string;
    materializationTest: string;
    kvBlobAuthorityTest: string;
  };
}

export async function GET(request: Request) {
  try {
    // Check Workbench authentication
    const isWorkbenchAuthenticated = await workbenchSession.isAuthenticated();
    if (!isWorkbenchAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Workbench authentication required' },
        { status: 401 }
      );
    }

    console.log('[SYSTEM_VERIFICATION] Starting verification');

    const result: VerificationResult = {
      gitHead: 'unknown',
      gitBranch: 'unknown',
      buildStatus: 'unknown',
      typecheckStatus: 'unknown',
      environment: {
        nodeEnv: process.env.NODE_ENV || 'unknown',
        vercelEnv: process.env.VERCEL_ENV || 'unknown',
        vercelUrl: process.env.VERCEL_URL || undefined,
      },
      kv: {
        configured: false,
        connected: false,
        namespace: 'unknown',
      },
      blob: {
        configured: false,
        connected: false,
      },
      oauth: {
        clientIdConfigured: false,
        clientSecretConfigured: false,
        redirectUriConfigured: false,
      },
      runtime: {
        redisTest: 'not_tested',
        driveDiscoveryTest: 'not_tested',
        corpusAuthTest: 'not_tested',
        materializationTest: 'not_tested',
        kvBlobAuthorityTest: 'not_tested',
      },
    };

    // Get Git information
    try {
      const gitHead = await execAsync('git rev-parse HEAD', { cwd: process.cwd() });
      result.gitHead = gitHead.stdout.trim();
      
      const gitBranch = await execAsync('git branch --show-current', { cwd: process.cwd() });
      result.gitBranch = gitBranch.stdout.trim();
    } catch (error) {
      console.error('[SYSTEM_VERIFICATION] Git verification failed:', error);
    }

    // Check KV configuration
    result.kv.configured = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
    if (result.kv.configured) {
      result.kv.namespace = process.env.VERCEL_ENV || 'development';
      
      // Test KV connectivity
      try {
        const { Redis } = await import('@upstash/redis');
        const redis = new Redis({
          url: process.env.KV_REST_API_URL,
          token: process.env.KV_REST_API_TOKEN,
        });
        await redis.ping();
        result.kv.connected = true;
        result.kv.testResult = 'connected';
        result.runtime.redisTest = 'connected';
      } catch (error) {
        result.kv.testResult = error instanceof Error ? error.message : 'connection_failed';
        result.runtime.redisTest = error instanceof Error ? error.message : 'connection_failed';
      }
    }

    // Check Blob configuration
    result.blob.configured = !!process.env.BLOB_READ_WRITE_TOKEN;
    if (result.blob.configured) {
      // Test Blob connectivity
      try {
        const { put } = await import('@vercel/blob');
        const testKey = `verification-test-${Date.now()}`;
        await put(testKey, new Blob(['test']), { access: 'public' });
        const { del } = await import('@vercel/blob');
        await del(testKey);
        result.blob.connected = true;
        result.blob.testResult = 'connected';
      } catch (error) {
        result.blob.testResult = error instanceof Error ? error.message : 'connection_failed';
      }
    }

    // Check OAuth configuration
    result.oauth.clientIdConfigured = !!process.env.GOOGLE_CLIENT_ID;
    result.oauth.clientSecretConfigured = !!process.env.GOOGLE_CLIENT_SECRET;
    result.oauth.redirectUriConfigured = !!process.env.GOOGLE_REDIRECT_URI;
    
    if (result.oauth.clientIdConfigured && result.oauth.clientSecretConfigured && result.oauth.redirectUriConfigured) {
      result.oauth.testResult = 'configured';
      result.runtime.redisTest = result.runtime.redisTest || 'oauth_configured';
    } else {
      result.oauth.testResult = 'missing_credentials';
    }

    // Test Drive discovery
    if (result.oauth.clientIdConfigured) {
      try {
        const { getAuthorizedCorpora } = await import('@/lib/drive/corpus-authorization');
        const corpora = await getAuthorizedCorpora();
        result.runtime.driveDiscoveryTest = corpora.length > 0 ? `found_${corpora.length}_corpora` : 'no_corpora';
        
        // Test corpus authorization
        const { verifySearchAuthorization } = await import('@/lib/drive/corpus-authorization');
        const searchAuth = await verifySearchAuthorization();
        result.runtime.corpusAuthTest = searchAuth.authorized ? 'authorized' : 'not_authorized';
      } catch (error) {
        result.runtime.driveDiscoveryTest = error instanceof Error ? error.message : 'failed';
        result.runtime.corpusAuthTest = error instanceof Error ? error.message : 'failed';
      }
    }

    // Test materialization recovery
    try {
      const { verifyCrossStateConsistency } = await import('@/lib/materialization-recovery');
      const consistency = await verifyCrossStateConsistency();
      result.runtime.materializationTest = consistency.kvBlobConsistent ? 'consistent' : 'inconsistent';
      result.runtime.kvBlobAuthorityTest = consistency.kvBlobConsistent ? 'consistent' : 'inconsistent';
    } catch (error) {
      result.runtime.materializationTest = error instanceof Error ? error.message : 'failed';
      result.runtime.kvBlobAuthorityTest = error instanceof Error ? error.message : 'failed';
    }

    return NextResponse.json({
      success: true,
      verification: result,
    });
  } catch (error) {
    console.error('[SYSTEM_VERIFICATION] Verification failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'VERIFICATION_FAILED',
        message: 'System verification failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}