/**
 * OAuth Basic Unit Tests
 * 
 * These tests validate basic OAuth functionality without requiring Redis mocking.
 * More complex invariants (concurrency, browser binding, atomic identity) are tested
 * in integration tests with real Redis.
 */

describe('OAuth Basic Unit Tests', () => {
  it('should export encryption utilities', () => {
    const { encrypt, decrypt } = require('../encryption');
    expect(encrypt).toBeDefined();
    expect(decrypt).toBeDefined();
  });

  it('should export credential store functions', () => {
    const {
      upsertAuthorization,
      getAuthorization,
      revokeAuthorization,
      findAuthorizationBySubject,
    } = require('../oauth-credential-store');
    expect(upsertAuthorization).toBeDefined();
    expect(getAuthorization).toBeDefined();
    expect(revokeAuthorization).toBeDefined();
    expect(findAuthorizationBySubject).toBeDefined();
  });

  it('should export state manager functions', () => {
    const {
      generateState,
      validateState,
      consumeState,
      deleteState,
    } = require('../oauth-state-manager');
    expect(generateState).toBeDefined();
    expect(validateState).toBeDefined();
    expect(consumeState).toBeDefined();
    expect(deleteState).toBeDefined();
  });

  it('should export StateValidationResult enum', () => {
    const { StateValidationResult } = require('../oauth-state-manager');
    expect(StateValidationResult).toBeDefined();
    expect(StateValidationResult.STATE_VALID).toBe('STATE_VALID');
    expect(StateValidationResult.STATE_INVALID).toBe('STATE_INVALID');
    expect(StateValidationResult.STATE_EXPIRED).toBe('STATE_EXPIRED');
    expect(StateValidationResult.STATE_REPLAYED).toBe('STATE_REPLAYED');
    expect(StateValidationResult.STATE_BROWSER_MISMATCH).toBe('STATE_BROWSER_MISMATCH');
    expect(StateValidationResult.STATE_MISSING).toBe('STATE_MISSING');
    expect(StateValidationResult.STATE_MALFORMED).toBe('STATE_MALFORMED');
    expect(StateValidationResult.STATE_INFRASTRUCTURE_ERROR).toBe('STATE_INFRASTRUCTURE_ERROR');
  });

  it('should generate cryptographically random state', () => {
    const { generateState } = require('../oauth-state-manager');
    const state1 = generateState();
    const state2 = generateState();
    
    expect(state1).toBeDefined();
    expect(state2).toBeDefined();
    expect(state1).not.toBe(state2); // Should be different each time
    expect(state1.length).toBeGreaterThan(20); // Should be reasonably long
  });
});
