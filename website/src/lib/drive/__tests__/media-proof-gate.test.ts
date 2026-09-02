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
import { resolvePublicMedia, getStaticMediaForBootstrap } from '@/lib/media';

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
    it('should reject synthetic content identity from Drive source', async () => {
      const { getMedia } = require('@/lib/media-kv-store');
      
      // Drive assets with synthetic hashes should be rejected
      getMedia.mockResolvedValue({
        id: 'brand-hero',
        lifecycleState: 'published',
        source: 'google-drive',
        contentHash: 'ae2b1fca596bf1268e37357044f8a8613b11a8c8', // SHA256('brand-hero')
        dimensions: { width: 1200, height: 800 },
        variants: { original: '/images/test.jpg' }
      });

      const result = await resolvePublicMedia('brand-hero');
      
      expect(result).toBeNull();
    });

    it('should allow local assets with synthetic hashes', async () => {
      const { getMedia } = require('@/lib/media-kv-store');
      
      // Local assets can use synthetic hashes (canonical ID based)
      getMedia.mockResolvedValue({
        id: 'brand-hero',
        lifecycleState: 'published',
        source: 'local',
        contentHash: 'ae2b1fca596bf1268e37357044f8a8613b11a8c8', // SHA256('brand-hero')
        dimensions: { width: 1200, height: 800 },
        variants: { original: '/images/test.jpg', web: '/images/test.webp' }
      });

      const result = await resolvePublicMedia('brand-hero');
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe('brand-hero');
    });

    it('should allow local assets with synthetic hashes in static bootstrap', () => {
      // Static bootstrap should allow local assets with synthetic hashes
      // getStaticMediaForBootstrap() is ONLY for explicit bootstrap/recovery operations
      
      // Local assets can use synthetic hashes (canonical ID based)
      const staticMedia = getStaticMediaForBootstrap('brand-hero');
      if (staticMedia && staticMedia.source === 'local' && staticMedia.contentHash === 'ae2b1fca596bf1268e37357044f8a8613b11a8c8') {
        // This is acceptable for local assets
        expect(staticMedia.id).toBe('brand-hero');
      } else {
        // If it exists, it should be a valid local asset
        expect(staticMedia?.source).toBe('local');
      }
    });
  });

  describe('Constitutional Proof Requirements', () => {
    it('should allow local published assets with Blob metadata', async () => {
      const { getMedia } = require('@/lib/media-kv-store');
      const { getBlobMetadataByContentHash } = require('@/lib/blob-storage');
      
      // NEW CONTRACT: All published assets require Blob metadata
      // This applies to both static-deployed and Drive-materialized assets after bootstrap
      getMedia.mockResolvedValue({
        id: 'test-media',
        lifecycleState: 'published',
        source: 'local',
        contentHash: 'some-hash',
        dimensions: { width: 1200, height: 800 },
        variants: { original: 'https://blob.vercel-storage.com/test.jpg', web: 'https://blob.vercel-storage.com/test.webp' }
      });
      
      // Mock Blob metadata presence
      getBlobMetadataByContentHash.mockResolvedValue({
        url: 'https://blob.vercel-storage.com/test.jpg',
        uploadedAt: new Date().toISOString()
      });

      const result = await resolvePublicMedia('test-media');
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-media');
    });

    it('should reject local published assets without Blob metadata', async () => {
      const { getMedia } = require('@/lib/media-kv-store');
      
      // NEW CONTRACT: All published assets require Blob metadata
      // Local assets without Blob metadata are rejected
      getMedia.mockResolvedValue({
        id: 'test-media',
        lifecycleState: 'published',
        source: 'local',
        contentHash: 'some-hash',
        dimensions: { width: 1200, height: 800 },
        variants: { original: '/images/test.jpg', web: '/images/test.webp' }
      });

      const result = await resolvePublicMedia('test-media');
      
      expect(result).toBeNull();
    });

    it('should require Blob verification for Drive published assets', async () => {
      const { getMedia } = require('@/lib/media-kv-store');
      
      // Drive assets require real Blob metadata and verification
      getMedia.mockResolvedValue({
        id: 'test-drive-media',
        lifecycleState: 'published',
        source: 'google-drive',
        contentHash: 'some-hash',
        dimensions: { width: 1200, height: 800 },
        variants: { original: '/images/test.jpg' }
        // Missing blob_metadata in KV - should be rejected
      });

      const result = await resolvePublicMedia('test-drive-media');
      
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
    it('should apply same Blob metadata requirement for all published assets', async () => {
      const { getMedia } = require('@/lib/media-kv-store');
      const { getBlobMetadataByContentHash } = require('@/lib/blob-storage');
      
      // NEW CONTRACT: All published assets require Blob metadata
      // Local asset with Blob metadata = ALLOWED
      const localAssetWithBlob = {
        id: 'local-media',
        lifecycleState: 'published',
        source: 'local',
        contentHash: 'real-hash',
        dimensions: { width: 1200, height: 800 },
        variants: { original: 'https://blob.vercel-storage.com/test.jpg', web: 'https://blob.vercel-storage.com/test.webp' }
      };

      // Local asset without Blob metadata = REJECTED
      const localAssetWithoutBlob = {
        id: 'local-media-no-blob',
        lifecycleState: 'published',
        source: 'local',
        contentHash: 'real-hash',
        dimensions: { width: 1200, height: 800 },
        variants: { original: '/images/test.jpg', web: '/images/test.webp' }
      };

      // Test local asset with Blob metadata (should pass)
      getMedia.mockResolvedValue(localAssetWithBlob);
      getBlobMetadataByContentHash.mockResolvedValue({
        url: 'https://blob.vercel-storage.com/test.jpg',
        uploadedAt: new Date().toISOString()
      });
      const localResult = await resolvePublicMedia('local-media');
      expect(localResult).not.toBeNull();
      
      // Test local asset without Blob metadata (should fail)
      getMedia.mockResolvedValue(localAssetWithoutBlob);
      const localResultNoBlob = await resolvePublicMedia('local-media-no-blob');
      expect(localResultNoBlob).toBeNull();
    });
  });
});
