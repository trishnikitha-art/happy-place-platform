/**
 * Regression test for P1 fix: Duplicate R2 existence check
 * 
 * This test verifies that isPubliclyComplete() does not perform duplicate
 * network requests for the same R2 object key. The original implementation
 * checked the original object twice:
 * 1. verifyR2ObjectExists(originalKey) for the original
 * 2. verifyR2RenditionCompleteness() which also checks the original
 * 
 * The fix removes the first check and lets verifyR2RenditionCompleteness()
 * handle all rendition checks including the original, ensuring each distinct
 * key is checked exactly once.
 */

import { hasMaterializationShape, hasRealContentHash, isPubliclyComplete } from '../media-contracts';
import type { Media } from '@/types/media';

// Mock R2 storage module
jest.mock('../r2-storage', () => ({
  verifyR2ObjectExists: jest.fn(),
  verifyR2RenditionCompleteness: jest.fn(),
}));

const { verifyR2ObjectExists, verifyR2RenditionCompleteness } = require('../r2-storage');

describe('media-contracts - R2 Deduplication Regression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Fixture shape note: hasMaterializationShape requires responsive
  // WebP+AVIF entries at every RESPONSIVE_WIDTHS entry <= dimensions.width
  // (RESPONSIVE_WIDTHS = [480, 768, 1080, 1600, 2000]). A width-768 fixture
  // therefore needs responsive entries at 480 and 768, webp+avif each.
  // The previous fixtures used width 1920 with only 768/1024 entries (and
  // responsive: [] for the throws case), so they failed the shape gate
  // before any R2 check ran and verifyR2RenditionCompleteness was never
  // called.

  it('should not call verifyR2ObjectExists when storage is not R2', async () => {
    const media: Media = {
      id: 'test-media',
      contentHash: 'real-hash-not-synthetic',
      lifecycleState: 'published',
      source: 'local',
      storage: 'static',
      variants: {
        original: '/static/test-original.jpg',
        thumbnail: '/static/test-thumb.jpg',
        blur: '/static/test-blur.jpg',
        webp: '/static/test.webp',
        avif: '/static/test.avif',
        responsive: [
          { width: 480, webp: '/static/test-480.webp', avif: '/static/test-480.avif' },
          { width: 768, webp: '/static/test-768.webp', avif: '/static/test-768.avif' },
        ],
      },
      dimensions: { width: 768, height: 432 },
    };

    const result = await isPubliclyComplete(media);

    expect(verifyR2ObjectExists).not.toHaveBeenCalled();
    expect(verifyR2RenditionCompleteness).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('should call verifyR2RenditionCompleteness exactly once for R2 storage', async () => {
    const media: Media = {
      id: 'test-media',
      contentHash: 'real-hash-not-synthetic',
      lifecycleState: 'published',
      source: 'local',
      storage: 'r2',
      variants: {
        original: 'https://r2.dev/bucket/abc123-original.jpg',
        thumbnail: 'https://r2.dev/bucket/def456-thumb.jpg',
        blur: 'https://r2.dev/bucket/ghi789-blur.jpg',
        webp: 'https://r2.dev/bucket/jkl012.webp',
        avif: 'https://r2.dev/bucket/mno345.avif',
        responsive: [
          { width: 480, webp: 'https://r2.dev/bucket/pqr678-480.webp', avif: 'https://r2.dev/bucket/stu901-480.avif' },
          { width: 768, webp: 'https://r2.dev/bucket/pqr678-768.webp', avif: 'https://r2.dev/bucket/stu901-768.avif' },
        ],
      },
      dimensions: { width: 768, height: 432 },
    };

    verifyR2RenditionCompleteness.mockResolvedValue({
      complete: true,
      details: {
        original: true,
        thumbnail: true,
        blur: true,
        webp: true,
        avif: true,
        responsive: [
          { width: 480, webp: true, avif: true },
          { width: 768, webp: true, avif: true },
        ],
      },
    });

    const result = await isPubliclyComplete(media);

    // P1 FIX: verifyR2ObjectExists should NOT be called (duplicate check removed)
    expect(verifyR2ObjectExists).not.toHaveBeenCalled();
    
    // verifyR2RenditionCompleteness should be called exactly once
    expect(verifyR2RenditionCompleteness).toHaveBeenCalledTimes(1);
    expect(verifyR2RenditionCompleteness).toHaveBeenCalledWith(media);
    
    expect(result).toBe(true);
  });

  it('should fail closed when verifyR2RenditionCompleteness reports incomplete', async () => {
    const media: Media = {
      id: 'test-media',
      contentHash: 'real-hash-not-synthetic',
      lifecycleState: 'published',
      source: 'local',
      storage: 'r2',
      variants: {
        original: 'https://r2.dev/bucket/abc123-original.jpg',
        thumbnail: 'https://r2.dev/bucket/def456-thumb.jpg',
        blur: 'https://r2.dev/bucket/ghi789-blur.jpg',
        webp: 'https://r2.dev/bucket/jkl012.webp',
        avif: 'https://r2.dev/bucket/mno345.avif',
        responsive: [
          { width: 480, webp: 'https://r2.dev/bucket/pqr678-480.webp', avif: 'https://r2.dev/bucket/stu901-480.avif' },
          { width: 768, webp: 'https://r2.dev/bucket/pqr678-768.webp', avif: 'https://r2.dev/bucket/stu901-768.avif' },
        ],
      },
      dimensions: { width: 768, height: 432 },
    };

    verifyR2RenditionCompleteness.mockResolvedValue({
      complete: false,
      details: {
        original: true,
        thumbnail: false, // Missing thumbnail
        blur: true,
        webp: true,
        avif: true,
        responsive: [
          { width: 480, webp: true, avif: true },
          { width: 768, webp: true, avif: true },
        ],
      },
    });

    const result = await isPubliclyComplete(media);

    expect(verifyR2ObjectExists).not.toHaveBeenCalled();
    expect(verifyR2RenditionCompleteness).toHaveBeenCalledTimes(1);
    expect(result).toBe(false);
  });

  it('should fail closed when verifyR2RenditionCompleteness throws error', async () => {
    const media: Media = {
      id: 'test-media',
      contentHash: 'real-hash-not-synthetic',
      lifecycleState: 'published',
      source: 'local',
      storage: 'r2',
      variants: {
        original: 'https://r2.dev/bucket/abc123-original.jpg',
        thumbnail: 'https://r2.dev/bucket/def456-thumb.jpg',
        blur: 'https://r2.dev/bucket/ghi789-blur.jpg',
        webp: 'https://r2.dev/bucket/jkl012.webp',
        avif: 'https://r2.dev/bucket/mno345.avif',
        responsive: [
          { width: 480, webp: 'https://r2.dev/bucket/pqr678-480.webp', avif: 'https://r2.dev/bucket/stu901-480.avif' },
          { width: 768, webp: 'https://r2.dev/bucket/pqr678-768.webp', avif: 'https://r2.dev/bucket/stu901-768.avif' },
        ],
      },
      dimensions: { width: 768, height: 432 },
    };

    verifyR2RenditionCompleteness.mockRejectedValue(new Error('R2 connection failed'));

    const result = await isPubliclyComplete(media);

    expect(verifyR2ObjectExists).not.toHaveBeenCalled();
    expect(verifyR2RenditionCompleteness).toHaveBeenCalledTimes(1);
    expect(result).toBe(false);
  });
});
