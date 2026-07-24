# Constitutional Primitive Catalog (Stage 1)

**Mode:** Read-only discovery. Look at *behavior*, not folders or filenames.
**Tagging:** [O]=observed in repo · [E:path]=evidence · [I]=inference · [A]=asserted context · [U]=unknown.
**Principle:** Reduction precedes creation. Document primitives; do not propose subsystems.

---

## Cross-Repo Primitive Inventory

| Primitive | Purpose | Implementation (PING / HPOS) | Owner | Class | Conf |
|-----------|---------|------------------------------|-------|-------|------|
| **Canonical Identity** | Stable, content-addressed object id | PING `constitution/models/event.py` (`event_id`=SHA256 over identity) [O]; HPOS `objects/_sha256.ts` (SHA-256 over JSON identity→`canonicalId`) [O] | Both | Canonical | High |
| **Authority** | Single owner of truth for a domain/object | PING `constitution/authority/` + `ingress/route_authority.py` [O]; HPOS `canonical-object.ts` `AuthorityRef{domain,authority,ref}` [O] | PING + HPOS | Canonical | High |
| **Reference** | Pointer to provider-owned record (no copy) | HPOS `AuthorityRef.domain:"provider"`; Review owner=`provider` [O]; PING provider constitution [I] | Provider/Client | Canonical | High |
| **Replay** | Rebuild state from event log | PING `storage` Event store + `kernel/projection.py` + loop phase `Project` [O] | PING | Canonical (Foundation) | High (store) / Med (wiring) |
| **Aggregate** | Unit of state with identity | PING `storage/postgres/models.py` `Aggregate(type:str)` [O]; HPOS each canonical object = aggregate [I] | PING | Canonical | High |
| **Artifact** | Immutable content/asset record | PING `storage` `Artifact` + `runtime/evidence/` [O]; HPOS media `variants` (original/webp/avif) [I] | PING | Canonical | High |
| **Registry** | Named definition store | PING `storage` 6 definition registries [O]; HPOS `src/config/*.json` act as registries [I] | PING + HPOS | Canonical | High |
| **Projection** | View derived from events | PING `kernel/projection.py` + `runtime/event_sourcing/projections.py` (see Duplicate Report) [O]; HPOS views derive from canonical objects [I] | PING | Canonical (Duplicate impl) | High |
| **Capability** | Invocable unit of work | PING `runtime/security/capability_broker.py` + `kernel/command_bus.py` [O]; HPOS none yet [U] | PING | Canonical | High |
| **Policy** | Constraint on behavior | PING `constitution/laws.py` (10 laws) + broker policy [O]; HPOS `AGENTS.md` rules + `featureFlags.ts` [O] | PING + HPOS | Canonical | High |
| **Configuration** | Tunable parameters | PING constitution config [O]; HPOS `src/config/*.json` + `featureFlags.ts` [O] | Both | Canonical | High |
| **Evidence** | Recorded observation w/ provenance | PING `runtime/evidence/` + `EventEnvelope.build_witness` [O]; HPOS `EvidenceRef` [O] | Both (parallel) | Canonical | High |
| **Witness** | Cryptographic proof of state | PING `constitution/authority/witness_builder.py` `BuildWitness` (git_commit+registry hashes) [O]; HPOS `canonicalId` used as witness [O] | PING (formal) + HPOS (derived) | Canonical | High |
| **Lifecycle** | State machine of an object | PING event lifecycle (tombstones) + KC 8-state [O/I]; HPOS `LifecycleState` 8-state (port of KC) [O] | KC + HPOS | Canonical (shared schema) | High |
| **Relationship** | Typed edge between objects | PING `runtime/knowledge/knowledge_graph.py` edges [O]; HPOS `Relationship[]` (kind/to/authority/witness) [O] | PING + HPOS | Canonical (parallel) | High |
| **Metadata** | Business attributes (referenced) | PING `Event.canonical_payload_bytes` + `Artifact` [O]; HPOS `metadata` field [O] | Both | Canonical | High |
| **Version History** | Immutable change log | PING `ProjectionVersion` (witness) [O/I]; HPOS `versionHistory[]` [O] | Both (parallel) | Canonical | High |
| **Feature Flag** | Runtime toggle | HPOS `featureFlags.ts` [O]; PING none seen [U] | HPOS | Canonical (HPOS-only) | High |

---

## Consumers / Producers (summary)

- **Canonical Identity / Witness / Evidence / Lifecycle / Relationship / Version / Metadata**: produced at object/event creation; consumed by Replay, Projection, Authority validation, Knowledge observation.
- **Capability / Policy / Command**: produced by PING runtime; consumed by HPOS (future domain adapter).
- **Registry / Configuration / Feature Flag**: produced by manual edit (HPOS) / constitution (PING); consumed by app + runtime.
- **Reference**: produced by provider observation; consumed by HPOS canonical objects (never copied).

## Dependencies

All primitives depend on **Canonical Identity** (hashing) and **Authority** (ownership). Replay/Projection/Evidence depend on the **Event model**. HPOS canonical objects depend on **Authority + Relationship + Lifecycle + Evidence + Version History** (the 7-field contract).

## Conclusion

**18 constitutional primitives are already present** across PING + HPOS. None require invention for the planned subsystems (see REDUCTION_AUDIT.md). The only concerns are *duplication* of a few primitives across the two repos and within PING itself (see DUPLICATE_PRIMITIVE_REPORT.md).
