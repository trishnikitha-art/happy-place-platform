/**
 * Reviews — Phase 1 domain 6.
 *
 * Seed: reviews.v1.json.
 * Owner: Provider-ref (Google/FB/business profiles). Here source is "manual" and
 * syncStatus "manual", so the authority is the review source, not HPOS. HPOS only
 * OBSERVES reviews; it never owns the customer's words.
 *
 * Relationships:
 *   Review --belongsTo--> Service   (r.service matches a Service id)
 *
 * Intentionally NOT linked to Project via r.projectId: in the seed data,
 * reviews[].projectId values (e.g. "cedar-fence-001", "deck-remodel-001") do NOT
 * match any projects[].id ("fences-001", ...). Linking them would create orphan
 * edges, so the mismatch is surfaced as a data-integrity finding in the report
 * rather than silently fabricated. Customer linkage is deferred (no Customer
 * object exists yet) — that is consistent with the catalog (Customer = Provider-ref).
 */

import type { CanonicalBusinessObject, AuthorityRef, Relationship } from "../canonical-object";
import { instantiate } from "./_canonical";
import { serviceId, serviceExists } from "./_ids";
import reviews from "../../config/reviews.v1.json";

const owner: AuthorityRef = { domain: "provider", authority: "review-source-manual" };

export const Reviews: CanonicalBusinessObject[] = (reviews as { reviews: { id: string; service: string }[] }).reviews.map((r) => {
  const relationships: Relationship[] = [];

  if (serviceExists(r.service)) {
    relationships.push({ kind: "belongsTo", to: serviceId(r.service), authority: owner, witness: serviceId(r.service) });
  }

  return instantiate({
    type: "Review",
    srcId: r.id,
    owner,
    relationships,
    metadata: { ...r },
    seedFile: "reviews.v1.json",
  });
});
