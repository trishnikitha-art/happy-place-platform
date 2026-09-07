/**
 * Redis Failure Semantics Integration Test
 *
 * P0 FIX: Prove that authorization operations fail closed when Redis is unavailable
 *
 * This test addresses the critical security invariant: when Redis is unavailable,
 * the application must fail closed (return explicit error) rather than:
 * - Returning "unauthenticated" (could allow bypass)
 * - Returning false (could be misinterpreted)
 * - Silent fallback to legacy cookies
 * - Silent fallback to any alternative auth mechanism
 *
 * Security invariant: Redis unavailable → explicit error → no silent fallback
 */

describe('Redis Failure Semantics - Real Redis Integration', () => {
  let originalRedisUrl: string | undefined;
  let originalRedisToken: string | undefined;
  
  beforeAll(() => {
    // Skip integration tests if Redis credentials are not available
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      console.log('[REDIS_FAILURE_SEMANTICS] Skipping integration tests - Redis credentials not available');
      return;
    }
    
    // Save original Redis credentials
    originalRedisUrl = process.env.KV_REST_API_URL;
    originalRedisToken = process.env.KV_REST_API_TOKEN;
    
    // P0 FIX: Use TEST_NAMESPACE set by jest.oauth.integration.setup.ts
    // Do not create separate namespace variable
    console.log('[REDIS_FAILURE_SEMANTICS] Using test namespace from setup:', process.env.TEST_NAMESPACE);
  });

  afterAll(() => {
    // Restore original Redis credentials
    if (originalRedisUrl) {
      process.env.KV_REST_API_URL = originalRedisUrl;
    }
    if (originalRedisToken) {
      process.env.KV_REST_API_TOKEN = originalRedisToken;
    }
  });

  // Skip all tests if Redis credentials are not available
  beforeEach(() => {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      console.log('[REDIS_FAILURE_SEMANTICS] Skipping test - Redis credentials not available');
    }
  });

  describe('Redis Unavailable - Fail Closed', () => {
    it('should throw explicit error when Redis URL is invalid', async () => {
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return;
      }

      // Temporarily set invalid Redis URL
      process.env.KV_REST_API_URL = 'https://invalid-redis-url.example.com';
      process.env.KV_REST_API_TOKEN = 'invalid-token';

      try {
        const { upsertAuthorization } = await import('../oauth-credential-store');
        
        // Attempt authorization operation with invalid Redis
        await expect(
          upsertAuthorization(
            'test-subject-fail-closed',
            'fail-closed@example.com',
            ['openid', 'profile', 'email'],
            'test-access-token',
            Date.now() + 3600000,
            'test-refresh-token',
          )
        ).rejects.toThrow();

        console.log('[REDIS_FAILURE_SEMANTICS] Invalid Redis URL test passed - operation failed explicitly');
      } finally {
        // Restore valid Redis credentials
        process.env.KV_REST_API_URL = originalRedisUrl!;
        process.env.KV_REST_API_TOKEN = originalRedisToken!;
      }
    });

    it('should throw explicit error when Redis token is invalid', async () => {
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return;
      }

      // Temporarily set invalid Redis token
      process.env.KV_REST_API_TOKEN = 'invalid-token';

      try {
        const { upsertAuthorization } = await import('../oauth-credential-store');
        
        // Attempt authorization operation with invalid Redis token
        await expect(
          upsertAuthorization(
            'test-subject-invalid-token',
            'invalid-token@example.com',
            ['openid', 'profile', 'email'],
            'test-access-token',
            Date.now() + 3600000,
            'test-refresh-token',
          )
        ).rejects.toThrow();

        console.log('[REDIS_FAILURE_SEMANTICS] Invalid Redis token test passed - operation failed explicitly');
      } finally {
        // Restore valid Redis credentials
        process.env.KV_REST_API_TOKEN = originalRedisToken!;
      }
    });

    it('should throw explicit error when Redis is unavailable (fail-closed)', async () => {
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return;
      }

      // Temporarily set invalid Redis credentials
      process.env.KV_REST_API_URL = 'https://invalid-redis-url.example.com';
      process.env.KV_REST_API_TOKEN = 'invalid-token';

      try {
        const { getAuthorization } = await import('../oauth-credential-store');
        
        // P0 FIX: Production implementation throws on Redis failure - this is correct fail-closed behavior
        // Do NOT expect null - Redis unavailable must throw, not return null
        await expect(
          getAuthorization('nonexistent-id')
        ).rejects.toThrow();

        console.log('[REDIS_FAILURE_SEMANTICS] Fail-closed test passed - threw explicit error on Redis failure');
      } finally {
        // Restore valid Redis credentials
        process.env.KV_REST_API_URL = originalRedisUrl!;
        process.env.KV_REST_API_TOKEN = originalRedisToken!;
      }
    });

    it('should throw explicit error when Redis unavailable for session operations', async () => {
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return;
      }

      // This test verifies the architectural invariant: no silent fallback
      // The Drive session manager should fail closed when Redis is unavailable
      
      // Temporarily set invalid Redis credentials
      process.env.KV_REST_API_URL = 'https://invalid-redis-url.example.com';
      process.env.KV_REST_API_TOKEN = 'invalid-token';

      try {
        const { getSession } = await import('../session-store');
        
        // P0 FIX: Production implementation throws on Redis failure - this is correct fail-closed behavior
        // Do NOT expect null - Redis unavailable must throw, not return null
        await expect(
          getSession('nonexistent-session-id')
        ).rejects.toThrow();

        console.log('[REDIS_FAILURE_SEMANTICS] No silent fallback test passed - threw explicit error');
      } finally {
        // Restore valid Redis credentials
        process.env.KV_REST_API_URL = originalRedisUrl!;
        process.env.KV_REST_API_TOKEN = originalRedisToken!;
      }
    });

    it('should maintain fail-closed invariant for authorization operations', async () => {
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return;
      }

      // First, create a valid authorization
      const { upsertAuthorization, getAuthorization, deleteAuthorization } = await import('../oauth-credential-store');
      
      const authorization = await upsertAuthorization(
        'test-subject-fail-closed-valid',
        'fail-closed-valid@example.com',
        ['openid', 'profile', 'email'],
        'test-access-token',
        Date.now() + 3600000,
        'test-refresh-token',
      );

      expect(authorization).not.toBeNull();

      // Now break Redis
      process.env.KV_REST_API_URL = 'https://invalid-redis-url.example.com';
      process.env.KV_REST_API_TOKEN = 'invalid-token';

      try {
        // Attempt to read the authorization with broken Redis
        // P0 FIX: Production implementation throws on Redis failure - this is correct fail-closed behavior
        // Do NOT expect null - Redis unavailable must throw, not return null
        await expect(
          getAuthorization(authorization.id)
        ).rejects.toThrow();

        console.log('[REDIS_FAILURE_SEMANTICS] Fail-closed invariant test passed - threw explicit error on Redis failure');
      } finally {
        // Restore valid Redis credentials and clean up
        process.env.KV_REST_API_URL = originalRedisUrl!;
        process.env.KV_REST_API_TOKEN = originalRedisToken!;
        
        // Clean up the test authorization
        await deleteAuthorization(authorization.id);
      }
    });
  });
});
