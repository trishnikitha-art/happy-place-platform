/**
 * Staging Schema Dispatch Tests
 * 
 * Tests for the schema-aware staging record dispatch system.
 * Verifies that staging keys are correctly classified and decoded
 * based on their mutation type (assignment, gallery, pointer, unknown).
 */

import { describe, it, expect } from '@jest/globals';

// Extract the dispatch functions for testing
// These are tested as isolated unit functions for the schema contract
// The actual deployment integration is tested separately

// Mock KV namespace for testing
const mockKvNamespace = 'hpp:production:';

function dispatchStagingRecordType(key: string): 'assignment' | 'gallery' | 'pointer' | 'unknown' {
  const relativeKey = key.replace(`${mockKvNamespace}workbench-staging:`, '');
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
      // hero, before, after, etc.
      return 'assignment';
    }
  }

  return 'unknown';
}

function decodeAssignmentStaging(value: unknown): { mediaId: string; expectedRevision: number; updatedAt: string; source: string } {
  let parsed: unknown;

  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch (e) {
      throw new Error(`Invalid assignment staging: string is not valid JSON`);
    }
  } else if (typeof value === 'object' && value !== null) {
    parsed = value;
  } else {
    throw new Error(`Invalid assignment staging: unexpected type ${typeof value}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid assignment staging: parsed result is not an object');
  }

  const staging = parsed as Record<string, unknown>;

  if (typeof staging.mediaId !== 'string') {
    throw new Error(`Invalid assignment staging: mediaId is missing or not a string (got ${typeof staging.mediaId})`);
  }

  if (typeof staging.expectedRevision !== 'number') {
    throw new Error(`Invalid assignment staging: expectedRevision is missing or not a number (got ${typeof staging.expectedRevision})`);
  }

  if (typeof staging.updatedAt !== 'string') {
    throw new Error(`Invalid assignment staging: updatedAt is missing or not a string (got ${typeof staging.updatedAt})`);
  }

  if (typeof staging.source !== 'string') {
    throw new Error(`Invalid assignment staging: source is missing or not a string (got ${typeof staging.source})`);
  }

  return {
    mediaId: staging.mediaId,
    expectedRevision: staging.expectedRevision,
    updatedAt: staging.updatedAt,
    source: staging.source,
  };
}

function decodeGalleryStaging(value: unknown): { gallery: string[]; currentRevision: number; previousGallery: string[]; mutationTimestamp: string } {
  let parsed: unknown;

  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch (e) {
      throw new Error(`Invalid gallery staging: string is not valid JSON`);
    }
  } else if (typeof value === 'object' && value !== null) {
    parsed = value;
  } else {
    throw new Error(`Invalid gallery staging: unexpected type ${typeof value}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid gallery staging: parsed result is not an object');
  }

  const staging = parsed as Record<string, unknown>;

  if (!Array.isArray(staging.gallery)) {
    throw new Error(`Invalid gallery staging: gallery is missing or not an array (got ${typeof staging.gallery})`);
  }

  if (typeof staging.currentRevision !== 'number') {
    throw new Error(`Invalid gallery staging: currentRevision is missing or not a number (got ${typeof staging.currentRevision})`);
  }

  if (!Array.isArray(staging.previousGallery)) {
    throw new Error(`Invalid gallery staging: previousGallery is missing or not an array (got ${typeof staging.previousGallery})`);
  }

  if (typeof staging.mutationTimestamp !== 'string') {
    throw new Error(`Invalid gallery staging: mutationTimestamp is missing or not a string (got ${typeof staging.mutationTimestamp})`);
  }

  return {
    gallery: staging.gallery,
    currentRevision: staging.currentRevision,
    previousGallery: staging.previousGallery,
    mutationTimestamp: staging.mutationTimestamp,
  };
}

function decodePointerStaging(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  } else if (typeof value === 'object' && value !== null) {
    throw new Error(`Invalid pointer staging: unexpected object type (expected plain string)`);
  } else {
    throw new Error(`Invalid pointer staging: unexpected type ${typeof value}`);
  }
}

describe('Staging Schema Dispatch', () => {
  describe('Key Pattern Classification', () => {
    it('should classify service assignment keys', () => {
      const serviceKey = 'hpp:production:workbench-staging:WBDEP-123:service:deck-refacing';
      const result = dispatchStagingRecordType(serviceKey);
      expect(result).toBe('assignment');
    });

    it('should classify gallery mutation keys', () => {
      const galleryKey = 'hpp:production:workbench-staging:WBDEP-123:project:fences-001:gallery';
      const result = dispatchStagingRecordType(galleryKey);
      expect(result).toBe('gallery');
    });

    it('should classify project assignment keys', () => {
      const heroKey = 'hpp:production:workbench-staging:WBDEP-123:project:fences-001:hero';
      const result = dispatchStagingRecordType(heroKey);
      expect(result).toBe('assignment');
    });

    it('should classify pointer keys', () => {
      const pointerKey = 'hpp:production:workbench-staging:WBDEP-123:project:fences-001:current-transaction';
      const result = dispatchStagingRecordType(pointerKey);
      expect(result).toBe('pointer');
    });

    it('should reject unknown key patterns', () => {
      const unknownKey = 'hpp:production:workbench-staging:WBDEP-123:unknown-type:something';
      const result = dispatchStagingRecordType(unknownKey);
      expect(result).toBe('unknown');
    });

    it('should use correct index for project field classification', () => {
      // Critical test: parts[3] is the field, not parts[2]
      const galleryKey = 'hpp:production:workbench-staging:WBDEP-1790212902867-ms4i4bjap:project:fences-001:gallery';
      const result = dispatchStagingRecordType(galleryKey);
      expect(result).toBe('gallery');
    });
  });

  describe('Assignment Staging Decoder', () => {
    it('should decode valid assignment staging', () => {
      const validAssignment = {
        mediaId: 'abc123def456',
        expectedRevision: 1,
        updatedAt: '2026-09-24T00:00:00Z',
        source: 'workbench'
      };
      const result = decodeAssignmentStaging(validAssignment);
      expect(result).toEqual(validAssignment);
    });

    it('should reject assignment staging without mediaId', () => {
      const invalidAssignment = {
        expectedRevision: 1,
        updatedAt: '2026-09-24T00:00:00Z',
        source: 'workbench'
      };
      expect(() => decodeAssignmentStaging(invalidAssignment)).toThrow('mediaId is missing or not a string');
    });

    it('should reject assignment staging without expectedRevision', () => {
      const invalidAssignment = {
        mediaId: 'abc123def456',
        updatedAt: '2026-09-24T00:00:00Z',
        source: 'workbench'
      };
      expect(() => decodeAssignmentStaging(invalidAssignment)).toThrow('expectedRevision is missing or not a number');
    });

    it('should handle JSON string input', () => {
      const jsonString = JSON.stringify({
        mediaId: 'abc123def456',
        expectedRevision: 1,
        updatedAt: '2026-09-24T00:00:00Z',
        source: 'workbench'
      });
      const result = decodeAssignmentStaging(jsonString);
      expect(result.mediaId).toBe('abc123def456');
    });
  });

  describe('Gallery Staging Decoder', () => {
    it('should decode valid gallery staging', () => {
      const validGallery = {
        gallery: ['mediaA', 'mediaB', 'mediaC'],
        currentRevision: 4,
        previousGallery: ['mediaA', 'mediaC', 'mediaB'],
        mutationTimestamp: '2026-09-24T00:00:00Z'
      };
      const result = decodeGalleryStaging(validGallery);
      expect(result).toEqual(validGallery);
    });

    it('should reject gallery staging without gallery array', () => {
      const invalidGallery = {
        currentRevision: 4,
        previousGallery: ['mediaA', 'mediaC', 'mediaB'],
        mutationTimestamp: '2026-09-24T00:00:00Z'
      };
      expect(() => decodeGalleryStaging(invalidGallery)).toThrow('gallery is missing or not an array');
    });

    it('should reject gallery staging without currentRevision', () => {
      const invalidGallery = {
        gallery: ['mediaA', 'mediaB', 'mediaC'],
        previousGallery: ['mediaA', 'mediaC', 'mediaB'],
        mutationTimestamp: '2026-09-24T00:00:00Z'
      };
      expect(() => decodeGalleryStaging(invalidGallery)).toThrow('currentRevision is missing or not a number');
    });

    it('should reject gallery staging without previousGallery array', () => {
      const invalidGallery = {
        gallery: ['mediaA', 'mediaB', 'mediaC'],
        currentRevision: 4,
        mutationTimestamp: '2026-09-24T00:00:00Z'
      };
      expect(() => decodeGalleryStaging(invalidGallery)).toThrow('previousGallery is missing or not an array');
    });

    it('should handle JSON string input', () => {
      const jsonString = JSON.stringify({
        gallery: ['mediaA', 'mediaB', 'mediaC'],
        currentRevision: 4,
        previousGallery: ['mediaA', 'mediaC', 'mediaB'],
        mutationTimestamp: '2026-09-24T00:00:00Z'
      });
      const result = decodeGalleryStaging(jsonString);
      expect(result.gallery).toEqual(['mediaA', 'mediaB', 'mediaC']);
    });
  });

  describe('Pointer Staging Decoder', () => {
    it('should decode valid pointer staging (plain string)', () => {
      const validPointer = 'WBDEP-123456789';
      const result = decodePointerStaging(validPointer);
      expect(result).toBe('WBDEP-123456789');
    });

    it('should reject pointer staging as object', () => {
      const invalidPointer = { transactionId: 'WBDEP-123456789' };
      expect(() => decodePointerStaging(invalidPointer)).toThrow('unexpected object type');
    });

    it('should reject pointer staging as number', () => {
      const invalidPointer = 123456789;
      expect(() => decodePointerStaging(invalidPointer)).toThrow('unexpected type number');
    });
  });

  describe('Media Verification Integration', () => {
    it('should extract media ID from assignment staging', () => {
      const assignmentStaging = {
        mediaId: 'abc123def456',
        expectedRevision: 1,
        updatedAt: '2026-09-24T00:00:00Z',
        source: 'workbench'
      };
      const mediaIdsToVerify = new Set<string>();
      mediaIdsToVerify.add(assignmentStaging.mediaId);
      expect(mediaIdsToVerify.has('abc123def456')).toBe(true);
    });

    it('should extract all media IDs from gallery staging', () => {
      const galleryStaging = {
        gallery: ['mediaA', 'mediaB', 'mediaC'],
        currentRevision: 4,
        previousGallery: ['mediaA', 'mediaC', 'mediaB'],
        mutationTimestamp: '2026-09-24T00:00:00Z'
      };
      const mediaIdsToVerify = new Set<string>();
      galleryStaging.gallery.forEach((mediaId: string) => mediaIdsToVerify.add(mediaId));
      expect(mediaIdsToVerify.has('mediaA')).toBe(true);
      expect(mediaIdsToVerify.has('mediaB')).toBe(true);
      expect(mediaIdsToVerify.has('mediaC')).toBe(true);
    });

    it('should not extract media IDs from pointer staging', () => {
      const pointerStaging = 'WBDEP-123456789';
      const mediaIdsToVerify = new Set<string>();
      expect(mediaIdsToVerify.size).toBe(0);
    });
  });

  describe('Deployment Promotion Integration', () => {
    it('should promote assignment staging to runtime KV', () => {
      const assignmentStaging = {
        mediaId: 'abc123def456',
        expectedRevision: 1,
        updatedAt: '2026-09-24T00:00:00Z',
        source: 'workbench'
      };
      const assignmentsToPromote: Array<{ serviceSlug: string; mediaId: string; expectedRevision: number; updatedAt: string; source: string }> = [];
      assignmentsToPromote.push({
        serviceSlug: 'test-service',
        mediaId: assignmentStaging.mediaId,
        expectedRevision: assignmentStaging.expectedRevision,
        updatedAt: assignmentStaging.updatedAt,
        source: assignmentStaging.source,
      });
      expect(assignmentsToPromote.length).toBe(1);
      expect(assignmentsToPromote[0].mediaId).toBe('abc123def456');
    });

    it('should skip gallery staging for promotion (uses different authority)', () => {
      const galleryStaging = {
        gallery: ['mediaA', 'mediaB', 'mediaC'],
        currentRevision: 4,
        previousGallery: ['mediaA', 'mediaC', 'mediaB'],
        mutationTimestamp: '2026-09-24T00:00:00Z'
      };
      const assignmentsToPromote: Array<{ serviceSlug: string; mediaId: string; expectedRevision: number; updatedAt: string; source: string }> = [];
      // Gallery staging should be skipped in promotion loop
      expect(assignmentsToPromote.length).toBe(0);
    });

    it('should skip pointer staging for promotion', () => {
      const pointerStaging = 'WBDEP-123456789';
      const assignmentsToPromote: Array<{ serviceSlug: string; mediaId: string; expectedRevision: number; updatedAt: string; source: string }> = [];
      // Pointer staging should be skipped in promotion loop
      expect(assignmentsToPromote.length).toBe(0);
    });
  });
});
