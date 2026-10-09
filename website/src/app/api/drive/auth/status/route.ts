/** Drive status is meaningful only for the current authenticated Workbench principal. */
import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { driveSession, type DriveCredentials } from '@/lib/drive/drive-session';
import { getOAuthClient } from '@/lib/drive/oauth-manager';
import { getAuthorization } from '@/lib/drive/oauth-credential-store';
import { getSession } from '@/lib/drive/session-store';
import { recordDriveActivity } from '@/lib/drive/authenticated-activity';

export const dynamic = 'force-dynamic';

function statusResponse(authenticated: boolean, credentials?: DriveCredentials | null, requiresReauth = false) {
  return NextResponse.json({
    authenticated,
    has_access_token: !!credentials?.access_token,
    has_refresh_token: !!credentials?.refresh_token,
    has_expiry_date: !!credentials?.expiry_date,
    has_scope: !!credentials?.scope,
    ...(requiresReauth ? { requiresReauth: true } : {}),
  }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
}

function hasUsableCredentials(credentials: DriveCredentials | null): credentials is DriveCredentials {
  return !!credentials?.access_token && !!credentials.refresh_token &&
    Number.isFinite(credentials.expiry_date) && credentials.expiry_date! > Date.now();
}

export async function GET() {
  try {
    // Authenticate before inspecting Drive sessions or encrypted credentials.
    if (!await workbenchSession.isAuthenticated()) return statusResponse(false);
    const principalId = process.env.HPP_WORKBENCH_PRINCIPAL_ID;
    if (!principalId?.trim()) return statusResponse(false);

    const sessionId = await driveSession.getSessionId();
    if (!sessionId) return statusResponse(false);
    const session = await getSession(sessionId);
    if (!session) return statusResponse(false);
    const authorization = await getAuthorization(session.authorizationId);
    if (!authorization || authorization.status !== 'active' || authorization.principalId !== principalId) {
      return statusResponse(false);
    }

    let credentials = await driveSession.getCredentials();
    if (!credentials?.access_token || !credentials.refresh_token) return statusResponse(false);
    if (!hasUsableCredentials(credentials)) {
      try {
        // Use the same principal-bound refresh authority as Drive operations.
        await getOAuthClient();
        credentials = await driveSession.getCredentials();
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        const permanentFailure = /invalid_grant|revoked|OAuth authorization failed/.test(message);
        console.warn('[DRIVE_AUTH_STATUS] Refresh failed', { permanentFailure });
        return statusResponse(false, undefined, permanentFailure);
      }
    }

    // A successful refresh call alone does not prove usable persisted credentials.
    if (!hasUsableCredentials(credentials)) return statusResponse(false);
    if (!await recordDriveActivity(sessionId, authorization)) return statusResponse(false);
    return statusResponse(true, credentials);
  } catch {
    console.warn('[DRIVE_AUTH_STATUS] Status unavailable');
    return statusResponse(false);
  }
}
