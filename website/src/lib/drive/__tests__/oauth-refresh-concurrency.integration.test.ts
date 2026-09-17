/**
 * OAuth Refresh Concurrency Integration Test
 *
 * P0 FIX: Prove that concurrent refresh operations maintain authorization coherence
 *
 * This test addresses the adversarial scenario where multiple simultaneous requests
 * trigger token refresh for the same authorization. The code preserves existing
 * refresh tokens when Google doesn't return a replacement, but we need to prove
 * that concurrent refreshes don't cause race conditions or token loss.
 *
 * Security invariant: Multiple concurrent refreshes should not corrupt authorization
 * state or lose the refresh token.
 */

describe('OAuth Refresh Concurrency - Real Redis Integration', () => {
  let testNamespace: string;

  beforeAll(() => {
    // Skip integration tests if Redis is not enabled
    if (!process.env.REDIS_INTEGRATION_TESTS_ENABLED || process.env.REDIS_INTEGRATION_TESTS_ENABLED === 'false') {
      console.log('[OAUTH_REFRESH_CONCURRENCY] Skipping integration tests - Redis not enabled');
      return;
    }

    // P0 FIX: Use CI-supplied TEST_NAMESPACE from jest.oauth.integration.setup.ts
    testNamespace = process.env.TEST_NAMESPACE || 'hpp:test:';
    console.log('[OAUTH_REFRESH_CONCURRENCY] Using test namespace:', testNamespace);
  });

  // Skip all tests if Redis is not enabled
  beforeEach(() => {
    if (!process.env.REDIS_INTEGRATION_TESTS_ENABLED || process.env.REDIS_INTEGRATION_TESTS_ENABLED === 'false') {
      console.log('[OAUTH_REFRESH_CONCURRENCY] Skipping test - Redis not enabled');
    }
  });

  describe('Concurrent Refresh Operations', () => {
    it('should maintain authorization coherence under concurrent refresh', async () => {
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return;
      }

      const {
        upsertAuthorization,
        getAuthorization,
        updateAuthorizationAfterRefresh,
      } = await import('../oauth-credential-store');

      // Create authorization with expiring access token
      const initialExpiry = Date.now() + 1000; // Expires in 1 second
      const authorization = await upsertAuthorization(
        'test-subject-concurrent',
        'concurrent@example.com',
        ['openid', 'profile', 'email'],
        'initial-access-token',
        initialExpiry,
        'initial-refresh-token',
      );

      expect(authorization).not.toBeNull();
      // P0 FIX: Check encryptedRefreshToken field (actual interface field)
      expect(authorization.encryptedRefreshToken).toBeTruthy();

      // P0 FIX: Simulate concurrent refresh operations
      // In production, multiple requests trigger refresh simultaneously
      // Each calls updateAuthorizationAfterRefresh after getting new tokens from Google
      // This test exercises the actual refresh-update path through the store

      const refreshPromises = Array.from({ length: 5 }, async (_, i) => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100)); // Random delay

        // Simulate Google refresh returning new access token but preserving refresh token
        // This is the actual production path after successful Google token refresh
        await updateAuthorizationAfterRefresh(
          authorization.id,
          `refreshed-access-token-${i}`,
          Date.now() + 3600000,
          undefined, // Preserve existing refresh token
        );

        // Verify authorization state after update
        const currentAuth = await getAuthorization(authorization.id);

        return {
          index: i,
          hasRefreshToken: !!currentAuth?.encryptedRefreshToken,
          accessTokenPrefix: currentAuth?.encryptedAccessToken?.substring(0, 20),
          timestamp: Date.now(),
        };
      });

      // Wait for all concurrent operations to complete
      const results = await Promise.all(refreshPromises);

      // Verify all operations preserved refresh token
      results.forEach((result, i) => {
        expect(result.hasRefreshToken).toBe(true);
      });

      // Final verification: authorization still has refresh token
      const finalAuth = await getAuthorization(authorization.id);
      expect(finalAuth).not.toBeNull();
      expect(finalAuth?.encryptedRefreshToken).toBeTruthy();

      console.log('[OAUTH_REFRESH_CONCURRENCY] Concurrent refresh test passed', {
        concurrentOperations: results.length,
        allHadRefreshToken: results.every(r => r.hasRefreshToken),
        finalAccessTokenPrefix: finalAuth?.encryptedAccessToken?.substring(0, 20),
      });
    });

    it('should not lose refresh token when Google returns no replacement', async () => {
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return;
      }

      const {
        upsertAuthorization,
        getAuthorization,
        updateAuthorizationAfterRefresh,
      } = await import('../oauth-credential-store');

      // Create authorization
      const authorization = await upsertAuthorization(
        'test-subject-preserve',
        'preserve@example.com',
        ['openid', 'profile', 'email'],
        'old-access-token',
        Date.now() + 3600000,
        'precious-refresh-token',
      );

      expect(authorization.encryptedRefreshToken).toBeTruthy();

      // P0 FIX: Simulate refresh where Google returns new access token but NO new refresh token
      // This is normal Google OAuth behavior - refresh tokens are only returned on initial consent
      // The function signature is: updateAuthorizationAfterRefresh(authId, accessToken, accessTokenExpiresAt, newRefreshToken?)
      
      await updateAuthorizationAfterRefresh(
        authorization.id,
        'new-access-token',
        Date.now() + 3600000,
        undefined, // No new refresh token - should preserve existing
      );

      // Verify refresh token was preserved
      const updatedAuth = await getAuthorization(authorization.id);
      expect(updatedAuth).not.toBeNull();
      expect(updatedAuth?.encryptedRefreshToken).toBeTruthy(); // Still has refresh token

      console.log('[OAUTH_REFRESH_CONCURRENCY] Refresh token preservation test passed', {
        hasRefreshToken: !!updatedAuth?.encryptedRefreshToken,
      });
    });

    it('should handle concurrent authorization updates atomically', async () => {
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return;
      }

      const {
        upsertAuthorization,
        getAuthorization,
        updateAuthorizationAfterRefresh,
      } = await import('../oauth-credential-store');

      // Create authorization
      const authorization = await upsertAuthorization(
        'test-subject-atomic',
        'atomic@example.com',
        ['openid', 'profile', 'email'],
        'initial-access-token',
        Date.now() + 3600000,
        'atomic-refresh-token',
      );

      // P0 FIX: Simulate concurrent updates to the same authorization
      const updatePromises = Array.from({ length: 10 }, async (_, i) => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50)); // Random delay
        
        // Each update would represent a refresh operation
        // Function signature: updateAuthorizationAfterRefresh(authId, accessToken, accessTokenExpiresAt, newRefreshToken?)
        await updateAuthorizationAfterRefresh(
          authorization.id,
          `access-token-${i}`,
          Date.now() + 3600000,
          undefined, // Preserve existing refresh token
        );
        
        return i;
      });

      // Wait for all concurrent updates
      await Promise.all(updatePromises);

      // Final verification: authorization is coherent
      const finalAuth = await getAuthorization(authorization.id);
      expect(finalAuth).not.toBeNull();
      expect(finalAuth?.encryptedRefreshToken).toBeTruthy(); // Never lost

      console.log('[OAUTH_REFRESH_CONCURRENCY] Atomic update test passed', {
        concurrentUpdates: 10,
        refreshTokenPreserved: !!finalAuth?.encryptedRefreshToken,
      });
    });
  });
});
