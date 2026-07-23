/**
 * Services — Phase 1 domain 2.
 *
 * Seed: services.v1.json.
 * Owner: HPOS / service authority.
 *
 * Relationships:
 *   Service --ownedBy--> Brand
 *   Service --contains--> Project   (each project whose .service === this service id)
 *   Service --uses-----> Pricing    (the pricing profile for this service)
 */

import type { CanonicalBusinessObject, AuthorityRef, Relationship } from "../canonical-object";
import { instantiate } from "./_canonical";
import { brandCanonicalId, serviceId, projectId, pricingId } from "./_ids";
import services from "../../config/services.v1.json";
import projects from "../../config/projects.v1.json";

const owner: AuthorityRef = { domain: "hp-os", authority: "service" };
const brandCid = brandCanonicalId();

export const Services: CanonicalBusinessObject[] = (services as { services: { id: string }[] }).services.map((s) => {
  const relationships: Relationship[] = [
    { kind: "ownedBy", to: brandCid, authority: owner, witness: brandCid },
    ...(projects as { projects: { id: string; service: string }[] }).projects
      .filter((p) => p.service === s.id)
      .map((p) => ({
        kind: "contains" as const,
        to: projectId(p.id),
        authority: owner,
        witness: projectId(p.id),
      })),
    { kind: "uses", to: pricingId(s.id), authority: owner, witness: pricingId(s.id) },
  ];

  return instantiate({
    type: "Service",
    srcId: s.id,
    owner,
    relationships,
    metadata: { ...s },
    seedFile: "services.v1.json",
  });
});
