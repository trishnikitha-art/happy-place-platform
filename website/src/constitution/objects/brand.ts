/**
 * Brand — Phase 1 domain 1.
 *
 * Seed: company.v1.json (identity, contact, proof) + brand.v1.json (visual assets).
 * Owner: HPOS / brand authority.
 *
 * Relationships declared:
 *   Brand --owns--> Service        (every service is an offering of the brand)
 *   Brand --owns--> Media          (only brand media that actually exist in media.v1.json;
 *                                    brand-only media referenced from brand.v1.json but absent
 *                                    from media.v1.json are NOT linked, to avoid orphan edges)
 *
 * Concepts the mission lists as brand-owned (Website, Logo, Messaging, Colors,
 * Voice, Guarantees) are not yet separate canonical object types, so they live
 * in `metadata.owns` (deferred) rather than as relationships, keeping the graph
 * orphan-free.
 */

import type { CanonicalBusinessObject, AuthorityRef, Relationship } from "../canonical-object";
import { instantiate } from "./_canonical";
import { brandCanonicalId, serviceId, mediaId, mediaExists } from "./_ids";
import company from "../../config/company.v1.json";
import brand from "../../config/brand.v1.json";
import services from "../../config/services.v1.json";

const owner: AuthorityRef = { domain: "hp-os", authority: "brand" };
const brandCid = brandCanonicalId();

const brandMediaInManifest = (["brand-hero", "brand-portrait", "brand-logo"] as string[]).filter(mediaExists);

const relationships: Relationship[] = [
  ...(services as { services: { id: string }[] }).services.map((s) => ({
    kind: "owns" as const,
    to: serviceId(s.id),
    authority: owner,
    witness: serviceId(s.id),
  })),
  ...brandMediaInManifest.map((id) => ({
    kind: "owns" as const,
    to: mediaId(id),
    authority: owner,
    witness: mediaId(id),
  })),
];

export const Brand: CanonicalBusinessObject = instantiate({
  type: "Brand",
  srcId: "happy-place-carpentry",
  owner,
  relationships,
  metadata: {
    name: (company as { company: { name: string } }).company.name,
    legalName: (company as { company: { legalName: string } }).company.legalName,
    tagline: (company as { company: { tagline: string } }).company.tagline,
    ccbNumber: (company as { company: { ccbNumber: string } }).company.ccbNumber,
    email: (company as { company: { email: string } }).company.email,
    phone: (company as { company: { phone: string } }).company.phone,
    address: (company as { company: { address: unknown } }).company.address,
    serviceArea: (company as { company: { serviceArea: string } }).company.serviceArea,
    owners: (company as { company: { owners: unknown } }).company.owners,
    social: (company as { company: { social: unknown } }).company.social,
    proof: (company as { company: { proof: unknown } }).company.proof,
    visual: brand,
    owns: ["Website", "Logo", "Messaging", "Colors", "Voice", "Guarantees"],
  },
  seedFile: "company.v1.json + brand.v1.json",
});
