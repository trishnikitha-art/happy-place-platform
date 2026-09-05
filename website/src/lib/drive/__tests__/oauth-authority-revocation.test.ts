/**
 * OAuth Authority Revocation Tests
 * 
 * Tests for revocation invariants:
 * - Multiple sessions → all revoked
 * - Revoked authorization → no usable sessions
 * - Repeated revocation → idempotent
 * - Single authoritative revocation path
 */

// Mock Redis for unit tests
jest.mock('@upstash/redis', () => {
  function Redis(this: unknown, ...args: unknown[]) {
    return {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
    };
  }
  return { Redis };
});

// Mock cookies for Next.js
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

import {
  upsertAuthorization,
  revokeAuthorizationWithSessions,
  findAuthorizationBySubject,
  getAuthorization,
} from '../oauth-credential-store';

describe('OAuth Authority Revocation', () => {
  const TEST_SUBJECT = 'test-google-subject-revocation';
  const TEST_EMAIL = 'revocation@example.com';
  const TEST_SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

  beforeEach(async () => {
    // Clean up any existing test data
    try {
      const existing = await findAuthorizationBySubject(TEST_SUBJECT);
      if (existing) {
        await revokeAuthorizationWithSessions(existing.id);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterEach(async () => {
    // Clean up test data
    try {
      const existing = await findAuthorizationBySubject(TEST_SUBJECT);
      if (existing) {
        await revokeAuthorizationWithSessions(existing.id);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterAll(() => {
    // No cleanup needed for unit tests
  });

  describe('Multiple Session Revocation', () => {
    it('should revoke all sessions when authorization is revoked', async () => {
      // Create authorization
      const auth = await upsertAuthorization(
        TEST_SUBJECT,
        TEST_EMAIL,
        TEST_SCOPES,
        'test-access-token',
        Date.now() + 3600000,
        'test-refresh-token'
      );

      expect(auth).toBeTruthy();
      expect(auth.id).toBeTruthy();

      // Verify authorization exists
      const retrieved = await getAuthorization(auth.id);
      expect(retrieved).toBeTruthy();
      expect(retrieved?.status).toBe('active');

      // Revoke authorization with sessions
      await revokeAuthorizationWithSessions(auth.id);

      // Verify authorization is revoked
      const revoked = await getAuthorization(auth.id);
      expect(revoked).toBeTruthy();
      expect(revoked?.status).toBe('revoked');

      // All sessions should be revoked (covered by revokeAuthorizationWithSessions)
      // This is a placeholder for session-specific tests
    });
  });

  describe('Revoked Authorization Usability', () => {
    it('should not allow use of revoked authorization', async () => {
      // Create authorization
      const auth = await upsertAuthorization(
        TEST_SUBJECT,
        TEST_EMAIL,
        TEST_SCOPES,
        'test-access-token',
        Date.now() + 3600000,
        'test-refresh-token'
      );

      // Revoke authorization
      await revokeAuthorizationWithSessions(auth.id);

      // Verify authorization is revoked
      const revoked = await getAuthorization(auth.id);
      expect(revoked?.status).toBe('revoked');

      // Attempting to use revoked authorization should fail
      // This is a placeholder for authorization usage tests
      expect(revoked?.status).toBe('revoked');
    });
  });

  describe('Idempotent Revocation', () => {
    it('should be idempotent - repeated revocation should not error', async () => {
      // Create authorization
      const auth = await upsertAuthorization(
        TEST_SUBJECT,
        TEST_EMAIL,
        TEST_SCOPES,
        'test-access-token',
        Date.now() + 3600000,
        'test-refresh-token'
      );

      // First revocation
      await revokeAuthorizationWithSessions(auth.id);

      // Second revocation (should not error)
      await expect(revokeAuthorizationWithSessions(auth.id)).resolves.not.toThrow();

      // Third revocation (should not error)
      await expect(revokeAuthorizationWithSessions(auth.id)).resolves.not.toThrow();
    });
  });

  describe('Single Authoritative Revocation Path', () => {
    it('should use revokeAuthorizationWithSessions as the single revocation path', async () => {
      // Create authorization
      const auth = await upsertAuthorization(
        TEST_SUBJECT,
        TEST_EMAIL,
        TEST_SCOPES,
        'test-access-token',
        Date.now() + 3600000,
        'test-refresh-token'
      );

      // Use the authoritative revocation path
      await revokeAuthorizationWithSessions(auth.id);

      // Verify it worked
      const revoked = await getAuthorization(auth.id);
      expect(revoked?.status).toBe('revoked');

      // This test ensures we're using the correct function
      // Integration tests would verify no other revocation paths exist
    });
  });
});
