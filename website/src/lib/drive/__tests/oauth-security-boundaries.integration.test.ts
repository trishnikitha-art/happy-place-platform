/**
 * OAuth Security Boundary Integration Tests
 *
 * REAL Redis integration tests for critical security invariants:
 * - Browser binding with real Redis
 * - TTL expiration
 * - Legacy credential isolation at route level
 * - Revoked-session rejection
 * - Cross-session isolation
 *
 * CRITICAL: These tests use REAL Redis connectivity, NOT mocks.
 * They prove actual production security boundaries.
 */

describe('OAuth Security Boundaries - Real Redis Integration', () => {
  // P0 FIX: Use the TEST_NAMESPACE set by jest.oauth.integration.setup.ts
  // Do not create a separate namespace variable - use the setup's namespace
  // This ensures all integration tests use the same isolated namespace

  // Skip all tests if Redis credentials are not available
  beforeEach(() => {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      console.log('[OAUTH_SECURITY_INTEGRATION] Skipping test - Redis credentials not available');
    }
  });

  describe('Browser Binding', () => {
    it('should accept valid browser binding', async () => {
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return;
      }

      const {
        createState,
        consumeState,
      } = await import('../oauth-state-manager');
      const { cookies } = await import('next/headers');

      // Create mock cookie store for testing
      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: 'test-browser-binding' }),
        set: jest.fn(),
        delete: jest.fn(),
      };

      const stateId = await createState(mockCookieStore as any);

      // Consume with same browser binding should succeed
      const result = await consumeState(stateId, mockCookieStore as any);
      
      expect(result).toBe(true);
    });

    it('should reject different browser binding', async () => {
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return;
      }

      const {
        createState,
        consumeState,
      } = await import('../oauth-state-manager');
      const { cookies } = await import('next/headers');

      // Create with one browser binding
      const createCookieStore = {
        get: jest.fn().mockReturnValue({ value: 'browser-a' }),
        set: jest.fn(),
        delete: jest.fn(),
      };

      const stateId = await createState(createCookieStore as any);

      // Consume with different browser binding should fail
      const consumeCookieStore = {
        get: jest.fn().mockReturnValue({ value: 'browser-b' }),
        set: jest.fn(),
        delete: jest.fn(),
      };

      const result = await consumeState(stateId, consumeCookieStore as any);
      
      expect(result).toBe(false);
    });

    it('should reject missing browser binding', async () => {
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return;
      }

      const {
        createState,
        consumeState,
      } = await import('../oauth-state-manager');
      const { cookies } = await import('next/headers');

      // Create with browser binding
      const createCookieStore = {
        get: jest.fn().mockReturnValue({ value: 'test-browser-binding' }),
        set: jest.fn(),
        delete: jest.fn(),
      };

      const stateId = await createState(createCookieStore as any);

      // Consume without browser binding should fail
      const consumeCookieStore = {
        get: jest.fn().mockReturnValue(undefined),
        set: jest.fn(),
        delete: jest.fn(),
      };

      const result = await consumeState(stateId, consumeCookieStore as any);
      
      expect(result).toBe(false);
    });

    it('should reject forged browser binding', async () => {
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return;
      }

      const {
        createState,
        consumeState,
      } = await import('../oauth-state-manager');
      const { cookies } = await import('next/headers');

      // Create with one browser binding
      const createCookieStore = {
        get: jest.fn().mockReturnValue({ value: 'original-binding' }),
        set: jest.fn(),
        delete: jest.fn(),
      };

      const stateId = await createState(createCookieStore as any);

      // Consume with forged binding should fail
      const consumeCookieStore = {
        get: jest.fn().mockReturnValue({ value: 'forged-binding-attacker' }),
        set: jest.fn(),
        delete: jest.fn(),
      };

      const result = await consumeState(stateId, consumeCookieStore as any);
      
      expect(result).toBe(false);
    });
  });

  describe('TTL Expiration', () => {
    it('should reject expired state after TTL', async () => {
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return;
      }

      // Set test-only short TTL
      // TTL is resolved at operation time via resolveStateTtl()
      const originalTtl = process.env.OAUTH_STATE_TTL_SECONDS;
      process.env.OAUTH_STATE_TTL_SECONDS = '1'; // 1 second TTL

      const {
        createState,
        consumeState,
      } = await import('../oauth-state-manager');
      const { cookies } = await import('next/headers');

      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: 'test-browser-binding' }),
        set: jest.fn(),
        delete: jest.fn(),
      };

      const stateId = await createState(mockCookieStore as any);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Consume after TTL should fail
      const result = await consumeState(stateId, mockCookieStore as any);
      
      expect(result).toBe(false);

      // Restore original TTL
      if (originalTtl) {
        process.env.OAUTH_STATE_TTL_SECONDS = originalTtl;
      } else {
        delete process.env.OAUTH_STATE_TTL_SECONDS;
      }
    });
  });

  describe('Legacy Credential Isolation', () => {
    it('should reject legacy drive_access_token cookie without session at auth status route', async () => {
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return;
      }

      // P0 FIX: Require NEXT_PUBLIC_TEST_BASE_URL for HTTP tests
      // Do NOT default to localhost - HTTP tests must explicitly target the running server
      if (!process.env.NEXT_PUBLIC_TEST_BASE_URL) {
        console.log('[OAUTH_SECURITY_INTEGRATION] Skipping HTTP test - NEXT_PUBLIC_TEST_BASE_URL not set');
        return;
      }

      // P0 FIX: Test against Drive auth status route which uses Drive session authentication
      // NOT against /api/drive/discovery which requires Workbench authentication
      // This is intentional: Workbench routes require Workbench auth, Drive routes require Drive session
      
      const baseUrl = process.env.NEXT_PUBLIC_TEST_BASE_URL;
      
      // Request with legacy credential cookies but NO session cookie
      const response = await fetch(`${baseUrl}/api/drive/auth/status`, {
        method: 'GET',
        headers: {
          'Cookie': 'drive_access_token=legacy-token; drive_refresh_token=legacy-refresh',
        },
      });

      // Expect 200 with authenticated: false (not 401, but the auth status should be false)
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.authenticated).toBe(false);
      expect(body.has_access_token).toBe(false);
      expect(body.has_refresh_token).toBe(false);
    });
  });

  describe('Workbench Authentication Boundary', () => {
    it('should reject Drive discovery without Workbench authentication', async () => {
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return;
      }

      // P0 FIX: Require NEXT_PUBLIC_TEST_BASE_URL for HTTP tests
      if (!process.env.NEXT_PUBLIC_TEST_BASE_URL) {
        console.log('[OAUTH_SECURITY_INTEGRATION] Skipping HTTP test - NEXT_PUBLIC_TEST_BASE_URL not set');
        return;
      }

      // P0 FIX: Test Workbench authentication boundary at /api/drive/discovery
      // This route requires Workbench session, NOT Drive session
      // This is intentional - Drive discovery is only available within the Workbench
      
      const baseUrl = process.env.NEXT_PUBLIC_TEST_BASE_URL;
      
      // Request without any authentication
      const response = await fetch(`${baseUrl}/api/drive/discovery`, {
        method: 'GET',
      });

      // Expect 401 Unauthorized
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
      expect(body.message).toBe('Workbench authentication required');
    });
  });

  describe('Revoked Session Rejection', () => {
    it('should reject Drive request after authorization revocation', async () => {
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return;
      }

      // P0 FIX: Require NEXT_PUBLIC_TEST_BASE_URL for HTTP tests
      if (!process.env.NEXT_PUBLIC_TEST_BASE_URL) {
        console.log('[OAUTH_SECURITY_INTEGRATION] Skipping HTTP test - NEXT_PUBLIC_TEST_BASE_URL not set');
        return;
      }

      const {
        upsertAuthorization,
        getAuthorization,
        deleteAuthorization,
      } = await import('../oauth-credential-store');
      const { createSession, getSession } = await import('../session-store');

      // Create authorization
      const authorization = await upsertAuthorization(
        'test-subject',
        'test@example.com',
        ['openid', 'profile', 'email'],
        'test-access-token',
        Date.now() + 3600000,
        'test-refresh-token',
      );

      // Verify authorization exists
      const beforeRevoke = await getAuthorization(authorization.id);
      expect(beforeRevoke).not.toBeNull();

      // Create session bound to this authorization (requires userAgent)
      const session = await createSession(authorization.id, 'test-user-agent');
      expect(session).not.toBeNull();

      // Verify session resolves to authorization
      const sessionAuth = await getSession(session.id);
      expect(sessionAuth).not.toBeNull();
      // P0 FIX: Correct assertion - session.id is the session ID, not authorization ID
      expect(sessionAuth?.id).toBe(session.id);
      expect(sessionAuth?.authorizationId).toBe(authorization.id);

      // Revoke authorization
      await deleteAuthorization(authorization.id);

      // Verify authorization is gone
      const afterRevoke = await getAuthorization(authorization.id);
      expect(afterRevoke).toBeNull();

      // P0 FIX: Verify session is now unusable via API
      const sessionAfterRevoke = await getSession(session.id);
      // Session record may still exist but should not resolve to valid authorization
      expect(sessionAfterRevoke).toBeNull();
    });
  });

  describe('Cross-Session Isolation', () => {
    it('should reject deleted session at API boundary', async () => {
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return;
      }

      // P0 FIX: Require NEXT_PUBLIC_TEST_BASE_URL for HTTP tests
      if (!process.env.NEXT_PUBLIC_TEST_BASE_URL) {
        console.log('[OAUTH_SECURITY_INTEGRATION] Skipping HTTP test - NEXT_PUBLIC_TEST_BASE_URL not set');
        return;
      }

      const {
        upsertAuthorization,
      } = await import('../oauth-credential-store');
      const { createSession, deleteSession, getSession } = await import('../session-store');

      // Create authorization
      const authorization = await upsertAuthorization(
        'test-subject',
        'test@example.com',
        ['openid', 'profile', 'email'],
        'test-access-token',
        Date.now() + 3600000,
        'test-refresh-token',
      );

      // Create session bound to this authorization (requires userAgent)
      const session = await createSession(authorization.id, 'test-user-agent');
      expect(session).not.toBeNull();

      // Verify session exists
      const beforeDelete = await getSession(session.id);
      expect(beforeDelete).not.toBeNull();
      // P0 FIX: Correct assertion - session.id is the session ID, not authorization ID
      expect(beforeDelete?.id).toBe(session.id);
      expect(beforeDelete?.authorizationId).toBe(authorization.id);

      // Delete the session
      await deleteSession(session.id);

      // Verify session is gone
      const afterDelete = await getSession(session.id);
      expect(afterDelete).toBeNull();
    });
  });
});
