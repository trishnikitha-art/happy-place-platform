/**
 * Effective Project Gallery Authority
 *
 * Combines runtime gallery authority with visibility filtering to provide the single
 * authoritative ordered gallery for projection.
 *
 * CEO FIX: Runtime Authority Model (b724e3d alignment)
 * - Redis runtime authority: workbench-runtime-gallery:{projectId} = CURRENT committed gallery
 * - Staging pointer: workbench-staging:project:{projectId}:current-transaction = pending deployment
 * - Git/Vercel = durable projection (not authoritative for current state)
 *
 * OLD MODEL (now obsolete):
 * - Staging pointer → specific staging transaction → gallery
 * - This was fragile because staging gets consumed after deployment
 *
 * NEW MODEL (runtime-first):
 * - Read runtime authority FIRST (current committed state)
 * - Read staging pointer only for pending deployment information
 * - Fall back to projects.v1.json only for bootstrap/development
 *
 * Architecture:
 * - Immutable media identity: PublishedMediaAsset
 * - Mutable editorial ordering: runtime authority (galleryRevision)
 * - Mutable editorial visibility: workbench-visibility-gallery:{projectId} (visibilityRevision)
 * - Effective authority: runtime + visibility-filtered
 *
 * IMPORTANT: galleryRevision and visibilityRevision are INDEPENDENT authorities
 * - Gallery mutation increments galleryRevision
 * - Visibility mutation increments visibilityRevision
 * - They are NOT atomically coupled
 * - Visibility is independently authoritative and immediately public
 * - The public projection consumes (gallery state, visibility state) as independent inputs
 *
 * This resolver ensures the website projection always sees the current
 * editorial state from runtime authority, not stale staging or Git baseline.
 */

import { loadProjectsManifest } from './projects';
import { getKvNamespace, getEnvironment } from './environment';
import { Redis } from '@upstash/redis';

const WORKBENCH_STAGING_PREFIX = 'workbench-staging:';
const WORKBENCH_RUNTIME_PREFIX = 'workbench-runtime-gallery:';
const WORKBENCH_VISIBILITY_PREFIX = 'workbench-visibility-gallery:';

/**
 * Get runtime gallery key for a project
 */
function getRuntimeGalleryKey(projectId: string): string {
  const namespace = getKvNamespace();
  return `${namespace}${WORKBENCH_RUNTIME_PREFIX}${projectId}`;
}

/**
 * Get visibility key for a project
 */
function getVisibilityKey(projectId: string): string {
  const namespace = getKvNamespace();
  return `${namespace}${WORKBENCH_VISIBILITY_PREFIX}${projectId}`;
}

/**
 * Get the effective project gallery (runtime authority + visibility filter)
 *
 * CEO FIX: Runtime-first authority model (b724e3d alignment)
 * - Read runtime authority FIRST (current committed state)
 * - Read staging pointer only for pending deployment information
 * - Fall back to projects.v1.json only for bootstrap/development
 *
 * This is the single authoritative source for gallery ordering.
 * In production, it reads runtime Redis authority.
 * In development, it returns the deployed baseline directly.
 * In both modes, it applies visibility filtering (hidden items excluded).
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

  // Baseline gallery from deployed projects.v1.json (for bootstrap/development only)
  const baselineGallery = project.media?.gallery || [];
  const baselineRevision = project.media?.galleryRevision || 0;

  if (process.env.NODE_ENV === 'development') console.log('[EFFECTIVE_GALLERY] BASELINE_LOADED', {
    projectId,
    baselineGalleryLength: baselineGallery.length,
    baselineGalleryIds: baselineGallery,
    baselineRevision,
  });

  // In production, read runtime authority FIRST
  const environment = getEnvironment();
  const isProduction = environment === 'production';

  let effectiveGallery: string[];

  if (!isProduction) {
    if (process.env.NODE_ENV === 'development') console.log('[EFFECTIVE_GALLERY] DEV_MODE - Returning baseline', {
      projectId,
      environment,
      galleryLength: baselineGallery.length,
    });
    effectiveGallery = baselineGallery;
  } else {
    // Production: Read runtime authority FIRST (current committed state)
    const redis = getRedisClient();
    if (!redis) {
      console.warn('[EFFECTIVE_GALLERY] REDIS_UNAVAILABLE - Returning baseline', {
        projectId,
        reason: 'KV credentials not configured or Redis unavailable',
      });
      effectiveGallery = baselineGallery;
    } else {
      try {
        // CEO FIX: Read runtime authority FIRST (current committed state)
        const runtimeKey = getRuntimeGalleryKey(projectId);
        const runtimeData = await redis.get(runtimeKey);

        if (runtimeData) {
          // P0 FIX: Upstash automatically deserializes JSON objects
          // Accept both string (needs JSON.parse) and object (already parsed)
          let parsed: any;
          if (typeof runtimeData === 'string') {
            parsed = JSON.parse(runtimeData);
          } else if (typeof runtimeData === 'object') {
            parsed = runtimeData;
          } else {
            console.warn('[EFFECTIVE_GALLERY] RUNTIME_DATA_INVALID - Returning baseline', {
              projectId,
              runtimeKey,
              reason: `Runtime data has invalid type: ${typeof runtimeData}`,
            });
            effectiveGallery = baselineGallery;
          }

          const runtimeGallery = parsed.gallery;
          const runtimeRevision = parsed.currentRevision;
          const runtimeTransactionId = parsed.lastTransactionId;

          if (process.env.NODE_ENV === 'development') console.log('[EFFECTIVE_GALLERY] RUNTIME_AUTHORITY_APPLIED', {
            projectId,
            baselineGalleryLength: baselineGallery.length,
            runtimeGalleryLength: runtimeGallery.length,
            baselineRevision,
            runtimeRevision,
            runtimeTransactionId,
            source: 'runtime-authority',
          });

          // Validate runtime gallery structure
          if (!Array.isArray(runtimeGallery)) {
            console.error('[EFFECTIVE_GALLERY] RUNTIME_GALLERY_INVALID - Returning baseline', {
              projectId,
              reason: 'Runtime gallery is not an array',
            });
            effectiveGallery = baselineGallery;
          } else {
            // Validate no duplicates
            const uniqueRuntime = new Set(runtimeGallery);
            if (uniqueRuntime.size !== runtimeGallery.length) {
              console.error('[EFFECTIVE_GALLERY] RUNTIME_GALLERY_DUPLICATES - Returning baseline', {
                projectId,
                reason: 'Runtime gallery contains duplicates',
              });
              effectiveGallery = baselineGallery;
            } else {
              // Validate no null/undefined
              if (runtimeGallery.some(id => id === null || id === undefined)) {
                console.error('[EFFECTIVE_GALLERY] RUNTIME_GALLERY_NULL_VALUES - Returning baseline', {
                  projectId,
                  reason: 'Runtime gallery contains null/undefined values',
                });
                effectiveGallery = baselineGallery;
              } else {
                // Validate no empty strings
                if (runtimeGallery.some(id => typeof id === 'string' && id.trim() === '')) {
                  console.error('[EFFECTIVE_GALLERY] RUNTIME_GALLERY_EMPTY_STRINGS - Returning baseline', {
                    projectId,
                    reason: 'Runtime gallery contains empty strings',
                  });
                  effectiveGallery = baselineGallery;
                } else {
                  // Runtime gallery is valid
                  effectiveGallery = runtimeGallery;
                }
              }
            }
          }
        } else {
          // CEO FIX: Runtime authority not initialized - fall back to baseline
          // This is expected for projects that haven't been edited via Workbench yet
          if (process.env.NODE_ENV === 'development') console.log('[EFFECTIVE_GALLERY] RUNTIME_AUTHORITY_MISSING - Returning baseline', {
            projectId,
            runtimeKey,
            reason: 'Runtime authority not yet initialized (project not edited via Workbench)',
          });
          effectiveGallery = baselineGallery;
        }
      } catch (error) {
        console.error('[EFFECTIVE_GALLERY] RUNTIME_AUTHORITY_ERROR - Returning baseline', {
          projectId,
          error: error instanceof Error ? error.message : String(error),
        });
        effectiveGallery = baselineGallery;
      }
    }
  }

  // Apply visibility filter (hidden items) in both dev and production
  // CRITICAL: Distinguish missing authority from empty authority
  // - Valid initialized authority → apply it
  // - Explicit empty initialized authority → all gallery items visible
  // - Missing authority → FAIL CLOSED (initialization required)
  // - Malformed authority → FAIL CLOSED
  // - Redis unavailable → FAIL CLOSED
  // - Redis read error → FAIL CLOSED
  const redis = getRedisClient();
  if (redis) {
    try {
      const visibilityKey = getVisibilityKey(projectId);
      const visibilityData = await redis.get(visibilityKey);
      
      if (visibilityData) {
        let vParsed: any;
        if (typeof visibilityData === 'string') {
          vParsed = JSON.parse(visibilityData);
        } else if (typeof visibilityData === 'object') {
          vParsed = visibilityData;
        }
        
        // Validate schema version for initialized authority
        if (vParsed && vParsed.schemaVersion === 1 && vParsed.projectId === projectId) {
          // P0 FIX: Strict schema validation
          const hiddenGallery = vParsed.hiddenGallery;
          const visibilityRevision = vParsed.visibilityRevision;
          const initializedAt = vParsed.initializedAt;
          const lastMutationTimestamp = vParsed.lastMutationTimestamp;

          // Validate hiddenGallery is an array
          if (!Array.isArray(hiddenGallery)) {
            console.error('[EFFECTIVE_GALLERY] VISIBILITY_AUTHORITY_MALFORMED - FAILING_CLOSED', {
              projectId,
              reason: 'hiddenGallery is not an array',
            });
            return [];
          }

          // Validate all hiddenGallery items are non-empty strings
          for (const item of hiddenGallery) {
            if (typeof item !== 'string' || item.trim() === '') {
              console.error('[EFFECTIVE_GALLERY] VISIBILITY_AUTHORITY_MALFORMED - FAILING_CLOSED', {
                projectId,
                reason: 'hiddenGallery contains invalid item',
                item,
              });
              return [];
            }
          }

          // Validate no duplicates in hiddenGallery
          const uniqueHidden = new Set(hiddenGallery);
          if (uniqueHidden.size !== hiddenGallery.length) {
            console.error('[EFFECTIVE_GALLERY] VISIBILITY_AUTHORITY_MALFORMED - FAILING_CLOSED', {
              projectId,
              reason: 'hiddenGallery contains duplicates',
            });
            return [];
          }

          // Validate visibilityRevision is a non-negative integer
          if (typeof visibilityRevision !== 'number' || visibilityRevision < 0 || !Number.isInteger(visibilityRevision)) {
            console.error('[EFFECTIVE_GALLERY] VISIBILITY_AUTHORITY_MALFORMED - FAILING_CLOSED', {
              projectId,
              reason: 'visibilityRevision is invalid',
              visibilityRevision,
            });
            return [];
          }

          // Validate initializedAt is a valid timestamp string
          if (typeof initializedAt !== 'string' || isNaN(Date.parse(initializedAt))) {
            console.error('[EFFECTIVE_GALLERY] VISIBILITY_AUTHORITY_MALFORMED - FAILING_CLOSED', {
              projectId,
              reason: 'initializedAt is invalid',
              initializedAt,
            });
            return [];
          }

          // Validate lastMutationTimestamp is a valid timestamp string
          if (typeof lastMutationTimestamp !== 'string' || isNaN(Date.parse(lastMutationTimestamp))) {
            console.error('[EFFECTIVE_GALLERY] VISIBILITY_AUTHORITY_MALFORMED - FAILING_CLOSED', {
              projectId,
              reason: 'lastMutationTimestamp is invalid',
              lastMutationTimestamp,
            });
            return [];
          }

          // Valid authority - apply visibility filter
          const visibleGallery = effectiveGallery.filter((id: string) => !hiddenGallery.includes(id));
          
          if (process.env.NODE_ENV === 'development') console.log('[EFFECTIVE_GALLERY] VISIBILITY_FILTER_APPLIED', {
            projectId,
            totalGallery: effectiveGallery.length,
            hiddenCount: hiddenGallery.length,
            visibleCount: visibleGallery.length,
            hiddenIds: hiddenGallery,
            visibilityRevision,
          });
          
          return visibleGallery;
        } else {
          // Malformed authority - fail closed
          console.error('[EFFECTIVE_GALLERY] VISIBILITY_AUTHORITY_MALFORMED - FAILING_CLOSED', {
            projectId,
            hasSchemaVersion: !!vParsed?.schemaVersion,
            schemaVersion: vParsed?.schemaVersion,
            projectIdMatch: vParsed?.projectId === projectId,
            decision: 'Returning empty gallery to prevent accidental exposure',
          });
          return [];
        }
      } else {
        // Missing authority - self-heal in production by initializing empty visibility authority
        const environment = getEnvironment();
        if (environment === 'production') {
          if (process.env.NODE_ENV === 'development') console.log('[EFFECTIVE_GALLERY] VISIBILITY_AUTHORITY_MISSING - SELF_HEALING', {
            projectId,
            visibilityKey,
            decision: 'Initializing empty visibility authority to restore gallery',
          });

          // Atomically initialize empty visibility authority
          const initPayload = {
            schemaVersion: 1,
            projectId,
            hiddenGallery: [],
            visibilityRevision: 0,
            initializedAt: new Date().toISOString(),
            lastMutationTimestamp: new Date().toISOString(),
          };

          // Use NX (create-if-absent) to prevent race conditions
          const setResult = await redis.set(visibilityKey, initPayload, { nx: true });

          if (!setResult) {
            // Another process initialized it - re-read and use that
            const reloadedVisibility = await redis.get(visibilityKey);
            if (reloadedVisibility) {
              let vParsed: any;
              if (typeof reloadedVisibility === 'string') {
                vParsed = JSON.parse(reloadedVisibility);
              } else if (typeof reloadedVisibility === 'object') {
                vParsed = reloadedVisibility;
              }

              if (vParsed && vParsed.schemaVersion === 1 && vParsed.projectId === projectId) {
                if (process.env.NODE_ENV === 'development') console.log('[EFFECTIVE_GALLERY] VISIBILITY_AUTHORITY_RELOADED', {
                  projectId,
                  visibilityRevision: vParsed.visibilityRevision,
                });
                return effectiveGallery; // Empty hiddenGallery = all visible
              }
            }
            // If reload fails, fail closed
            console.error('[EFFECTIVE_GALLERY] VISIBILITY_AUTHORITY_RELOAD_FAILED - FAILING_CLOSED', {
              projectId,
            });
            return [];
          }

          if (process.env.NODE_ENV === 'development') console.log('[EFFECTIVE_GALLERY] VISIBILITY_AUTHORITY_INITIALIZED', {
            projectId,
            visibilityRevision: 0,
            decision: 'Gallery restored with empty visibility authority',
          });
          return effectiveGallery; // Empty hiddenGallery = all visible
        } else {
          // Development: allow missing authority (not yet initialized)
          if (process.env.NODE_ENV === 'development') console.log('[EFFECTIVE_GALLERY] VISIBILITY_AUTHORITY_MISSING - DEV_MODE', {
            projectId,
            decision: 'Returning unfiltered gallery (visibility not yet initialized)',
          });
          return effectiveGallery;
        }
      }
    } catch (error) {
      console.error('[EFFECTIVE_GALLERY] VISIBILITY_FILTER_ERROR - FAILING_CLOSED', {
        projectId,
        error: error instanceof Error ? error.message : String(error),
        decision: 'Returning empty gallery to prevent accidental exposure of hidden media',
      });
      // TRUE FAIL-CLOSED: Return empty gallery to prevent accidental exposure
      return [];
    }
  } else {
    // Redis client unavailable - fail closed in production
    const environment = getEnvironment();
    if (environment === 'production') {
      console.error('[EFFECTIVE_GALLERY] REDIS_UNAVAILABLE_IN_PRODUCTION - FAILING_CLOSED', {
        projectId,
        decision: 'Returning empty gallery to prevent accidental exposure of hidden media',
      });
      return [];
    } else {
      if (process.env.NODE_ENV === 'development') console.log('[EFFECTIVE_GALLERY] REDIS_UNAVAILABLE - DEV_MODE', {
        projectId,
        decision: 'Returning unfiltered gallery (Redis not available in dev)',
      });
    }
  }

  return effectiveGallery;
}

/**
 * Get Redis client for KV access
 * 
 * P0 FIX: Support integration-generated credential namespacing
 * Checks both primary KV_REST_API_URL/TOKEN and integration-generated variants
 */
function getRedisClient(): Redis | null {
  try {
    // Primary credentials
    let url = process.env.KV_REST_API_URL;
    let token = process.env.KV_REST_API_TOKEN;
    
    // Integration-generated credentials (for CI/production deployments)
    const integrationUrl = process.env.KV_REST_API__KV_REST_API_URL || process.env.KV_REST_API__REDIS_URL || process.env.KV_REST_API__KV_URL;
    const integrationToken = process.env.KV_REST_API__KV_REST_API_TOKEN;
    
    // Use integration credentials if primary not set
    if (!url && integrationUrl) {
      url = integrationUrl;
    }
    if (!token && integrationToken) {
      token = integrationToken;
    }
    
    if (!url || !token) return null;
    
    if (process.env.NODE_ENV === 'development') console.log('[EFFECTIVE_GALLERY] KV_CREDENTIALS', {
      hasUrl: !!url,
      hasToken: !!token,
      usingIntegration: !!integrationUrl || !!integrationToken,
      urlPrefix: url ? url.substring(0, 20) + '...' : 'none'
    });
    
    return new Redis({ url, token });
  } catch {
    console.error('[EFFECTIVE_GALLERY] KV_CLIENT_CREATION_FAILED');
    return null;
  }
}
