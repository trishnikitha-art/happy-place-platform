/**
 * Builds a CanonicalBusinessObject from a seed specification.
 *
 * This is the only place that assembles the 7-field Universal Contract, so the
 * contract is satisfied identically for every domain. Provenance is attached
 * automatically: each object records the seed file it came from, the observer
 * ("constitution-boot"), a content-address witness (= its own canonicalId), and
 * a confidence tag of "evidence-backed" (the seed JSON is existing authoritative
 * data, i.e. 100% confidence in the mission's terms).
 */

import type { CanonicalBusinessObject, AuthorityRef, Relationship, LifecycleState, EvidenceRef } from "../canonical-object";
import { canonicalId } from "./_ids";

export interface InstantiateSpec {
  type: string;
  srcId: string;
  owner: AuthorityRef;
  relationships?: Relationship[];
  lifecycle?: LifecycleState;
  metadata: Record<string, unknown>;
  seedFile: string;
}

export function instantiate(spec: InstantiateSpec): CanonicalBusinessObject {
  const cid = canonicalId(spec.type, spec.srcId);

  const evidence: EvidenceRef[] = [
    {
      source: spec.seedFile,
      observer: "constitution-boot",
      witness: cid,
      observedAt: "2026-07-23",
      confidence: "evidence-backed",
    },
  ];

  return {
    canonicalId: cid,
    type: spec.type,
    owner: spec.owner,
    relationships: spec.relationships ?? [],
    lifecycle: spec.lifecycle ?? "constitutional",
    evidence,
    metadata: spec.metadata,
    version: 1,
    versionHistory: [
      {
        version: 1,
        witness: cid,
        changedAt: "2026-07-23",
        evidence: evidence[0],
      },
    ],
  };
}
