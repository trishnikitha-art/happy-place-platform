/**
 * Media — Phase 1 domain 4.
 *
 * Seed: media.v1.json.
 * Owner: HPOS / photo-librarian authority (the constitutional media authority).
 *
 * Constitutional rules enforced:
 *   - Exactly one original per media object (the `variants.original` path is the
 *     single source; WEBP/AVIF/thumbnail are derivatives, never separate objects).
 *   - No duplicate canonical media objects: identity is the existing media `id`.
 *
 * Relationships:
 *   Media --belongsTo--> Project   (if projectId present and exists)
 *   Media --belongsTo--> Service   (if service present)
 *   Media --supports---> Brand     (every image is eligible to support brand presentation)
 *
 * "eligibleFor Hero / Homepage / Featured" is recorded in metadata.roles (already
 * in the seed), not as edges to non-existent Homepage objects, to avoid orphans.
 */

import type { CanonicalBusinessObject, AuthorityRef, Relationship } from "../canonical-object";
import { instantiate } from "./_canonical";
import { brandCanonicalId, serviceId, projectId, mediaId, projectExists } from "./_ids";
import media from "../../config/media.v1.json";

const owner: AuthorityRef = { domain: "hp-os", authority: "photo-librarian" };
const brandCid = brandCanonicalId();

export const Media: CanonicalBusinessObject[] = (media as { media: { id: string; projectId?: string; service?: string }[] }).media.map((m) => {
  const relationships: Relationship[] = [];

  if (m.projectId && projectExists(m.projectId)) {
    relationships.push({ kind: "belongsTo", to: projectId(m.projectId), authority: owner, witness: projectId(m.projectId) });
  }
  if (m.service) {
    relationships.push({ kind: "belongsTo", to: serviceId(m.service), authority: owner, witness: serviceId(m.service) });
  }
  relationships.push({ kind: "supports", to: brandCid, authority: owner, witness: brandCid });

  return instantiate({
    type: "Media",
    srcId: m.id,
    owner,
    relationships,
    metadata: { ...m },
    seedFile: "media.v1.json",
  });
});
