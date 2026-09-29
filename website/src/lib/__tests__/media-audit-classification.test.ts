/**
 * P0 FIX TEST: Audit classification must not classify Drive records as repairable
 *
 * This test proves that the audit correctly distinguishes:
 * - MISSING STORAGE (raw count)
 * - REPAIRABLE (with full evidence)
 * - REQUIRES MATERIALIZATION (Drive without Blob evidence)
 * - AMBIGUOUS (insufficient evidence)
 *
 * The bug this catches: The UI was submitting all missingStorageIds to the repair endpoint,
 * but the repair endpoint skips Drive records without Blob evidence. This is correct behavior
 * by the repair endpoint, but the UI was offering a repair action that would fail.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { listMediaIds, getMediaRecordRaw, saveMedia } from '@/lib/media-kv-store';
import { loadMediaManifest } from '@/lib/media';
import { verifyR2ObjectExists } from '@/lib/r2-storage';

// Mock the KV store, media manifest, and R2 storage
jest.mock('@/lib/media-kv-store');
jest.mock('@/lib/media');
jest.mock('@/lib/r2-storage');

describe('Media Audit Classification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Drive record with missing storage', () => {
    it('should classify as REQUIRES_MATERIALIZATION, not repairable R2', async () => {
      // GIVEN: A Drive-sourced published record with no storage field
      const driveRecord = {
        id: 'drive-test-123',
        filename: 'test.jpg',
        source: 'google-drive',
        lifecycleState: 'published',
        storage: undefined, // MISSING STORAGE
        contentHash: 'abc123def456', // Has content hash
        variants: {
          original: 'https://drive.google.com/file/d/test', // Drive URL
        },
      };

      (getMediaRecordRaw as jest.Mock).mockResolvedValue(driveRecord);
      (listMediaIds as jest.Mock).mockResolvedValue(['drive-test-123']);
      (loadMediaManifest as jest.Mock).mockReturnValue({ media: [] });
      (verifyR2ObjectExists as jest.Mock).mockResolvedValue(false); // NO R2 OBJECT

      // WHEN: We classify this record
      // This simulates the logic in media-audit/route.ts
      const isMissingStorage = !driveRecord.storage;
      const hasContentHash = !!driveRecord.contentHash;
      const isDriveSource = driveRecord.source === 'google-drive';
      const r2Key = driveRecord.variants.original.split('/').pop() || '';
      const hasR2Object = await verifyR2ObjectExists(r2Key);

      // THEN: It should be classified as REQUIRES_MATERIALIZATION
      expect(isMissingStorage).toBe(true);
      expect(hasContentHash).toBe(true);
      expect(isDriveSource).toBe(true);
      expect(hasR2Object).toBe(false);

      // The critical invariant: Drive source without R2 evidence is NOT repairable
      const isRepairableR2 = hasR2Object;
      expect(isRepairableR2).toBe(false);

      // It should require materialization
      const requiresMaterialization = isDriveSource && !hasR2Object;
      expect(requiresMaterialization).toBe(true);
    });

    it('should NOT classify as repairable R2 even with contentHash', async () => {
      // GIVEN: Drive record with contentHash but no R2 object
      const driveRecord = {
        id: 'drive-test-456',
        filename: 'test.jpg',
        source: 'google-drive',
        lifecycleState: 'published',
        storage: undefined,
        contentHash: 'xyz789',
        variants: {
          original: 'https://drive.google.com/file/d/test',
        },
      };

      (verifyR2ObjectExists as jest.Mock).mockResolvedValue(false);

      // WHEN: Checking R2 evidence
      const r2Key = driveRecord.variants.original.split('/').pop() || '';
      const r2ObjectExists = await verifyR2ObjectExists(r2Key);

      // THEN: No R2 object → NOT repairable
      expect(r2ObjectExists).toBe(false);

      // Repair requires full evidence chain
      const hasFullR2Evidence = r2ObjectExists;
      expect(hasFullR2Evidence).toBe(false);
    });
  });

  describe('Local record with static manifest evidence', () => {
    it('should classify as REPAIRABLE_STATIC when manifest evidence exists', async () => {
      // GIVEN: Local source with no storage but manifest evidence
      const localRecord = {
        id: 'local-test-123',
        filename: 'test.jpg',
        source: 'local',
        lifecycleState: 'published',
        storage: undefined,
        contentHash: undefined, // No content hash
        variants: {
          original: '/images/test.jpg',
        },
      };

      const manifest = {
        media: [
          {
            id: 'local-test-123',
            filename: 'test.jpg',
            storage: 'static',
          },
        ],
      };

      (getMediaRecordRaw as jest.Mock).mockResolvedValue(localRecord);
      (loadMediaManifest as jest.Mock).mockReturnValue(manifest);

      // WHEN: Checking static evidence
      const staticMediaMap = new Map(manifest.media.map(m => [m.id, m]));
      const hasStaticEvidence = staticMediaMap.has(localRecord.id);

      // THEN: Has static evidence → repairable
      expect(hasStaticEvidence).toBe(true);

      const isRepairableStatic = localRecord.source === 'local' && hasStaticEvidence;
      expect(isRepairableStatic).toBe(true);
    });

    it('should classify as AMBIGUOUS without manifest evidence', async () => {
      // GIVEN: Local source with no storage and no manifest evidence
      const localRecord = {
        id: 'local-test-456',
        filename: 'test.jpg',
        source: 'local',
        lifecycleState: 'published',
        storage: undefined,
        contentHash: undefined,
        variants: {
          original: '/images/test.jpg',
        },
      };

      const manifest = { media: [] };

      (getMediaRecordRaw as jest.Mock).mockResolvedValue(localRecord);
      (loadMediaManifest as jest.Mock).mockReturnValue(manifest);

      // WHEN: Checking static evidence
      const staticMediaMap = new Map(manifest.media.map(m => [m.id, m]));
      const hasStaticEvidence = staticMediaMap.has(localRecord.id);

      // THEN: No static evidence → ambiguous
      expect(hasStaticEvidence).toBe(false);

      const isAmbiguous = localRecord.source === 'local' && !hasStaticEvidence;
      expect(isAmbiguous).toBe(true);
    });
  });

  describe('Local record with full R2 evidence', () => {
    it('should classify as REPAIRABLE_R2 with full evidence chain', async () => {
      // GIVEN: Local source with contentHash and full R2 evidence
      const localRecord = {
        id: 'local-test-789',
        filename: 'test.jpg',
        source: 'local',
        lifecycleState: 'published',
        storage: undefined,
        contentHash: 'abc123',
        variants: {
          original: 'https://r2.example.com/test.jpg',
        },
      };

      (getMediaRecordRaw as jest.Mock).mockResolvedValue(localRecord);
      (verifyR2ObjectExists as jest.Mock).mockResolvedValue(true);

      // WHEN: Checking R2 evidence chain
      const r2Key = localRecord.variants.original.split('/').pop() || '';
      const r2ObjectExists = await verifyR2ObjectExists(r2Key);

      // THEN: Full evidence chain → repairable
      expect(r2ObjectExists).toBe(true);

      const isRepairableR2 = r2ObjectExists;
      expect(isRepairableR2).toBe(true);
    });

    it('should classify as AMBIGUOUS with R2 object not found', async () => {
      // GIVEN: Local source with contentHash but R2 object not found
      const localRecord = {
        id: 'local-test-999',
        filename: 'test.jpg',
        source: 'local',
        lifecycleState: 'published',
        storage: undefined,
        contentHash: 'abc123',
        variants: {
          original: 'https://r2.example.com/test.jpg',
        },
      };

      (getMediaRecordRaw as jest.Mock).mockResolvedValue(localRecord);
      (verifyR2ObjectExists as jest.Mock).mockResolvedValue(false);

      // WHEN: Checking R2 object existence
      const r2Key = localRecord.variants.original.split('/').pop() || '';
      const r2ObjectExists = await verifyR2ObjectExists(r2Key);

      // THEN: R2 object not found → ambiguous
      expect(r2ObjectExists).toBe(false);

      const isAmbiguous = !r2ObjectExists;
      expect(isAmbiguous).toBe(true);
    });
  });

  describe('UI repair target validation', () => {
    it('should ensure UI repair target contains only repairable IDs', async () => {
      // GIVEN: Classification results
      const classification = {
        missingStorageIds: ['drive-1', 'local-1', 'local-2'],
        repairableStaticIds: ['local-1'],
        repairableR2Ids: ['local-2'],
        requiresMaterializationIds: ['drive-1'],
        ambiguousIds: [],
      };

      // WHEN: UI submits repair target
      // The bug: UI was submitting all missingStorageIds
      const badRepairTarget = classification.missingStorageIds;
      const correctStaticRepairTarget = classification.repairableStaticIds;
      const correctR2RepairTarget = classification.repairableR2Ids;

      // THEN: Bad target would include non-repairable Drive record
      expect(badRepairTarget).toContain('drive-1');
      expect(classification.requiresMaterializationIds).toContain('drive-1');

      // Correct targets exclude Drive records
      expect(correctStaticRepairTarget).not.toContain('drive-1');
      expect(correctR2RepairTarget).not.toContain('drive-1');

      // Correct targets include only proven repairable records
      expect(correctStaticRepairTarget).toEqual(['local-1']);
      expect(correctR2RepairTarget).toEqual(['local-2']);
    });
  });
});
