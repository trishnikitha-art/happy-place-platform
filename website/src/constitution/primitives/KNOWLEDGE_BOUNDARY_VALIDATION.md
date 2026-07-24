# Knowledge Boundary Validation (Stage 7)

**Only architectural validation section.** Separate discoveries into two groups with repository evidence.
**Frozen spec:** Knowledge recommends; never edits. Platform Knowledge = global, reusable, improves the OS. Tenant Knowledge = business-specific, never leaves HPOS.

---

## Group A — Platform Knowledge (global, reusable, improves the operating system)

| Capability | Repository Evidence | Why Platform (not tenant) |
|------------|---------------------|----------------------------|
| **Planning** | PING `runtime/planning/` IR pipeline [O] | Generic intent→IR; domain-agnostic |
| **Verification** | PING `runtime/verification/` [O] | Checks correctness of any execution |
| **Ontology** | KC ontology (prior audit) [I] | Global concept model |
| **Capability ranking** | PING `runtime/security/capability_broker.py` [O] | Ranks invocable units generically |
| **Compiler improvements** | PING `runtime/planning/compiler_stages.py` + `optimization_passes.py` [O] | Improves IR compilation for all tenants |
| **Confidence** | KC confidence tags (prior audit) [I] | Calibration model, not per-tenant data |
| **Mission generation** | PING `mission_compiler.py` [O] + future `Orca` | Produces missions from any planning context |
| **Research** | PING `runtime/oracle/oracle.py` [O] | Observes/reasons generically |
| **Optimization** | PING `optimization_passes.py` [O] | Generic execution optimization |

→ All live in **PING / Knowledge Constitution**. None contain Happy Place business records.

## Group B — Tenant Knowledge (business-specific, never leaves HPOS)

| Capability | Repository Evidence | Why Tenant (not platform) |
|------------|---------------------|----------------------------|
| **Pricing history** | HPOS `Pricing` canonical (13) [O] | Happy Place price rules |
| **Project history** | HPOS `Project` canonical (6) [O] | Happy Place job records |
| **Marketing performance** | HPOS `seo.ts` + gallery [O] | Happy Place campaign results |
| **Conversion** | HPOS pages/forms [O] | Happy Place funnel |
| **Photo engagement** | HPOS `Media` roles/eligibility [O] | Happy Place gallery behavior |
| **Customer preferences** | Provider-ref (Contacts) [A] | Customer PII — Reference only |
| **Scheduling history** | Calendar provider-ref [A] | Happy Place appointments |
| **Estimate history** | Future Estimate object [U] | Happy Place quotes |
| **Review performance** | HPOS `Review` canonical (6) [O] | Happy Place reputation |

→ All live in **HPOS canonical objects + provider references**. None flow upward into PING/KC as owned data.

---

## Boundary Proof

1. **HPOS canonical objects are the tenant-knowledge store** — each has a single `owner` (AuthorityRef), and PII (customer/contact) is `provider`-domain Reference, never HPOS-owned [O].
2. **PING/KC primitives are generic** — `storage/models.py` has no business entities; `apps/` empty [O]. PING cannot hold tenant knowledge by construction.
3. **Flow direction is one-way:** HPOS observes → EvidenceEnvelope → PING/KC (Platform Knowledge reasons) → Recommendations → HPOS applies (Tenant Knowledge updated locally). Tenant data never becomes Platform-owned.
4. **Reference-not-ownership** enforces the seam: provider records (Contacts, Calendar, Drive) are referenced, never copied [O + A].

**Conclusion:** The ownership boundary is **provable from repository evidence**, not asserted. Platform Knowledge = PING/KC primitives; Tenant Knowledge = HPOS canonical objects + provider references. The boundary holds.
