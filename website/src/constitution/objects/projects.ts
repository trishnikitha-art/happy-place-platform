/**
 * Projects — Phase 1 domain 3.
 *
 * Seed: projects.v1.json.
 * Owner: HPOS / project authority.
 *
 * NOTE on ownership (Area 1 Q1.1): a Project mixes Happy Place's operational truth
 * (status, timeline, warranty, story) with customer-location context. For Phase 1
 * the object is HPOS-owned as the operator's record; the precise client-PII seam
 * (which fields are Provider-ref vs hp-os) is a deferred refinement, recorded in
 * the instantiation report. Nothing here changes that — we only make ownership
 * explicit and single, per object.
 *
 * Relationships:
 *   Project --belongsTo--> Service
 *   Project --uses------> Media    (hero/before/after/gallery that exist in media.v1.json)
 *   Project --contains---> Story
 */

import type { CanonicalBusinessObject, AuthorityRef, Relationship } from "../canonical-object";
import { instantiate } from "./_canonical";
import { serviceId, projectId, mediaId, storyId, mediaExists } from "./_ids";
import projects from "../../config/projects.v1.json";

const owner: AuthorityRef = { domain: "hp-os", authority: "project" };

export const Projects: CanonicalBusinessObject[] = (projects as { projects: { id: string; service: string; media: { hero: string; before?: string; after?: string; gallery?: string[] } }[] }).projects.map((p) => {
  const mediaRefs = [p.media.hero, p.media.before, p.media.after, ...(p.media.gallery ?? [])].filter(
    (m): m is string => typeof m === "string",
  );
  const relationships: Relationship[] = [
    { kind: "belongsTo", to: serviceId(p.service), authority: owner, witness: serviceId(p.service) },
    ...mediaRefs
      .filter((id) => mediaExists(id))
      .map((id) => ({
        kind: "uses" as const,
        to: mediaId(id),
        authority: owner,
        witness: mediaId(id),
      })),
    { kind: "contains", to: storyId(p.id), authority: owner, witness: storyId(p.id) },
  ];

  return instantiate({
    type: "Project",
    srcId: p.id,
    owner,
    relationships,
    metadata: { ...p },
    seedFile: "projects.v1.json",
  });
});
