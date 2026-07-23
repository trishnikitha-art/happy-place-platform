/**
 * Stories — Phase 1 domain 5.
 *
 * Seed: the `story` block inside each project in projects.v1.json (one story per
 * project today).
 * Owner: HPOS / story authority.
 *
 * Identity is the parent project's id (one Story per Project), so the Story's
 * canonicalId is stable and its `belongsTo` edge is exact.
 *
 * Relationships:
 *   Story --belongsTo--> Project
 *   Story --references-> Media   (the project's hero/before/after/gallery that exist)
 */

import type { CanonicalBusinessObject, AuthorityRef, Relationship } from "../canonical-object";
import { instantiate } from "./_canonical";
import { projectId, mediaId, mediaExists } from "./_ids";
import projects from "../../config/projects.v1.json";

const owner: AuthorityRef = { domain: "hp-os", authority: "story" };

export const Stories: CanonicalBusinessObject[] = (projects as { projects: { id: string; story: Record<string, unknown>; media: { hero: string; before?: string; after?: string; gallery?: string[] } }[] }).projects.map((p) => {
  const mediaRefs = [p.media.hero, p.media.before, p.media.after, ...(p.media.gallery ?? [])].filter(
    (m): m is string => typeof m === "string",
  );
  const relationships: Relationship[] = [
    { kind: "belongsTo", to: projectId(p.id), authority: owner, witness: projectId(p.id) },
    ...mediaRefs
      .filter((id) => mediaExists(id))
      .map((id) => ({
        kind: "references" as const,
        to: mediaId(id),
        authority: owner,
        witness: mediaId(id),
      })),
  ];

  return instantiate({
    type: "Story",
    srcId: p.id,
    owner,
    relationships,
    metadata: { ...p.story },
    seedFile: "projects.v1.json (story block)",
  });
});
