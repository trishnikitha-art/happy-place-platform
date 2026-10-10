import { getServiceCardAssignment } from '@/lib/assignment-store';
import { resolvePublicMedia } from '@/lib/media';
import type { Media } from '@/types/media';
import type { Service } from '@/types/registries';

/** Each card keeps its authority checks; independent reads overlap within this request. */
export async function getHomepageServiceMedia(services: Pick<Service, 'slug' | 'cardMediaId'>[]): Promise<Map<string, { mediaId: string | null; mediaObject: Media | null }>> {
  const entries = await Promise.all(services.map(async service => {
    try {
      const assignment = await getServiceCardAssignment(service.slug, 'homepage');
      if (assignment?.mediaId) {
        console.log('[ASSIGNMENT_AUTHORITY] SERVICE_CARD_MEDIA_ID', {
          serviceSlug: service.slug,
          assignedMediaId: assignment.mediaId,
          staticCardMediaId: service.cardMediaId,
          revision: assignment.revision,
        });

        // Resolve media object through public media gate (rejects Drive references, synthetic content, missing Blob metadata)
        const mediaObject = await resolvePublicMedia(assignment.mediaId);

        console.log('[PUBLIC_MEDIA_GATE] SERVICE_CARD_RESOLUTION', {
          serviceSlug: service.slug,
          assignedMediaId: assignment.mediaId,
          resolved: Boolean(mediaObject),
          resolvedMediaId: mediaObject?.id ?? null,
        });

        if (mediaObject) {
          return [service.slug, {
            mediaId: assignment.mediaId,
            mediaObject,
          }] as const;
        } else {
          console.log('[PUBLIC_MEDIA_GATE] ASSIGNED_MEDIA_ID_REJECTED', {
            serviceSlug: service.slug,
            rejectedMediaId: assignment.mediaId,
          });
          return [service.slug, {
            mediaId: null,
            mediaObject: null,
          }] as const;
        }
      } else {
        // Fallback to static configuration if no assignment exists
        if (service.cardMediaId) {
          console.log('[ASSIGNMENT_AUTHORITY] NO_ASSIGNMENT_USING_STATIC', {
            serviceSlug: service.slug,
            staticCardMediaId: service.cardMediaId,
          });

          const mediaObject = await resolvePublicMedia(service.cardMediaId);
          if (mediaObject) {
            return [service.slug, {
              mediaId: service.cardMediaId,
              mediaObject,
            }] as const;
          } else {
            return [service.slug, {
              mediaId: null,
              mediaObject: null,
            }] as const;
          }
        } else {
          return [service.slug, {
            mediaId: null,
            mediaObject: null,
          }] as const;
        }
      }
    } catch (error) {
      console.error('[ASSIGNMENT_AUTHORITY] SERVICE_CARD_ASSIGNMENT_ERROR', {
        serviceSlug: service.slug,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Fallback to static configuration on error
      if (service.cardMediaId) {
        const mediaObject = await resolvePublicMedia(service.cardMediaId);
        return [service.slug, {
          mediaId: service.cardMediaId,
          mediaObject,
        }] as const;
      } else {
        return [service.slug, {
          mediaId: null,
          mediaObject: null,
        }] as const;
      }
    }
  }));
  // Promise.all preserves registry order even when reads finish out of order.
  return new Map<string, { mediaId: string | null; mediaObject: Media | null }>(entries);
}
