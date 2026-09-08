/**
 * Effective Project Gallery Authority
 *
 * Combines deployed project gallery with staged mutations (production)
 * to provide the single authoritative ordered gallery for projection.
 *
 * Architecture:
 * - Immutable media identity: PublishedMediaAsset
 * - Mutable editorial ordering: project.media.gallery[]
 * - Production staging: Redis KV mutations
 * - Effective authority: deployed + staged (merged)
 *
 * This resolver ensures the website projection always sees the current
 * editorial state, whether it's the deployed baseline or staged mutations.
 */

import { loadProjectsManifest } from './projects';
import { getKvNamespace } from './environment';
import { Redis } from '@upstash/redis';

const WORKBENCH_STAGING_PREFIX = 'workbench-staging:';

/**
 * Get the effective project gallery (deployed + staged mutations)
 *
 * This is the single authoritative source for gallery ordering.
 * In production, it merges the deployed baseline with staged KV mutations.
 * In development, it returns the deployed baseline directly.
 *
 * P0 FIX: Filters out invalid/null/empty gallery IDs to prevent UI rendering errors
 *
 * @param projectId - The project ID
 * @returns The effective ordered gallery array (media IDs)
 */
export async function getEffectiveProjectGallery(projectId: string): Promise<string[]> {
  const manifest = loadProjectsManifest();
  const project = manifest.projects.find((p: any) => p.id === projectId);
  
  if (!project) {
    console.error('[EFFECTIVE_GALLERY] PROJECT_NOT_FOUND', { projectId });
    return [];
  }

  // Baseline gallery from deployed projects.v1.json
  const baselineGallery = project.media?.gallery || [];
  const baselineRevision = project.media?.galleryRevision || 0;

  console.log('[EFFECTIVE_GALLERY] BASELINE_LOADED', {
    projectId,
    baselineGalleryLength: baselineGallery.length,
    baselineRevision,
  });

  // P0 FIX: Filter out invalid/null/empty gallery IDs at the source
  const validBaselineGallery = baselineGallery.filter((id: any) => {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.warn('[EFFECTIVE_GALLERY] FILTERING_INVALID_GALLERY_ID', {
        projectId,
        invalidId: id,
        reason: !id ? 'null/undefined' : typeof id !== 'string' ? 'not a string' : 'empty string',
      });
      return false;
    }
    return true;
  });

  if (validBaselineGallery.length !== baselineGallery.length) {
    console.warn('[EFFECTIVE_GALLERY] FILTERED_INVALID_IDS', {
      projectId,
      originalLength: baselineGallery.length,
      filteredLength: validBaselineGallery.length,
      removedCount: baselineGallery.length - validBaselineGallery.length,
    });
  }

  // In production, check for staged mutations
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!isProduction) {
    console.log('[EFFECTIVE_GALLERY] DEV_MODE - Returning filtered baseline', {
      projectId,
      galleryLength: validBaselineGallery.length,
    });
    return validBaselineGallery;
  }

  // Production: Check for staged KV mutations
  const redis = getRedisClient();
  if (!redis) {
    console.warn('[EFFECTIVE_GALLERY] REDIS_UNAVAILABLE - Returning filtered baseline', {
      projectId,
      reason: 'KV credentials not configured or Redis unavailable',
    });
    return validBaselineGallery;
  }

  try {
    // Check if there's a current staged transaction for this project
    const projectStagingKey = `${getKvNamespace()}${WORKBENCH_STAGING_PREFIX}project:${projectId}:current-transaction`;
    const currentStagedTransactionId = await redis.get(projectStagingKey);
    
    if (!currentStagedTransactionId || typeof currentStagedTransactionId !== 'string') {
      console.log('[EFFECTIVE_GALLERY] NO_STAGED_MUTATION - Returning filtered baseline', {
        projectId,
        projectStagingKey,
      });
      return validBaselineGallery;
    }

    // Load the specific staged transaction
    const specificStagingKey = `${getKvNamespace()}${WORKBENCH_STAGING_PREFIX}${currentStagedTransactionId}:project:${projectId}:gallery`;
    const stagedData = await redis.get(specificStagingKey);
    
    if (!stagedData || typeof stagedData !== 'string') {
      console.warn('[EFFECTIVE_GALLERY] STAGED_DATA_INVALID - Returning filtered baseline', {
        projectId,
        specificStagingKey,
        reason: 'Staged data is null or invalid',
      });
      return validBaselineGallery;
    }

    const parsed = JSON.parse(stagedData);
    const stagedGallery = parsed.gallery;
    const stagedRevision = parsed.currentRevision;

    console.log('[EFFECTIVE_GALLERY] STAGED_MUTATION_APPLIED', {
      projectId,
      baselineGalleryLength: validBaselineGallery.length,
      stagedGalleryLength: stagedGallery.length,
      baselineRevision,
      stagedRevision,
      transactionId: currentStagedTransactionId,
    });

    // Validate staged gallery structure
    if (!Array.isArray(stagedGallery)) {
      console.error('[EFFECTIVE_GALLERY] STAGED_GALLERY_INVALID - Returning filtered baseline', {
        projectId,
        reason: 'Staged gallery is not an array',
      });
      return validBaselineGallery;
    }

    // Validate no duplicates
    const uniqueStaged = new Set(stagedGallery);
    if (uniqueStaged.size !== stagedGallery.length) {
      console.error('[EFFECTIVE_GALLERY] STAGED_GALLERY_DUPLICATES - Returning filtered baseline', {
        projectId,
        reason: 'Staged gallery contains duplicates',
      });
      return validBaselineGallery;
    }

    // Validate no null/undefined
    if (stagedGallery.some(id => id === null || id === undefined)) {
      console.error('[EFFECTIVE_GALLERY] STAGED_GALLERY_NULL_VALUES - Returning filtered baseline', {
        projectId,
        reason: 'Staged gallery contains null/undefined values',
      });
      return validBaselineGallery;
    }

    // Validate no empty strings
    if (stagedGallery.some(id => typeof id === 'string' && id.trim() === '')) {
      console.error('[EFFECTIVE_GALLERY] STAGED_GALLERY_EMPTY_STRINGS - Returning filtered baseline', {
        projectId,
        reason: 'Staged gallery contains empty strings',
      });
      return validBaselineGallery;
    }

    // P0 FIX: Filter staged gallery for invalid IDs as well
    const validStagedGallery = stagedGallery.filter((id: any) => {
      if (!id || typeof id !== 'string' || id.trim() === '') {
        console.warn('[EFFECTIVE_GALLERY] FILTERING_INVALID_STAGED_ID', {
          projectId,
          invalidId: id,
          reason: !id ? 'null/undefined' : typeof id !== 'string' ? 'not a string' : 'empty string',
        });
        return false;
      }
      return true;
    });

    if (validStagedGallery.length !== stagedGallery.length) {
      console.warn('[EFFECTIVE_GALLERY] FILTERED_STAGED_INVALID_IDS', {
        projectId,
        originalLength: stagedGallery.length,
        filteredLength: validStagedGallery.length,
        removedCount: stagedGallery.length - validStagedGallery.length,
      });
    }

    // Staged gallery is valid - return it as the effective authority
    return validStagedGallery;
  } catch (error) {
    console.error('[EFFECTIVE_GALLERY] STAGED_MUTATION_ERROR - Returning filtered baseline', {
      projectId,
      error: error instanceof Error ? error.message : String(error),
    });
    return validBaselineGallery;
  }
}

/**
 * Get Redis client for KV access
 */
function getRedisClient(): Redis | null {
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return null;
    return new Redis({ url, token });
  } catch {
    return null;
  }
}
