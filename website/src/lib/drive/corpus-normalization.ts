/**
 * Drive Corpus Identity Normalization
 *
 * Canonicalizes corpus identities to ensure consistent authorization across
 * discovery, browse, search, folder navigation, file authorization, and ingest.
 *
 * Canonical Model:
 * - My Drive corpus ID = "root"
 * - Shared Drive corpus ID = actual shared-drive-id
 * - Physical Google root ID = implementation detail
 *
 * Normalization Rules:
 * - My Drive physical root ID (0ANEhWTJ7VtPzUk9PVA) → "root"
 * - "root" → "root" (already canonical)
 * - Shared Drive IDs → passed through unchanged
 * - Folder IDs → passed through unchanged
 */

// Canonical My Drive corpus identity
export const MY_DRIVE_CANONICAL_ID = 'root';

// Known physical My Drive root IDs (Google implementation detail)
// These should be normalized to MY_DRIVE_CANONICAL_ID
const MY_DRIVE_PHYSICAL_ROOT_IDS = new Set([
  '0ANEhWTJ7VtPzUk9PVA', // Known Google My Drive root ID
  // Add other known physical root IDs if discovered
]);

/**
 * Normalize folder ID to canonical corpus identity
 * 
 * @param folderId - The folder ID from Drive API or UI
 * @param driveId - The driveId (Shared Drive ID or undefined for My Drive)
 * @returns Normalized corpus identity for authorization
 */
export function normalizeCorpusId(folderId: string | undefined, driveId: string | undefined): string {
  // If driveId is present, it's a Shared Drive - use driveId as corpus ID
  if (driveId) {
    return driveId;
  }

  // No driveId means My Drive context
  // Normalize physical root IDs to canonical "root"
  if (folderId && MY_DRIVE_PHYSICAL_ROOT_IDS.has(folderId)) {
    console.log('[CORPUS_NORMALIZATION] Physical root ID normalized to canonical', {
      physicalRootId: folderId,
      canonicalId: MY_DRIVE_CANONICAL_ID,
    });
    return MY_DRIVE_CANONICAL_ID;
  }

  // "root" is already canonical
  if (folderId === MY_DRIVE_CANONICAL_ID) {
    return MY_DRIVE_CANONICAL_ID;
  }

  // Regular folder IDs in My Drive - pass through unchanged
  // Authorization will validate they belong to My Drive corpus
  return folderId || MY_DRIVE_CANONICAL_ID;
}

/**
 * Check if a folder ID represents My Drive (canonical or physical)
 */
export function isMyDrive(folderId: string | undefined): boolean {
  if (!folderId) {
    return false;
  }

  return folderId === MY_DRIVE_CANONICAL_ID || MY_DRIVE_PHYSICAL_ROOT_IDS.has(folderId);
}

/**
 * Check if a corpus ID represents a Shared Drive
 */
export function isSharedDrive(corpusId: string | undefined): boolean {
  if (!corpusId) {
    return false;
  }

  return corpusId !== MY_DRIVE_CANONICAL_ID && !MY_DRIVE_PHYSICAL_ROOT_IDS.has(corpusId);
}
