/**
 * Canonical ID authority for Phase 1 seed instantiation.
 *
 * Single place that maps a (type, sourceId) pair to a deterministic `canonicalId`.
 * Every domain module derives its own id AND its relationship targets from here,
 * so there is exactly one ID computation and no divergence between an object's
 * id and the `to` it points at.
 *
 * canonicalId = "cid:" + SHA-256( canonical(JSON({ type, id })) )
 * The identity is the stable seed key (the existing JSON `id`), never a filename
 * or an array index — so IDs are stable across reorders and renames.
 */

import type { CanonicalId } from "../canonical-object";
import { sha256Hex } from "./_sha256";

import company from "../../config/company.v1.json";
import services from "../../config/services.v1.json";
import projects from "../../config/projects.v1.json";
import media from "../../config/media.v1.json";
import reviews from "../../config/reviews.v1.json";

export function canonicalId(type: string, srcId: string): CanonicalId {
  const identity = { type, id: srcId };
  return ("cid:" + sha256Hex(JSON.stringify(identity))) as CanonicalId;
}

const BRAND_SRC_ID = "happy-place-carpentry";

export function brandCanonicalId(): CanonicalId {
  return canonicalId("Brand", BRAND_SRC_ID);
}

export const brandName: string = (company as { company: { name: string } }).company.name;

export function serviceId(id: string): CanonicalId {
  return canonicalId("Service", id);
}
export function projectId(id: string): CanonicalId {
  return canonicalId("Project", id);
}
export function mediaId(id: string): CanonicalId {
  return canonicalId("Media", id);
}
export function reviewId(id: string): CanonicalId {
  return canonicalId("Review", id);
}
export function storyId(projectSrcId: string): CanonicalId {
  return canonicalId("Story", projectSrcId);
}
export function pricingId(serviceSrcId: string): CanonicalId {
  return canonicalId("Pricing", serviceSrcId);
}

// Existence helpers (used to avoid creating orphaned relationships).
const mediaIds = new Set((media as { media: { id: string }[] }).media.map((m) => m.id));
export function mediaExists(id: string): boolean {
  return mediaIds.has(id);
}

const projectIds = new Set((projects as { projects: { id: string }[] }).projects.map((p) => p.id));
export function projectExists(id: string): boolean {
  return projectIds.has(id);
}

const serviceIds = new Set((services as { services: { id: string }[] }).services.map((s) => s.id));
export function serviceExists(id: string): boolean {
  return serviceIds.has(id);
}

// Re-export raw seed shapes for validators / future tooling.
export const seeds = { company, services, projects, media, reviews };
