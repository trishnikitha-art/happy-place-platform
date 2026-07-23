/**
 * Pricing — Phase 1 domain 7.
 *
 * Seed: the estimate/pricing structure is currently expressed through each
 * Service's `capabilities` (estimationAuthority, paintableSurface, surfaceType,
 * paintingType). There is no separate price table yet, so the Pricing profile is
 * the structural pricing authority derived per service.
 * Owner: HPOS / pricing authority. (Per the HPOS vision, pricing is recommended
 * by intelligence but owned/edited by humans — never by Knowledge.)
 *
 * Relationships:
 *   Pricing --belongsTo--> Service
 *
 * "contains Pricing Rules / contains Assumptions" are captured in metadata:
 * the capability block is the rule set; estimationAuthority is the key assumption.
 * Live price numbers are intentionally absent — none exist in the seed.
 */

import type { CanonicalBusinessObject, AuthorityRef, Relationship } from "../canonical-object";
import { instantiate } from "./_canonical";
import { serviceId, pricingId } from "./_ids";
import services from "../../config/services.v1.json";

const owner: AuthorityRef = { domain: "hp-os", authority: "pricing" };

export const Pricing: CanonicalBusinessObject[] = (services as { services: { id: string; name: string; capabilities?: Record<string, unknown> }[] }).services.map((s) => {
  const relationships: Relationship[] = [
    { kind: "belongsTo", to: serviceId(s.id), authority: owner, witness: serviceId(s.id) },
  ];

  return instantiate({
    type: "Pricing",
    srcId: s.id,
    owner,
    relationships,
    metadata: {
      service: s.id,
      name: s.name,
      pricingRules: s.capabilities ?? {},
      assumptions: { estimationAuthority: s.capabilities?.estimationAuthority },
    },
    seedFile: "services.v1.json (capabilities)",
  });
});
