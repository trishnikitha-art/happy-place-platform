/**
 * HPOS — Canonical Business Object: Universal Contract
 *
 * Type-only module. No runtime, no Next.js imports, no side effects.
 * Safe to add to the project: it cannot break `tsc --noEmit` or `next build`
 * because it introduces only types and is not imported by any app code yet.
 *
 * Inherits PING constitutional semantics (see ../../constitution/canonical_business_objects.md):
 *   - canonicalId  -> PING constitution/authority hashing (SHA-256 over identity fields)
 *   - owner        -> PING authority model (exactly one authority per object)
 *   - relationships-> PING runtime/knowledge edge (= a typed, provenance-tracked Claim)
 *   - lifecycle    -> PING event lifecycle + Knowledge Constitution lifecycle
 *   - evidence     -> PING build_witness + runtime/evidence
 *   - metadata     -> PING artifact bytes model (referenced, not copied)
 *   - version*     -> PING storage ProjectionVersion / Snapshot
 */

/** Content-addressed ID. Computed as SHA-256 over the object's constitutional
 *  identity fields (everything that defines "which object this is"), EXCLUDING
 *  infrastructure timestamps (createdAt/updatedAt). Mirrors PING EventEnvelope
 *  hashing: same identity => same id, across time and deployments. */
export type CanonicalId = string;

/** The single constitutional authority that owns an object class.
 *  domain discriminates where truth lives (three-domain model):
 *   - "hp-os"                : Happy Place operating system owns it
 *   - "ping-runtime"         : PING runtime owns it (execution/infra)
 *   - "knowledge-constitution": the learning platform owns it (policy/ontology)
 *   - "provider"             : an external client system owns it; we hold a ref + claims
 */
export interface AuthorityRef {
  readonly domain: "hp-os" | "ping-runtime" | "knowledge-constitution" | "provider";
  readonly authority: string; // e.g. "photo-librarian", "brand", "stripe", "google-calendar"
  readonly ref?: string;      // external system object id when domain === "provider"
}

/** Knowledge Constitution lifecycle (from the KC design). Orthogonal to confidence
 *  and authority: a claim can be high-confidence but only "observed", or
 *  low-confidence but long-"trusted". */
export type LifecycleState =
  | "unknown"
  | "observed"
  | "verified"
  | "trusted"
  | "constitutional"
  | "historical"
  | "archived"
  | "forgotten";

/** Confidence provenance (KC design). The TAG is constitutional, not a float.
 *  Only evidence-backed / human-confirmed / replay-verified / imported-from-trusted
 *  may promote a claim to "constitutional". derived and predicted may NOT auto-promote. */
export type Confidence =
  | "evidence-backed"
  | "observed"
  | "imported"
  | "derived"
  | "predicted"
  | "human-confirmed"
  | "replay-verified"
  | "external"
  | "expired"
  | "contradicted";

/** Provenance for a single observed fact. Mirrors PING BuildWitness:
 *  which source, which observer, which build/ingest version produced this. */
export interface EvidenceRef {
  readonly source: string;    // observation/idempotency source (e.g. "google-business", "estimate-wizard")
  readonly observer: string;  // agent or system that observed
  readonly witness: string;   // provenance hash (PING: build_witness)
  readonly observedAt: string; // ISO-8601
  readonly confidence: Confidence;
}

/** A typed, authority-scoped, provenance-tracked edge to another object.
 *  This is the graph primitive: every relationship is itself attributable. */
export interface Relationship {
  readonly kind: string;   // e.g. "belongs-to" | "supports" | "used-by" | "featured-on"
  readonly to: CanonicalId;
  readonly authority: AuthorityRef;
  readonly witness: string;
}

/** One immutable version entry. Mirrors PING ProjectionVersion / Snapshot. */
export interface VersionEntry {
  readonly version: number;
  readonly witness: string;   // projection/event witness
  readonly changedAt: string; // ISO-8601
  readonly evidence: EvidenceRef;
}

/** The Universal Canonical Business Object Contract (Phase 1).
 *  Every HPOS object — business or platform — satisfies this interface. */
export interface CanonicalBusinessObject {
  readonly canonicalId: CanonicalId;
  readonly type: string;                     // object type, e.g. "Service" | "Project" | "Media"
  readonly owner: AuthorityRef;              // exactly one owner
  readonly relationships: ReadonlyArray<Relationship>;
  readonly lifecycle: LifecycleState;
  readonly evidence: ReadonlyArray<EvidenceRef>;
  readonly metadata: Readonly<Record<string, unknown>>; // business attributes (referenced, not copied)
  readonly version: number;
  readonly versionHistory: ReadonlyArray<VersionEntry>;
}

/** Helper: the minimal identity fields an object must hash to derive its
 *  canonicalId. Implementations supply their own stable subset; infra
 *  timestamps must be excluded. Declared here only as documentation of intent. */
export interface CanonicalIdentity {
  readonly type: string;
  readonly identityFields: Readonly<Record<string, unknown>>;
}
