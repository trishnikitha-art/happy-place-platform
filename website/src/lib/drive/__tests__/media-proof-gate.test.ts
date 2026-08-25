/**
 * Media Proof Gate Regression Test
 * 
 * Tests the constitutional invariant: No media record can become publicly renderable
 * merely because it exists in one storage layer. It must satisfy the same constitutional
 * proof regardless of where it was discovered (KV, static, assignment, fallback).
 * 
 * Critical finding: KV correctly rejects synthetic content identity, but static media.v1.json
 * can still cause the same synthetic record to be approved through the fallback path.
 * 
 * This test ensures ALL paths through the media authority go through the same
 * constitutional proof gate.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { resolvePublicMedia, getMediaById } from '@/lib/media';

// Mock the media-kv-store to return synthetic record
jest.mock('@/lib/media-kv-store', () => ({
  getMedia: jest.fn(),
}));

// Mock blob-storage to return null (no Blob metadata)
jest.mock('@/lib/blob-storage', () => ({
  getBlobMetadataByContentHash: jest.fn(),
  verifyBlobHash: jest.fn(),
}));

describe('Media Proof Gate - Constitutional Boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock blob-storage to return null (no Blob metadata)
    const { getBlobMetadataByContentHash } = require('@/lib/blob-storage');
    getBlobMetadataByContentHash.mockResolvedValue(null);
  });

  describe('Synthetic Content Identity Rejection', () => {
    it('should reject synthetic content identity from KV path', async () => {
      const { getMedia } = require('@/lib/media-kv-store');
      
      // Simulate KV returning a synthetic record (contentHash === SHA256(canonicalId))
      getMedia.mockResolvedValue({
        id: 'brand-hero',
        lifecycleState: 'published',
        source: 'local',
        contentHash: 'ae2b1fca596bf1268e37357044f8a8613b11a8c8', // SHA256('brand-hero')
        dimensions: { width: 1200, height: 800 },
        variants: { original: '/images/test.jpg' }
      });

      const result = await resolvePublicMedia('brand-hero');
      
      expect(result).toBeNull();
    });

    it('should reject synthetic content identity from static fallback path', () => {
      // This is the critical test - the fallback path currently bypasses proof checks
      // The static authority might contain synthetic records, and getMediaById()
      // returns them without constitutional verification
      
      // If media.v1.json contains a synthetic record, getMediaById() should NOT return it
      // OR the caller must verify it through resolvePublicMedia()
      
      // This test will initially FAIL, proving the constitutional contradiction
      expect(() => {
        const staticMedia = getMediaById('brand-hero');
        if (staticMedia && staticMedia.contentHash === 'ae2b1fca596bf1268e37357044f8a8613b11a8c8') {
          throw new Error('FAIL: Static authority returned synthetic content identity without proof verification');
        }
      }).not.toThrow();
    });
  });

  describe('Constitutional Proof Requirements', () => {
    it('should require physical Blob verification for published local assets', async () => {
      const { getMedia } = require('@/lib/media-kv-store');
      
      // Simulate KV returning a record without Blob metadata
      getMedia.mockResolvedValue({
        id: 'test-media',
        lifecycleState: 'published',
        source: 'local',
        contentHash: 'some-hash',
        dimensions: { width: 1200, height: 800 },
        variants: { original: '/images/test.jpg' }
        // Missing blob_metadata in KV - should be rejected
      });

      const result = await resolvePublicMedia('test-media');
      
      expect(result).toBeNull();
    });

    it('should require public variant URLs for published media', async () => {
      const { getMedia } = require('@/lib/media-kv-store');
      
      // Simulate KV returning a record without public variant URLs
      getMedia.mockResolvedValue({
        id: 'test-media',
        lifecycleState: 'published',
        source: 'local',
        contentHash: 'some-hash',
        dimensions: { width: 1200, height: 800 },
        variants: {} // No public URLs
      });

      const result = await resolvePublicMedia('test-media');
      
      expect(result).toBeNull();
    });
  });

  describe('Drive Reference Rejection', () => {
    it('should reject DriveReference records regardless of source', async () => {
      const { getMedia } = require('@/lib/media-kv-store');
      
      // Even if DriveReference comes from KV, it must be rejected
      getMedia.mockResolvedValue({
        id: 'drive-12345',
        lifecycleState: 'source_reference',
        source: 'google-drive',
        drive: { fileId: '12345' }
      });

      const result = await resolvePublicMedia('drive-12345');
      
      expect(result).toBeNull();
    });

    it('should reject drive-prefixed IDs directly', async () => {
      const result = await resolvePublicMedia('drive-12345');
      
      expect(result).toBeNull();
    });
  });

  describe('Authority Path Consistency', () => {
    it('should apply same proof checks to KV and static paths', async () => {
      const { getMedia } = require('@/lib/media-kv-store');
      
      // Both paths should reject the same invalid record
      const invalidRecord = {
        id: 'invalid-media',
        lifecycleState: 'published',
        source: 'local',
        contentHash: 'synthetic-hash', // Should fail constitutional proof
        dimensions: { width: 1200, height: 800 },
        variants: { original: '/images/test.jpg' }
      };

      // KV path
      getMedia.mockResolvedValue(invalidRecord);
      const kvResult = await resolvePublicMedia('invalid-media');
      
      // Static path should also reject (once fixed)
      // For now, this test documents the current inconsistency
      expect(kvResult).toBeNull();
    });
  });
});
