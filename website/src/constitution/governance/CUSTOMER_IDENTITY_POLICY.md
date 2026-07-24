# CUSTOMER_IDENTITY_POLICY — Constitutional Specification (P1)

**Role:** Identity constitution. Every other policy references this.
**Status:** Normative governance. Enforceable. Supports deterministic replay.
**Evidence tags:** [E:file]=committed audit · [O]=observed · [I]=inference.

---

## 1. Purpose
Define how Happy Place (HPOS) represents a customer *without owning* the customer. HPOS is the customer's **sovereign system of record** for operational truth; the customer's own identity lives in provider systems (Google Contacts, Jobber, Stripe). This policy eliminates ambiguity about customer ownership.

## 2. Authority
- **Owner of customer identity:** Provider (`AuthorityRef.domain:"provider"`). [E:primitives/BUSINESS_PRIMITIVE_CATALOG.md]
- **HPOS role:** holds a `Reference` to the customer, plus minimal operational fields it generates.
- **Forbidden:** HPOS may never emit an event that asserts ownership of customer PII.

## 3. Canonical Customer
A **Canonical Customer** is a stable `canonicalId` aggregating one or more provider references for the same human/org.
- `canonicalId = SHA-256({ type:"customer", primaryProvider, primaryProviderId })` [E:primitives/CONSTITUTIONAL_PRIMITIVE_CATALOG.md]
- It contains **no PII body** — only reference handles + operational flags.

## 4. Identity Sources
Google Contacts, Jobber, Stripe, intake Forms. Each is a **provider source of truth**.

## 5. Provider References
- HPOS stores `AuthorityRef{ domain:"provider", authority:<source>, ref:<resourceId> }` + observed display fields (e.g., name, masked email) marked `provider_sourced`.
- Full PII body remains in the provider. **Reference-not-Copy is mandatory.** [E:governance/CONSTITUTIONAL_GOVERNANCE_AUDIT.md]

## 6. Canonicalization Rules
- Primary reference = the most authoritative source (Stripe for billing identity, Google Contacts for contact).
- `canonicalId` derived from primary reference only; secondary references attached as an alias set.

## 7. Merge Rules
- If the same human appears under multiple providers, merge into **one Canonical Customer** with a `references[]` set.
- Merge is associative/idempotent; re-observing the same reference is a no-op (idempotent inbox). [E:primitives/RUNTIME_PRIMITIVE_CATALOG.md Outbox/Inbox]
- A merge emits `reference_merged`, never `customer_created`.

## 8. Conflict Resolution
- **Provider wins.** On conflict between provider value and HPOS operational cache, provider is authoritative.
- HPOS may hold a `derived` operational field only when explicitly labeled `derived` + `provider_sourced` and never presented as owned truth.

## 9. Replay Requirements
- Customer identity is reconstructed from `reference_observed` / `reference_updated` / `reference_merged` **EvidenceEnvelopes** — never from a copied PII body.
- Replay of the customer scope yields the reference set + operational flags; PII body is absent by construction.

## 10. Event Requirements
- Allowed: `reference_observed`, `reference_updated`, `reference_merged`, `reference_forgotten`.
- Forbidden: `customer_created` (owning), `customer_edited` (mutating provider truth).

## 11. Projection Requirements
- Customer projection = **reference index + operational flags** (status, last touch), no PII body.
- Queries scoped by tenant + authority. [E:governance/CONSTITUTIONAL_GOVERNANCE_AUDIT.md Projection]

## 12. Evidence Requirements
- Each reference observation carries `witness` + provider source + `observedAt`.
- Erasure emits `reference_forgotten` with retained audit witness but omitted content. [E:PII_RETENTION_POLICY.md]

## 13. Certification Rules
A Canonical Customer is **certified** when:
1. ≥1 provider reference resolved and retained;
2. no HPOS-owned PII body exists;
3. merge set is idempotent;
4. replay reconstructs the reference set identically.
→ Certifies customer sovereignty: HPOS records the relationship; the provider owns the person.

---
*Cross-reference: CONNECTOR_POLICY (reference acquisition), PII_RETENTION_POLICY (erasure), EVENT_SCHEMA_POLICY (event shape).*
