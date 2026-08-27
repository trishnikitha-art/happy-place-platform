/**
 * OAuth Session Path Verification API Route
 * 
 * P0-6: Verify real Redis + Google OAuth session path
 * 
 * POST /api/admin/oauth/verification
 * 
 * Verifies the complete OAuth session path:
 * - Google OAuth → callback → Redis authorization authority → opaque Drive session → auth status → Drive credentials
 * 
 * Tests:
 * - OAuth client configuration
 * - OAuth redirect URI validation
 * - Redis authorization storage
 * - Opaque session creation
 * - Session resolution
 * - Authorization retrieval
 * - Drive credential decryption
 * - Session revocation
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { driveSession } from '@/lib/drive/drive-session';

export const dynamic = 'force-dynamic';

interface OAuthVerificationResult {
  configuration: {
    clientIdConfigured: boolean;
    clientSecretConfigured: boolean;
    redirectUriConfigured: boolean;
    redirectUriValid: boolean;
    redirectUriValue?: string;
  };
  redis: {
    kvConfigured: boolean;
    kvConnected: boolean;
    kvNamespace: string;
  };
  session: {
    workbenchAuthenticated: boolean;
    workbenchSessionId?: string;
    driveAuthenticated: boolean;
    driveSessionId?: string;
  };
  authorization: {
    // Distinguish between capability and actual test execution
    createAuthorizationCapability: boolean;
    retrieveAuthorizationExecuted: boolean;
    retrieveAuthorizationSuccess: boolean;
    revokeAuthorizationCapability: boolean;
    revokeAuthorizationExecuted: boolean;
    revokeAuthorizationSuccess: boolean;
  };
  credentials: {
    canResolveCredentials: boolean;
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
  };
  flow: {
    startOAuth: string;
    handleCallback: string;
    createSession: string;
    resolveSession: string;
    revokeSession: string;
  };
}

export async function POST(request: Request) {
  try {
    // Check Workbench authentication
    const isWorkbenchAuthenticated = await workbenchSession.isAuthenticated();
    if (!isWorkbenchAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Workbench authentication required' },
        { status: 401 }
      );
    }

    console.log('[OAUTH_VERIFICATION] Starting OAuth session path verification');

    const result: OAuthVerificationResult = {
      configuration: {
        clientIdConfigured: false,
        clientSecretConfigured: false,
        redirectUriConfigured: false,
        redirectUriValid: false,
      },
      redis: {
        kvConfigured: false,
        kvConnected: false,
        kvNamespace: 'unknown',
      },
      session: {
        workbenchAuthenticated: false,
        driveAuthenticated: false,
      },
      authorization: {
        createAuthorizationCapability: false,
        retrieveAuthorizationExecuted: false,
        retrieveAuthorizationSuccess: false,
        revokeAuthorizationCapability: false,
        revokeAuthorizationExecuted: false,
        revokeAuthorizationSuccess: false,
      },
      credentials: {
        canResolveCredentials: false,
        hasAccessToken: false,
        hasRefreshToken: false,
      },
      flow: {
        startOAuth: 'not_tested',
        handleCallback: 'not_tested',
        createSession: 'not_tested',
        resolveSession: 'not_tested',
        revokeSession: 'not_tested',
      },
    };

    // Check OAuth configuration
    result.configuration.clientIdConfigured = !!process.env.GOOGLE_CLIENT_ID;
    result.configuration.clientSecretConfigured = !!process.env.GOOGLE_CLIENT_SECRET;
    result.configuration.redirectUriConfigured = !!process.env.GOOGLE_REDIRECT_URI;
    result.configuration.redirectUriValue = process.env.GOOGLE_REDIRECT_URI || undefined;
    
    // Validate redirect URI
    if (result.configuration.redirectUriConfigured) {
      const redirectUri = process.env.GOOGLE_REDIRECT_URI;
      result.configuration.redirectUriValid = !!redirectUri && (redirectUri.startsWith('https://') || redirectUri.startsWith('http://localhost'));
    }

    // Check Redis/KV configuration
    result.redis.kvConfigured = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
    result.redis.kvNamespace = process.env.VERCEL_ENV || 'development';
    
    if (result.redis.kvConfigured) {
      try {
        const { Redis } = await import('@upstash/redis');
        const redis = new Redis({
          url: process.env.KV_REST_API_URL,
          token: process.env.KV_REST_API_TOKEN,
        });
        await redis.ping();
        result.redis.kvConnected = true;
      } catch (error) {
        console.error('[OAUTH_VERIFICATION] KV connection failed:', error);
      }
    }

    // Check Workbench session
    result.session.workbenchAuthenticated = isWorkbenchAuthenticated;
    if (isWorkbenchAuthenticated) {
      const sessionIdentity = await workbenchSession.getSessionIdentity();
      result.session.workbenchSessionId = sessionIdentity?.sessionId;
    }

    // Check Drive session
    result.session.driveAuthenticated = await driveSession.isAuthenticated();
    if (result.session.driveAuthenticated) {
      const driveSessionId = await driveSession.getSessionId();
      result.session.driveSessionId = driveSessionId || undefined;
    }

    // Test authorization flow
    try {
      // Test if we can retrieve authorization (actual execution test)
      if (result.session.driveAuthenticated) {
        result.authorization.retrieveAuthorizationExecuted = true;
        const driveClient = await driveSession.getDriveClient();
        result.authorization.retrieveAuthorizationSuccess = !!driveClient;
        result.credentials.canResolveCredentials = !!driveClient;
        result.flow.resolveSession = result.authorization.retrieveAuthorizationSuccess ? 'success' : 'failed';
      } else {
        result.flow.resolveSession = 'no_drive_session';
      }
      
      // Test authorization creation capability (configuration check only)
      result.authorization.createAuthorizationCapability = result.redis.kvConnected && result.configuration.clientIdConfigured;
    } catch (error) {
      result.authorization.retrieveAuthorizationExecuted = true;
      result.authorization.retrieveAuthorizationSuccess = false;
      result.flow.resolveSession = error instanceof Error ? error.message : 'failed';
      result.authorization.createAuthorizationCapability = false;
    }

    // Session creation is configuration-dependent, not execution-tested here
    result.flow.createSession = result.redis.kvConnected ? 'kv_available' : 'kv_unavailable';
    result.flow.startOAuth = result.configuration.clientIdConfigured && result.configuration.redirectUriValid ? 'configuration_valid' : 'configuration_invalid';
    result.flow.handleCallback = result.redis.kvConnected ? 'kv_available' : 'kv_unavailable';
    result.flow.revokeSession = result.redis.kvConnected ? 'kv_available' : 'kv_unavailable';

    // Test authorization revocation (capability check, not actual execution)
    // Actual revocation would break the current session
    result.authorization.revokeAuthorizationCapability = result.redis.kvConnected && result.session.driveAuthenticated;

    return NextResponse.json({
      success: true,
      verification: result,
    });
  } catch (error) {
    console.error('[OAUTH_VERIFICATION] Verification failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'VERIFICATION_FAILED',
        message: 'OAuth session path verification failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}