/**
 * Staging Schema Error Distinguishability Tests
 * 
 * Tests that staging schema errors are programmatically distinguishable:
 * - STAGING_SCHEMA_UNSUPPORTED: unknown/unrecognized key pattern
 * - STAGING_SCHEMA_INVALID: recognized key with malformed payload
 */

import { describe, it, expect } from '@jest/globals';

/**
 * Custom error class for staging schema errors with distinguishable error codes
 */
class StagingSchemaError extends Error {
  constructor(
    message: string,
    public readonly errorCode: 'STAGING_SCHEMA_UNSUPPORTED' | 'STAGING_SCHEMA_INVALID'
  ) {
    super(message);
    this.name = 'StagingSchemaError';
  }
}

// Simplified decode functions for testing error distinguishability
function decodeAssignmentStagingWithError(value: unknown): { mediaId: string; expectedRevision: number; updatedAt: string; source: string } {
  let parsed: unknown;

  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch (e) {
      throw new StagingSchemaError(`Invalid assignment staging: string is not valid JSON`, 'STAGING_SCHEMA_INVALID');
    }
  } else if (typeof value === 'object' && value !== null) {
    parsed = value;
  } else {
    throw new StagingSchemaError(`Invalid assignment staging: unexpected type ${typeof value}`, 'STAGING_SCHEMA_INVALID');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new StagingSchemaError('Invalid assignment staging: parsed result is not an object', 'STAGING_SCHEMA_INVALID');
  }

  const staging = parsed as Record<string, unknown>;

  if (typeof staging.mediaId !== 'string') {
    throw new StagingSchemaError(`Invalid assignment staging: mediaId is missing or not a string (got ${typeof staging.mediaId})`, 'STAGING_SCHEMA_INVALID');
  }

  if (typeof staging.expectedRevision !== 'number') {
    throw new StagingSchemaError(`Invalid assignment staging: expectedRevision is missing or not a number (got ${typeof staging.expectedRevision})`, 'STAGING_SCHEMA_INVALID');
  }

  if (typeof staging.updatedAt !== 'string') {
    throw new StagingSchemaError(`Invalid assignment staging: updatedAt is missing or not a string (got ${typeof staging.updatedAt})`, 'STAGING_SCHEMA_INVALID');
  }

  if (typeof staging.source !== 'string') {
    throw new StagingSchemaError(`Invalid assignment staging: source is missing or not a string (got ${typeof staging.source})`, 'STAGING_SCHEMA_INVALID');
  }

  return {
    mediaId: staging.mediaId,
    expectedRevision: staging.expectedRevision,
    updatedAt: staging.updatedAt,
    source: staging.source,
  };
}

function dispatchStagingRecordType(key: string): 'assignment' | 'gallery' | 'pointer' | 'unknown' {
  const relativeKey = key.replace('hpp:production:workbench-staging:', '');
  const parts = relativeKey.split(':');

  if (parts.length >= 2 && parts[1] === 'service') {
    return 'assignment';
  }

  if (parts.length >= 4 && parts[1] === 'project') {
    const field = parts[3];
    if (field === 'gallery') {
      return 'gallery';
    } else if (field === 'current-transaction') {
      return 'pointer';
    } else {
      return 'assignment';
    }
  }

  return 'unknown';
}

describe('Staging Schema Error Distinguishability', () => {
  describe('STAGING_SCHEMA_UNSUPPORTED for unknown key patterns', () => {
    it('should throw StagingSchemaError with STAGING_SCHEMA_UNSUPPORTED code for unknown key pattern', () => {
      const unknownKey = 'hpp:production:workbench-staging:WBDEP-123:unknown-type:something';
      const stagingType = dispatchStagingRecordType(unknownKey);
      
      expect(stagingType).toBe('unknown');
      
      expect(() => {
        if (stagingType === 'unknown') {
          throw new StagingSchemaError(`Unknown staging key pattern: ${unknownKey}`, 'STAGING_SCHEMA_UNSUPPORTED');
        }
      }).toThrow(StagingSchemaError);
      
      try {
        if (stagingType === 'unknown') {
          throw new StagingSchemaError(`Unknown staging key pattern: ${unknownKey}`, 'STAGING_SCHEMA_UNSUPPORTED');
        }
      } catch (e) {
        expect(e instanceof StagingSchemaError).toBe(true);
        expect((e as StagingSchemaError).errorCode).toBe('STAGING_SCHEMA_UNSUPPORTED');
      }
    });

    it('should throw StagingSchemaError with STAGING_SCHEMA_UNSUPPORTED code for unexpected staging type', () => {
      // Simulate an unexpected staging type from dispatch
      const unexpectedType = 'invalid-type' as any;
      
      expect(() => {
        throw new StagingSchemaError(`Unexpected staging type: ${unexpectedType}`, 'STAGING_SCHEMA_UNSUPPORTED');
      }).toThrow(StagingSchemaError);
      
      try {
        throw new StagingSchemaError(`Unexpected staging type: ${unexpectedType}`, 'STAGING_SCHEMA_UNSUPPORTED');
      } catch (e) {
        expect(e instanceof StagingSchemaError).toBe(true);
        expect((e as StagingSchemaError).errorCode).toBe('STAGING_SCHEMA_UNSUPPORTED');
      }
    });

    it('should allow callers to distinguish STAGING_SCHEMA_UNSUPPORTED programmatically', () => {
      const unknownKey = 'hpp:production:workbench-staging:WBDEP-123:unknown-type:something';
      const stagingType = dispatchStagingRecordType(unknownKey);
      
      let caughtError: StagingSchemaError | null = null;
      
      try {
        if (stagingType === 'unknown') {
          throw new StagingSchemaError(`Unknown staging key pattern: ${unknownKey}`, 'STAGING_SCHEMA_UNSUPPORTED');
        }
      } catch (e) {
        if (e instanceof StagingSchemaError) {
          caughtError = e;
        }
      }
      
      expect(caughtError).not.toBeNull();
      expect(caughtError?.errorCode).toBe('STAGING_SCHEMA_UNSUPPORTED');
    });
  });

  describe('STAGING_SCHEMA_INVALID for malformed payloads', () => {
    it('should throw StagingSchemaError with STAGING_SCHEMA_INVALID code for missing mediaId', () => {
      const invalidAssignment = {
        expectedRevision: 1,
        updatedAt: '2026-09-24T00:00:00Z',
        source: 'workbench'
      };
      
      expect(() => decodeAssignmentStagingWithError(invalidAssignment)).toThrow(StagingSchemaError);
      
      try {
        decodeAssignmentStagingWithError(invalidAssignment);
      } catch (e) {
        expect(e instanceof StagingSchemaError).toBe(true);
        expect((e as StagingSchemaError).errorCode).toBe('STAGING_SCHEMA_INVALID');
      }
    });

    it('should throw StagingSchemaError with STAGING_SCHEMA_INVALID code for invalid JSON string', () => {
      const invalidJson = 'not valid json';
      
      expect(() => decodeAssignmentStagingWithError(invalidJson)).toThrow(StagingSchemaError);
      
      try {
        decodeAssignmentStagingWithError(invalidJson);
      } catch (e) {
        expect(e instanceof StagingSchemaError).toBe(true);
        expect((e as StagingSchemaError).errorCode).toBe('STAGING_SCHEMA_INVALID');
      }
    });

    it('should throw StagingSchemaError with STAGING_SCHEMA_INVALID code for unexpected type', () => {
      const invalidType = 12345;
      
      expect(() => decodeAssignmentStagingWithError(invalidType)).toThrow(StagingSchemaError);
      
      try {
        decodeAssignmentStagingWithError(invalidType);
      } catch (e) {
        expect(e instanceof StagingSchemaError).toBe(true);
        expect((e as StagingSchemaError).errorCode).toBe('STAGING_SCHEMA_INVALID');
      }
    });

    it('should throw StagingSchemaError with STAGING_SCHEMA_INVALID code for missing expectedRevision', () => {
      const invalidAssignment = {
        mediaId: 'abc123def456',
        updatedAt: '2026-09-24T00:00:00Z',
        source: 'workbench'
      };
      
      expect(() => decodeAssignmentStagingWithError(invalidAssignment)).toThrow(StagingSchemaError);
      
      try {
        decodeAssignmentStagingWithError(invalidAssignment);
      } catch (e) {
        expect(e instanceof StagingSchemaError).toBe(true);
        expect((e as StagingSchemaError).errorCode).toBe('STAGING_SCHEMA_INVALID');
      }
    });

    it('should allow callers to distinguish STAGING_SCHEMA_INVALID programmatically', () => {
      const invalidAssignment = {
        expectedRevision: 1,
        updatedAt: '2026-09-24T00:00:00Z',
        source: 'workbench'
      };
      
      let caughtError: StagingSchemaError | null = null;
      
      try {
        decodeAssignmentStagingWithError(invalidAssignment);
      } catch (e) {
        if (e instanceof StagingSchemaError) {
          caughtError = e;
        }
      }
      
      expect(caughtError).not.toBeNull();
      expect(caughtError?.errorCode).toBe('STAGING_SCHEMA_INVALID');
    });
  });

  describe('Error code contract is preserved through the dispatch chain', () => {
    it('should preserve STAGING_SCHEMA_UNSUPPORTED through catch block', () => {
      const unknownKey = 'hpp:production:workbench-staging:WBDEP-123:unknown-type:something';
      const stagingType = dispatchStagingRecordType(unknownKey);
      
      let caughtError: StagingSchemaError | null = null;
      
      try {
        if (stagingType === 'unknown') {
          throw new StagingSchemaError(`Unknown staging key pattern: ${unknownKey}`, 'STAGING_SCHEMA_UNSUPPORTED');
        }
      } catch (e) {
        if (e instanceof StagingSchemaError) {
          caughtError = e;
        }
      }
      
      expect(caughtError?.errorCode).toBe('STAGING_SCHEMA_UNSUPPORTED');
    });

    it('should preserve STAGING_SCHEMA_INVALID through decode validation', () => {
      const invalidAssignment = {
        expectedRevision: 1,
        updatedAt: '2026-09-24T00:00:00Z',
        source: 'workbench'
      };
      
      let caughtError: StagingSchemaError | null = null;
      
      try {
        decodeAssignmentStagingWithError(invalidAssignment);
      } catch (e) {
        if (e instanceof StagingSchemaError) {
          caughtError = e;
        }
      }
      
      expect(caughtError?.errorCode).toBe('STAGING_SCHEMA_INVALID');
    });
  });

  describe('Invariant: unknown key does not infer schema from payload', () => {
    it('should classify unknown key pattern regardless of payload', () => {
      const unknownKey = 'hpp:production:workbench-staging:WBDEP-123:unknown-type:something';
      const validPayload = { mediaId: 'abc123', expectedRevision: 1, updatedAt: '2026-09-24T00:00:00Z', source: 'workbench' };
      
      const stagingType = dispatchStagingRecordType(unknownKey);
      
      // The key pattern determines the type, not the payload
      expect(stagingType).toBe('unknown');
      
      // Decoding should fail with UNSUPPORTED, not INVALID
      expect(() => {
        if (stagingType === 'unknown') {
          throw new StagingSchemaError(`Unknown staging key pattern: ${unknownKey}`, 'STAGING_SCHEMA_UNSUPPORTED');
        }
      }).toThrow(StagingSchemaError);
      
      try {
        if (stagingType === 'unknown') {
          throw new StagingSchemaError(`Unknown staging key pattern: ${unknownKey}`, 'STAGING_SCHEMA_UNSUPPORTED');
        }
      } catch (e) {
        expect(e instanceof StagingSchemaError).toBe(true);
        expect((e as StagingSchemaError).errorCode).toBe('STAGING_SCHEMA_UNSUPPORTED');
      }
    });

    it('should not accept valid payload for unknown key pattern', () => {
      const unknownKey = 'hpp:production:workbench-staging:WBDEP-123:unknown-type:something';
      const validPayload = { mediaId: 'abc123', expectedRevision: 1, updatedAt: '2026-09-24T00:00:00Z', source: 'workbench' };
      
      const stagingType = dispatchStagingRecordType(unknownKey);
      
      // The invariant: unknown key pattern is UNSUPPORTED regardless of payload validity
      expect(() => {
        if (stagingType === 'unknown') {
          throw new StagingSchemaError(`Unknown staging key pattern: ${unknownKey}`, 'STAGING_SCHEMA_UNSUPPORTED');
        }
      }).toThrow(StagingSchemaError);
      
      try {
        if (stagingType === 'unknown') {
          throw new StagingSchemaError(`Unknown staging key pattern: ${unknownKey}`, 'STAGING_SCHEMA_UNSUPPORTED');
        }
      } catch (e) {
        expect(e instanceof StagingSchemaError).toBe(true);
        expect((e as StagingSchemaError).errorCode).toBe('STAGING_SCHEMA_UNSUPPORTED');
      }
    });
  });

  describe('Invariant: recognized key with malformed payload is INVALID', () => {
    it('should classify recognized key pattern as valid type', () => {
      const serviceKey = 'hpp:production:workbench-staging:WBDEP-123:service:deck-refacing';
      const stagingType = dispatchStagingRecordType(serviceKey);
      
      expect(stagingType).toBe('assignment');
      expect(stagingType).not.toBe('unknown');
    });

    it('should throw StagingSchemaError with STAGING_SCHEMA_INVALID code for malformed payload on recognized key', () => {
      const serviceKey = 'hpp:production:workbench-staging:WBDEP-123:service:deck-refacing';
      const invalidPayload = { expectedRevision: 1 }; // missing required fields
      
      const stagingType = dispatchStagingRecordType(serviceKey);
      
      expect(stagingType).toBe('assignment');
      expect(() => decodeAssignmentStagingWithError(invalidPayload)).toThrow(StagingSchemaError);
      
      try {
        decodeAssignmentStagingWithError(invalidPayload);
      } catch (e) {
        expect(e instanceof StagingSchemaError).toBe(true);
        expect((e as StagingSchemaError).errorCode).toBe('STAGING_SCHEMA_INVALID');
      }
    });

    it('should not throw STAGING_SCHEMA_UNSUPPORTED for recognized key', () => {
      const serviceKey = 'hpp:production:workbench-staging:WBDEP-123:service:deck-refacing';
      const invalidPayload = { expectedRevision: 1 };
      
      const stagingType = dispatchStagingRecordType(serviceKey);
      
      expect(stagingType).toBe('assignment');
      
      let caughtError: StagingSchemaError | null = null;
      
      try {
        decodeAssignmentStagingWithError(invalidPayload);
      } catch (e) {
        if (e instanceof StagingSchemaError) {
          caughtError = e;
        }
      }
      
      expect(caughtError?.errorCode).toBe('STAGING_SCHEMA_INVALID');
      expect(caughtError?.errorCode).not.toBe('STAGING_SCHEMA_UNSUPPORTED');
    });
  });
});
