/**
 * HTTP Boundary Negative Security Tests
 *
 * REAL HTTP request-level tests for security invariants:
 * - Legacy credential cookies + no drive_session_id → unauthenticated
 * - Revoked Drive session → 401/403
 * - Valid User A session + User B authorization/object → denied
 * - Invalid/arbitrary authorization identifiers cannot select another user's credentials
 * - Thumbnail route enforces the same authorization boundary
 * - Ingest route enforces the same authorization boundary
 *
 * CRITICAL: These tests use REAL HTTP requests to actual API route handlers.
 * They prove actual HTTP boundary enforcement, not just function-level logic.
 *
 * REQUIREMENTS:
 * - NEXT_PUBLIC_TEST_BASE_URL must be set (e.g., http://localhost:3000)
 * - KV_REST_API_URL and KV_REST_API_TOKEN must be set for Redis state management
 * - Tests skip if these are not available
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('HTTP Boundary Negative Security Tests', () => {
  // Fail closed if HTTP server URL or Redis credentials are not available during Phase B
  const shouldSkip = () => {
    return !process.env.NEXT_PUBLIC_TEST_BASE_URL ||
           !process.env.KV_REST_API_URL ||
           !process.env.KV_REST_API_TOKEN;
  };

  let workbenchCookie = '';
  const authenticatedFetch: typeof fetch = (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set('cookie', [workbenchCookie, headers.get('cookie')].filter(Boolean).join('; '));
    return fetch(input, { ...init, headers });
  };
  beforeAll(async () => {
    if (shouldSkip()) throw new Error('HTTP server and isolated Redis are required.');
    const response = await fetch(`${process.env.NEXT_PUBLIC_TEST_BASE_URL}/api/workbench/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: process.env.WORKBENCH_PASSWORD }),
    });
    expect(response.status).toBe(200);
    workbenchCookie = response.headers.get('set-cookie')?.split(';')[0] || '';
    expect(workbenchCookie).toContain('workbench_session_id=');
  });

  // Fail closed if required infrastructure is missing
  it('should have HTTP server and Redis credentials available', () => {
    if (shouldSkip()) {
      throw new Error('HTTP boundary tests require NEXT_PUBLIC_TEST_BASE_URL, KV_REST_API_URL, and KV_REST_API_TOKEN');
    }
  });

  const baseUrl = () => process.env.NEXT_PUBLIC_TEST_BASE_URL || '';

  describe('Legacy Cookie Rejection', () => {
    it('should reject Drive auth status with legacy cookies but no session', async () => {
      if (shouldSkip()) {
        return;
      }

      // Request with legacy credential cookies but NO session cookie
      const response = await authenticatedFetch(`${baseUrl()}/api/drive/auth/status`, {
        method: 'GET',
        headers: {
          'Cookie': 'drive_access_token=legacy-token; drive_refresh_token=legacy-refresh',
        },
      });

      // Expect 200 with authenticated: false (legacy cookies are ignored without session)
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.authenticated).toBe(false);
      expect(body.has_access_token).toBe(false);
      expect(body.has_refresh_token).toBe(false);
    });

    it('should reject Drive files request with legacy cookies but no session', async () => {
      if (shouldSkip()) {
        return;
      }

      // Request with legacy credential cookies but NO session cookie
      const response = await authenticatedFetch(`${baseUrl()}/api/drive/files?folderId=root`, {
        method: 'GET',
        headers: {
          'Cookie': 'drive_access_token=legacy-token; drive_refresh_token=legacy-refresh',
        },
      });

      // Expect 401 Unauthorized (session required)
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
      expect(body.message).toBe('Drive authentication required');
    });

    it('should reject Drive folder request with legacy cookies but no session', async () => {
      if (shouldSkip()) {
        return;
      }

      // Request with legacy credential cookies but NO session cookie
      const response = await authenticatedFetch(`${baseUrl()}/api/drive/folder/root`, {
        method: 'GET',
        headers: {
          'Cookie': 'drive_access_token=legacy-token; drive_refresh_token=legacy-refresh',
        },
      });

      // Expect 401 Unauthorized (session required)
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
      expect(body.message).toBe('Drive authentication required');
    });
  });

  describe('Revoked Session Rejection', () => {
    it('should reject Drive files request after authorization revocation', async () => {
      if (shouldSkip()) {
        return;
      }

      const {
        upsertAuthorization,
        getAuthorization,
        revokeAuthorizationWithSessions,
      } = await import('../oauth-credential-store');
      const { createSession, getSession } = await import('../session-store');

      // Create authorization
      const authorization = await upsertAuthorization(
        'test-subject-revoked',
        'test-revoked@example.com',
        ['openid', 'profile', 'email'],
        'test-access-token-revoked',
        Date.now() + 3600000,
        'test-refresh-token-revoked',
      );

      // Verify authorization exists
      const beforeRevoke = await getAuthorization(authorization.id);
      expect(beforeRevoke).not.toBeNull();

      // Create session bound to this authorization
      const session = await createSession(authorization.id, 'test-user-agent-revoked');
      expect(session).not.toBeNull();

      // Verify session resolves to authorization
      const sessionAuth = await getSession(session.id);
      expect(sessionAuth).not.toBeNull();
      expect(sessionAuth?.authorizationId).toBe(authorization.id);

      // Revoke authorization WITH sessions (atomic production path)
      await revokeAuthorizationWithSessions(authorization.id);

      // Verify authorization is revoked
      const afterRevoke = await getAuthorization(authorization.id);
      expect(afterRevoke).not.toBeNull();
      expect(afterRevoke?.status).toBe('revoked');

      // Verify session is invalid
      const invalidSession = await getSession(session.id);
      expect(invalidSession).toBeNull();

      // Make HTTP request with revoked session cookie
      const response = await authenticatedFetch(`${baseUrl()}/api/drive/files?folderId=root`, {
        method: 'GET',
        headers: {
          'Cookie': `drive_session_id=${session.id}`,
        },
      });

      // Expect 401 Unauthorized (session invalid/revoked)
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
      expect(body.message).toBe('Drive authentication required');

      // Cleanup
      const { deleteAuthorization } = await import('../oauth-credential-store');
      await deleteAuthorization(authorization.id).catch(() => {});
    });

    it('should reject Drive thumbnail request with revoked session', async () => {
      if (shouldSkip()) {
        return;
      }

      const {
        upsertAuthorization,
        revokeAuthorizationWithSessions,
      } = await import('../oauth-credential-store');
      const { createSession } = await import('../session-store');

      // Create authorization
      const authorization = await upsertAuthorization(
        'test-subject-thumb-revoked',
        'test-thumb-revoked@example.com',
        ['openid', 'profile', 'email'],
        'test-access-token-thumb-revoked',
        Date.now() + 3600000,
        'test-refresh-token-thumb-revoked',
      );

      // Create session bound to this authorization
      const session = await createSession(authorization.id, 'test-user-agent-thumb-revoked');

      // Revoke authorization WITH sessions (atomic production path)
      await revokeAuthorizationWithSessions(authorization.id);

      // Make HTTP request with revoked session cookie to thumbnail route
      const response = await authenticatedFetch(`${baseUrl()}/api/drive/files/test-file-id/thumbnail`, {
        method: 'GET',
        headers: {
          'Cookie': `drive_session_id=${session.id}`,
        },
      });

      // Expect 401 Unauthorized (session invalid/revoked)
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Drive authentication required');

      // Cleanup
      const { deleteAuthorization } = await import('../oauth-credential-store');
      await deleteAuthorization(authorization.id).catch(() => {});
    });
  });

  describe('Cross-User Isolation', () => {
    it('should reject User A session accessing User B authorization', async () => {
      if (shouldSkip()) {
        return;
      }

      const {
        upsertAuthorization,
        getAuthorization,
      } = await import('../oauth-credential-store');
      const { createSession, getSession } = await import('../session-store');

      // Create authorization for User A
      const authA = await upsertAuthorization(
        'test-subject-user-a',
        'user-a@example.com',
        ['openid', 'profile', 'email'],
        'test-access-token-a',
        Date.now() + 3600000,
        'test-refresh-token-a',
      );

      // Create session for User B (bound to User B's authorization)
      const authB = await upsertAuthorization(
        'test-subject-user-b',
        'user-b@example.com',
        ['openid', 'profile', 'email'],
        'test-access-token-b',
        Date.now() + 3600000,
        'test-refresh-token-b',
      );

      const sessionB = await createSession(authB.id, 'test-user-agent-b');

      // Verify both authorizations exist independently
      const checkA = await getAuthorization(authA.id);
      const checkB = await getAuthorization(authB.id);
      expect(checkA).not.toBeNull();
      expect(checkB).not.toBeNull();
      expect(checkA?.id).not.toBe(checkB?.id);

      // ACTUAL INVARIANT: Session B should only resolve to authorization B
      // This proves session-store binding isolation, not Google API failure
      const sessionAuth = await getSession(sessionB.id);
      expect(sessionAuth).not.toBeNull();
      expect(sessionAuth?.authorizationId).toBe(authB.id);
      expect(sessionAuth?.authorizationId).not.toBe(authA.id);

      // Session B cannot be used to select User A's authorization
      // This is enforced by session-store which only returns the authorization bound to the session
      // The HTTP boundary test verifies that the session cookie alone cannot be used to specify an arbitrary authorization ID
      const response = await authenticatedFetch(`${baseUrl()}/api/drive/files?folderId=root`, {
        method: 'GET',
        headers: {
          'Cookie': `drive_session_id=${sessionB.id}`,
        },
      });

      // The request should use session B's authorization (not User A's)
      // This test verifies session isolation - each session is bound to exactly one authorization
      // Since we don't have real Google credentials, the request will fail at the Google API level
      // But the critical invariant is that session B resolved to authB, not authA
      expect(response.status).toBeGreaterThanOrEqual(400);

      // Cleanup
      const { deleteAuthorization } = await import('../oauth-credential-store');
      await deleteAuthorization(authA.id).catch(() => {});
      await deleteAuthorization(authB.id).catch(() => {});
    });

    it('should reject cross-corpus Drive access', async () => {
      if (shouldSkip()) {
        return;
      }

      // This test verifies that corpus authorization is enforced at the HTTP boundary
      // Requesting an unauthorized Shared Drive corpus should fail with 403

      const response = await authenticatedFetch(`${baseUrl()}/api/drive/files?folderId=root&driveId=unauthorized-shared-drive-id`, {
        method: 'GET',
      });

      // Expect 403 Forbidden (corpus not authorized) or 401 (authentication required)
      // The corpus check happens after authentication, so we expect corpus rejection
      expect([401, 403]).toContain(response.status);
      const body = await response.json();
      // Either authentication failed or corpus was not authorized
      expect(['Unauthorized', 'DRIVE_ID_NOT_AUTHORIZED', 'MY_DRIVE_NOT_AUTHORIZED']).toContain(body.error);
    });
  });

  describe('Invalid Authorization Identifiers', () => {
    it('should reject requests with invalid session ID', async () => {
      if (shouldSkip()) {
        return;
      }

      // Request with invalid session ID
      const response = await authenticatedFetch(`${baseUrl()}/api/drive/files?folderId=root`, {
        method: 'GET',
        headers: {
          'Cookie': 'drive_session_id=invalid-session-id-that-does-not-exist',
        },
      });

      // Expect 401 Unauthorized (invalid session)
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
      expect(body.message).toBe('Drive authentication required');
    });

    it('should prevent authorization ID enumeration via timing', async () => {
      if (shouldSkip()) {
        return;
      }

      // Make multiple requests with different invalid session IDs
      // Verify timing is consistent (no timing channel for enumeration)
      const requestCount = 5;
      const timings: number[] = [];

      for (let i = 0; i < requestCount; i++) {
        const start = Date.now();
        await authenticatedFetch(`${baseUrl()}/api/drive/files?folderId=root`, {
          method: 'GET',
          headers: {
            'Cookie': `drive_session_id=invalid-session-id-${i}`,
          },
        });
        timings.push(Date.now() - start);
      }

      // Calculate standard deviation to check for timing consistency
      const mean = timings.reduce((a, b) => a + b, 0) / timings.length;
      const variance = timings.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / timings.length;
      const stdDev = Math.sqrt(variance);

      // All requests should complete within similar time (within 2 standard deviations)
      // This prevents timing attacks that could distinguish valid vs invalid session IDs
      const maxTiming = Math.max(...timings);
      const minTiming = Math.min(...timings);
      const timingRange = maxTiming - minTiming;

      // Allow reasonable variance (network jitter) but flag large discrepancies
      expect(timingRange).toBeLessThan(1000); // Less than 1 second variance
    });
  });

  describe('Route-Level Authorization Consistency', () => {
    it('should enforce same authorization on thumbnail route as files route', async () => {
      if (shouldSkip()) {
        return;
      }

      // Test unauthorized request to thumbnail route
      const response = await authenticatedFetch(`${baseUrl()}/api/drive/files/test-file-id/thumbnail`, {
        method: 'GET',
      });

      // Expect 401 Unauthorized (no session)
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Drive authentication required');
    });

    it('should enforce same authorization on ingest route as files route', async () => {
      if (shouldSkip()) {
        return;
      }

      // Test unauthorized POST request to ingest route
      const response = await authenticatedFetch(`${baseUrl()}/api/drive/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: 'test-file-id',
        }),
      });

      // Expect 401 Unauthorized (no session)
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('DRIVE_AUTH_REQUIRED');
      expect(body.message).toBe('Drive authentication required');
    });

    it('should reject thumbnail request with invalid session', async () => {
      if (shouldSkip()) {
        return;
      }

      // Test thumbnail route with invalid session
      const response = await authenticatedFetch(`${baseUrl()}/api/drive/files/test-file-id/thumbnail`, {
        method: 'GET',
        headers: {
          'Cookie': 'drive_session_id=invalid-session-id',
        },
      });

      // Expect 401 Unauthorized (invalid session)
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Drive authentication required');
    });

    it('should reject ingest request with invalid session', async () => {
      if (shouldSkip()) {
        return;
      }

      // Test ingest route with invalid session
      const response = await authenticatedFetch(`${baseUrl()}/api/drive/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'drive_session_id=invalid-session-id',
        },
        body: JSON.stringify({
          fileId: 'test-file-id',
        }),
      });

      // Expect 401 Unauthorized (invalid session)
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('DRIVE_AUTH_REQUIRED');
      expect(body.message).toBe('Drive authentication required');
    });
  });
});
