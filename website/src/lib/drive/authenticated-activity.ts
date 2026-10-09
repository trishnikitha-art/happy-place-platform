import { cookies } from 'next/headers';
import { renewSessionActivity } from './session-store';
import { DRIVE_IDLE_SECONDS } from './session-renewal';
import type { GoogleAuthorizationRecord } from './oauth-credential-store';

/** Only after Workbench identity and usable credentials have been checked, in a route handler. */
export async function recordDriveActivity(sessionId: string, authorization: GoogleAuthorizationRecord): Promise<boolean> {
  if (!await renewSessionActivity(sessionId, authorization)) return false;
  const cookieStore = await cookies();
  cookieStore.set('drive_session_id', sessionId, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
    maxAge: DRIVE_IDLE_SECONDS, path: '/',
  });
  return true;
}
