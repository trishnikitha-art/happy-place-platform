/**
 * Effective Project Gallery Authority
 *
 * Combines deployed project gallery with staged mutations (production)
 * and visibility filtering to provide the single authoritative ordered gallery for projection.
 *
 * Architecture:
 * - Immutable media identity: PublishedMediaAsset
 * - Mutable editorial ordering: project.media.gallery[] (galleryRevision)
 * - Mutable editorial visibility: workbench-visibility-gallery:{projectId} (visibilityRevision)
 * - Production staging: Redis KV mutations (galleryRevision)
 * - Effective authority: deployed + staged + visibility-filtered
 *
 * IMPORTANT: galleryRevision and visibilityRevision are INDEPENDENT authorities
 * - Gallery mutation increments galleryRevision
 * - Visibility mutation increments visibilityRevision
 * - They are NOT atomically coupled
 * - Visibility is independently authoritative and immediately public
 * - The public projection consumes (gallery state, visibility state) as independent inputs
 *
 * This resolver ensures the website projection always sees the current
 * editorial state, whether it's the deployed baseline, staged mutations, or visibility-filtered state.
 */

import { loadProjectsManifest } from './projects';
import { getKvNamespace, getEnvironment } from './environment';
import { Redis } from '@upstash/redis';

const WORKBENCH_STAGING_PREFIX = 'workbench-staging:';
const WORKBENCH_VISIBILITY_PREFIX = 'workbench-visibility-gallery:';

/**
 * Get visibility key for a project
 */
function getVisibilityKey(projectId: string): string {
  const namespace = getKvNamespace();
  return `${namespace}${WORKBENCH_VISIBILITY_PREFIX}${projectId}`;
}

/**
 * Get the effective project gallery (deployed + staged mutations + visibility filter)
 *
 * This is the single authoritative source for gallery ordering.
 * In production, it merges the deployed baseline with staged KV mutations.
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

  // Baseline gallery from deployed projects.v1.json
  const baselineGallery = project.media?.gallery || [];
  const baselineRevision = project.media?.galleryRevision || 0;

  console.log('[EFFECTIVE_GALLERY] BASELINE_LOADED', {
    projectId,
    baselineGalleryLength: baselineGallery.length,
    baselineGalleryIds: baselineGallery,
    baselineRevision,
  });

  // In production, check for staged mutations
  const environment = getEnvironment();
  const isProduction = environment === 'production';

  let effectiveGallery: string[];
  
  if (!isProduction) {
    console.log('[EFFECTIVE_GALLERY] DEV_MODE - Returning baseline', {
      projectId,
      environment,
      galleryLength: baselineGallery.length,
    });
    effectiveGallery = baselineGallery;
  } else {
    // Production: Check for staged KV mutations
    const redis = getRedisClient();
    if (!redis) {
      console.warn('[EFFECTIVE_GALLERY] REDIS_UNAVAILABLE - Returning baseline', {
        projectId,
        reason: 'KV credentials not configured or Redis unavailable',
      });
      effectiveGallery = baselineGallery;
    } else {
      try {
        // Check if there's a current staged transaction for this project
        const projectStagingKey = `${getKvNamespace()}${WORKBENCH_STAGING_PREFIX}project:${projectId}:current-transaction`;
        const currentStagedTransactionId = await redis.get(projectStagingKey);
        
        if (!currentStagedTransactionId || typeof currentStagedTransactionId !== 'string') {
          console.log('[EFFECTIVE_GALLERY] NO_STAGED_MUTATION - Returning baseline', {
            projectId,
            projectStagingKey,
          });
          effectiveGallery = baselineGallery;
        } else {
          // Load the specific staged transaction
          const specificStagingKey = `${getKvNamespace()}${WORKBENCH_STAGING_PREFIX}${currentStagedTransactionId}:project:${projectId}:gallery`;
          const stagedData = await redis.get(specificStagingKey);
          
          if (!stagedData) {
            console.warn('[EFFECTIVE_GALLERY] STAGED_DATA_INVALID - Returning baseline', {
              projectId,
              specificStagingKey,
              reason: 'Staged data is null',
            });
            effectiveGallery = baselineGallery;
          } else {
            // P0 FIX: Upstash automatically deserializes JSON objects
            // Accept both string (needs JSON.parse) and object (already parsed)
            let parsed: any;
            if (typeof stagedData === 'string') {
              parsed = JSON.parse(stagedData);
            } else if (typeof stagedData === 'object') {
              parsed = stagedData;
            } else {
              console.warn('[EFFECTIVE_GALLERY] STAGED_DATA_INVALID - Returning baseline', {
                projectId,
                specificStagingKey,
                reason: `Staged data has invalid type: ${typeof stagedData}`,
              });
              effectiveGallery = baselineGallery;
            }

            const stagedGallery = parsed.gallery;
            const stagedRevision = parsed.currentRevision;

            console.log('[EFFECTIVE_GALLERY] STAGED_MUTATION_APPLIED', {
              projectId,
              baselineGalleryLength: baselineGallery.length,
              stagedGalleryLength: stagedGallery.length,
              baselineRevision,
              stagedRevision,
              transactionId: currentStagedTransactionId,
            });

            // Validate staged gallery structure
            if (!Array.isArray(stagedGallery)) {
              console.error('[EFFECTIVE_GALLERY] STAGED_GALLERY_INVALID - Returning baseline', {
                projectId,
                reason: 'Staged gallery is not an array',
              });
              effectiveGallery = baselineGallery;
            } else {
              // Validate no duplicates
              const uniqueStaged = new Set(stagedGallery);
              if (uniqueStaged.size !== stagedGallery.length) {
                console.error('[EFFECTIVE_GALLERY] STAGED_GALLERY_DUPLICATES - Returning baseline', {
                  projectId,
                  reason: 'Staged gallery contains duplicates',
                });
                effectiveGallery = baselineGallery;
              } else {
                // Validate no null/undefined
                if (stagedGallery.some(id => id === null || id === undefined)) {
                  console.error('[EFFECTIVE_GALLERY] STAGED_GALLERY_NULL_VALUES - Returning baseline', {
                    projectId,
                    reason: 'Staged gallery contains null/undefined values',
                  });
                  effectiveGallery = baselineGallery;
                } else {
                  // Validate no empty strings
                  if (stagedGallery.some(id => typeof id === 'string' && id.trim() === '')) {
                    console.error('[EFFECTIVE_GALLERY] STAGED_GALLERY_EMPTY_STRINGS - Returning baseline', {
                      projectId,
                      reason: 'Staged gallery contains empty strings',
                    });
                    effectiveGallery = baselineGallery;
                  } else {
                    // Staged gallery is valid
                    effectiveGallery = stagedGallery;
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('[EFFECTIVE_GALLERY] STAGED_MUTATION_ERROR - Returning baseline', {
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
          
          console.log('[EFFECTIVE_GALLERY] VISIBILITY_FILTER_APPLIED', {
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
          console.log('[EFFECTIVE_GALLERY] VISIBILITY_AUTHORITY_MISSING - SELF_HEALING', {
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
                console.log('[EFFECTIVE_GALLERY] VISIBILITY_AUTHORITY_RELOADED', {
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

          console.log('[EFFECTIVE_GALLERY] VISIBILITY_AUTHORITY_INITIALIZED', {
            projectId,
            visibilityRevision: 0,
            decision: 'Gallery restored with empty visibility authority',
          });
          return effectiveGallery; // Empty hiddenGallery = all visible
        } else {
          // Development: allow missing authority (not yet initialized)
          console.log('[EFFECTIVE_GALLERY] VISIBILITY_AUTHORITY_MISSING - DEV_MODE', {
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
      console.log('[EFFECTIVE_GALLERY] REDIS_UNAVAILABLE - DEV_MODE', {
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
    
    console.log('[EFFECTIVE_GALLERY] KV_CREDENTIALS', {
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
