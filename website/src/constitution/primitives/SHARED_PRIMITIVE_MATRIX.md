# Shared Primitive Matrix (Stage 5)

**Rule:** These are **libraries**, not runtime, not HPOS, not Knowledge. They should eventually be extractable to a shared constitutional-primitives package consumed by PING (Python) and HPOS (TypeScript).

**Tagging:** [O]=observed · [I]=inference.

---

| Shared Primitive (Library) | PING location | HPOS location | Shared lib? | Evidence |
|----------------------------|---------------|--------------|-------------|----------|
| **Canonical IDs + Hashing** | `constitution/models/event.py` (SHA256 over identity) [O] | `objects/_sha256.ts` (SHA256 over identity) [O] | **Yes** — one SHA-256-over-identity lib; TS port of PING | D1 |
| **Relationship schema** | `runtime/knowledge/knowledge_graph.py` edges [O] | `canonical-object.ts` `Relationship{kind,to,authority,witness}` [O] | **Yes** — shared Relationship type | D7 |
| **Evidence schema** | `runtime/evidence/` + `EventEnvelope.build_witness` [O] | `canonical-object.ts` `EvidenceRef` [O] | **Yes** — shared Evidence/Provenance type | D5 |
| **Witness schema** | `constitution/authority/witness_builder.py` [O] | `canonicalId` used as witness [O] | **Yes** — shared Witness type | D5 |
| **Lifecycle schema** | KC 8-state [I] | `LifecycleState` 8-state [O] | **Yes** — shared Lifecycle enum | D4 |
| **Version schema** | `ProjectionVersion` [I] | `versionHistory[]` [O] | **Yes** — shared Version type | D6 |
| **Authority interfaces** | `constitution/authority/` + `ingress/route_authority.py` [O] | `AuthorityRef{domain,authority,ref}` [O] | **Yes** — shared Authority/Reference interfaces | — |
| **Provider references** | provider constitution [I] | `AuthorityRef.domain:"provider"` [O] | **Yes** — shared ProviderRef | — |
| **Configuration schema** | constitution config [O] | `src/config/*.json` + `featureFlags.ts` [O] | Partial — config shape conventions, not yet a formal schema | — |

---

## Interpretation

- **8 of 9 candidates are clearly shared-library material.** They already exist in *both* repos as Derived ports (D1, D4–D7) — collapsing them into one library eliminates the cross-repo duplication.
- **One (Configuration schema)** is Partial — HPOS config JSON and PING constitution config share conventions but no formal shared schema yet.
- **None of these are runtime, HPOS, or Knowledge.** They are pure type/algorithm libraries — safe to share, no ownership conflict.
- Extracting them is a *reduction* action (removes duplication), not a creation action. It directly answers the audit's guiding principle: *reduce before create*.

**Conclusion:** the shared-primitive set is small, well-defined, and already implemented twice. Promoting them to a library is the highest-leverage reduction step.
