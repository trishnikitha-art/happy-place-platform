/**
 * Drive Authentication Status API Route
 *
 * Checks if user is authenticated with Google Drive.
 * Used by workbench to determine if "Connect Google Account" button should show.
 * 
 * FIX: Now actually validates token expiry and attempts refresh before reporting authenticated status.
 * If refresh fails (invalid_grant), returns authenticated: false to trigger re-authentication UI.
 */

import { NextResponse } from 'next/server';
import { driveSession } from '@/lib/drive/drive-session';
import { getOAuthClient } from '@/lib/drive/oauth-manager';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessionId = await driveSession.getSessionId();
    console.log('[DRIVE AUTH STATUS FORENSIC] Session ID check:', {
      hasSessionId: !!sessionId,
      sessionIdPrefix: sessionId ? sessionId.substring(0, 8) + '...' : 'none',
    });

    // Check if session exists first
    if (!sessionId) {
      console.log('[DRIVE AUTH STATUS FORENSIC] No session ID - not authenticated');
      return NextResponse.json({
        authenticated: false,
        has_access_token: false,
        has_refresh_token: false,
        has_expiry_date: false,
        has_scope: false,
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    const credentials = await driveSession.getCredentials();
    
    // Check if credentials exist
    if (!credentials) {
      console.log('[DRIVE AUTH STATUS FORENSIC] No credentials - not authenticated');
      return NextResponse.json({
        authenticated: false,
        has_access_token: false,
        has_refresh_token: false,
        has_expiry_date: false,
        has_scope: false,
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    // Check if access token is expired
    const isAccessTokenExpired = !credentials.expiry_date || Date.now() > credentials.expiry_date;
    
    console.log('[DRIVE AUTH STATUS FORENSIC] Token status check:', {
      hasAccessToken: !!credentials?.access_token,
      hasRefreshToken: !!credentials?.refresh_token,
      hasExpiry: !!credentials?.expiry_date,
      hasScope: !!credentials?.scope,
      expiryDate: credentials?.expiry_date ? new Date(credentials.expiry_date).toISOString() : 'none',
      isAccessTokenExpired,
    });

    // If access token is expired, attempt refresh before reporting status
    if (isAccessTokenExpired) {
      console.log('[DRIVE AUTH STATUS FORENSIC] Access token expired, attempting refresh...');
      
      try {
        // Attempt to refresh using getOAuthClient which handles refresh automatically
        await getOAuthClient();
        
        // Refresh succeeded - get fresh credentials
        const freshCredentials = await driveSession.getCredentials();
        console.log('[DRIVE AUTH STATUS FORENSIC] Token refresh succeeded');
        
        return NextResponse.json({
          authenticated: true,
          has_access_token: !!freshCredentials?.access_token,
          has_refresh_token: !!freshCredentials?.refresh_token,
          has_expiry_date: !!freshCredentials?.expiry_date,
          has_scope: !!freshCredentials?.scope,
        }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        });
      } catch (refreshError) {
        console.error('[DRIVE AUTH STATUS FORENSIC] Token refresh failed:', refreshError);
        
        // Refresh failed - likely invalid_grant (revoked/invalid refresh token)
        // Return authenticated: false to trigger re-authentication UI
        const errorMessage = refreshError instanceof Error ? refreshError.message : String(refreshError);
        const isPermanentFailure = errorMessage.includes('invalid_grant') || 
                                    errorMessage.includes('revoked') ||
                                    errorMessage.includes('Token has been revoked') ||
                                    errorMessage.includes('OAuth authorization failed');
        
        console.log('[DRIVE AUTH STATUS FORENSIC] Refresh failure classification:', {
          isPermanentFailure,
          errorMessage: errorMessage.substring(0, 100),
        });
        
        if (isPermanentFailure) {
          // Permanent failure - user must re-authenticate
          return NextResponse.json({
            authenticated: false,
            has_access_token: !!credentials?.access_token,
            has_refresh_token: !!credentials?.refresh_token,
            has_expiry_date: !!credentials?.expiry_date,
            has_scope: !!credentials?.scope,
            requiresReauth: true,
          }, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
          });
        }
        
        // Transient failure - still report not authenticated
        return NextResponse.json({
          authenticated: false,
          has_access_token: !!credentials?.access_token,
          has_refresh_token: !!credentials?.refresh_token,
          has_expiry_date: !!credentials?.expiry_date,
          has_scope: !!credentials?.scope,
        }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        });
      }
    }

    // Access token is valid - report authenticated
    console.log('[DRIVE AUTH STATUS FORENSIC] Access token valid - authenticated');
    return NextResponse.json({
      authenticated: true,
      has_access_token: !!credentials?.access_token,
      has_refresh_token: !!credentials?.refresh_token,
      has_expiry_date: !!credentials?.expiry_date,
      has_scope: !!credentials?.scope,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[DRIVE AUTH STATUS FORENSIC] Auth status check error:', error);
    return NextResponse.json({
      authenticated: false,
      has_access_token: false,
      has_refresh_token: false,
      has_expiry_date: false,
      has_scope: false,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }
}
