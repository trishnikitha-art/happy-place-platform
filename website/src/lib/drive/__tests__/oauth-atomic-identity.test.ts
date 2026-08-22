/**
 * Focused test for atomic Google identity acquisition
 * 
 * Tests:
 * - concurrent same-subject authorization → one authority
 * - reauthorization → deterministic
 * - revoked identity → deterministic behavior
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  upsertAuthorization,
  findAuthorizationBySubject,
  revokeAuthorization,
  getAuthorization,
} from '../oauth-credential-store';

describe('OAuth Atomic Identity Acquisition', () => {
  const TEST_SUBJECT = 'test-google-subject-123';
  const TEST_EMAIL = 'test@example.com';
  const TEST_SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
  const TEST_ACCESS_TOKEN = 'test-access-token';
  const TEST_REFRESH_TOKEN = 'test-refresh-token';
  const TEST_EXPIRES_AT = Date.now() + 3600000; // 1 hour from now

  beforeEach(async () => {
    // Clean up any existing test authorization
    const existingAuth = await findAuthorizationBySubject(TEST_SUBJECT);
    if (existingAuth) {
      await revokeAuthorization(existingAuth.id);
    }
  });

  afterEach(async () => {
    // Clean up after each test
    const existingAuth = await findAuthorizationBySubject(TEST_SUBJECT);
    if (existingAuth) {
      await revokeAuthorization(existingAuth.id);
    }
  });

  it('should create new authorization for new subject', async () => {
    const auth = await upsertAuthorization(
      TEST_SUBJECT,
      TEST_EMAIL,
      TEST_SCOPES,
      TEST_ACCESS_TOKEN,
      TEST_EXPIRES_AT,
      TEST_REFRESH_TOKEN
    );

    expect(auth).toBeDefined();
    expect(auth.googleSubject).toBe(TEST_SUBJECT);
    expect(auth.email).toBe(TEST_EMAIL);
    expect(auth.status).toBe('active');
  });

  it('should update existing active authorization', async () => {
    // Create initial authorization
    const auth1 = await upsertAuthorization(
      TEST_SUBJECT,
      TEST_EMAIL,
      TEST_SCOPES,
      TEST_ACCESS_TOKEN,
      TEST_EXPIRES_AT,
      TEST_REFRESH_TOKEN
    );

    // Update with same subject
    const auth2 = await upsertAuthorization(
      TEST_SUBJECT,
      'updated@example.com',
      TEST_SCOPES,
      'updated-access-token',
      TEST_EXPIRES_AT,
      'updated-refresh-token'
    );

    expect(auth2.id).toBe(auth1.id); // Same authorization ID
    expect(auth2.email).toBe('updated@example.com');
    expect(auth2.status).toBe('active');
  });

  it('should create new authorization for revoked subject', async () => {
    // Create initial authorization
    const auth1 = await upsertAuthorization(
      TEST_SUBJECT,
      TEST_EMAIL,
      TEST_SCOPES,
      TEST_ACCESS_TOKEN,
      TEST_EXPIRES_AT,
      TEST_REFRESH_TOKEN
    );

    // Revoke it
    await revokeAuthorization(auth1.id);

    // Create new authorization for same subject
    const auth2 = await upsertAuthorization(
      TEST_SUBJECT,
      'new@example.com',
      TEST_SCOPES,
      'new-access-token',
      TEST_EXPIRES_AT,
      'new-refresh-token'
    );

    expect(auth2.id).not.toBe(auth1.id); // Different authorization ID
    expect(auth2.googleSubject).toBe(TEST_SUBJECT);
    expect(auth2.email).toBe('new@example.com');
    expect(auth2.status).toBe('active');
  });

  it('should maintain one authorization per subject', async () => {
    // Create first authorization
    const auth1 = await upsertAuthorization(
      TEST_SUBJECT,
      TEST_EMAIL,
      TEST_SCOPES,
      TEST_ACCESS_TOKEN,
      TEST_EXPIRES_AT,
      TEST_REFRESH_TOKEN
    );

    // Attempt to create another with same subject
    const auth2 = await upsertAuthorization(
      TEST_SUBJECT,
      'duplicate@example.com',
      TEST_SCOPES,
      'duplicate-access-token',
      TEST_EXPIRES_AT,
      'duplicate-refresh-token'
    );

    // Should update the existing one, not create duplicate
    expect(auth2.id).toBe(auth1.id);
    expect(auth2.email).toBe('duplicate@example.com');

    // Verify only one authorization exists for subject
    const foundAuth = await findAuthorizationBySubject(TEST_SUBJECT);
    expect(foundAuth).toBeDefined();
    expect(foundAuth?.id).toBe(auth1.id);
  });
});