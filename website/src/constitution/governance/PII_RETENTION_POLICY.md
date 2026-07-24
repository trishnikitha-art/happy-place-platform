# PII_RETENTION_POLICY — Constitutional Specification (P1)

**Role:** Constitutional privacy.
**Status:** Normative governance. Enforceable. Supports deterministic replay.
**Evidence tags:** [E:file]=committed audit · [I]=inference.

---

## 1. PII Classes
- **Class A — Provider-owned PII:** customer name, email, address, payment in Google/Stripe/Jobber. HPOS holds only `Reference` + minimal operational fields.
- **Class B — HPOS-operational PII:** job-site address, project communications. HPOS-owned but **minimized**.

## 2. Storage
- Class A: **never** stored as an HPOS-owned body. Only `AuthorityRef{domain:"provider", ref}` + observed display fields marked `provider_sourced`. [E:CUSTOMER_IDENTITY_POLICY.md]
- Class B: stored only where operationally required; tagged `pii:operational`.

## 3. Encryption
References + Class B fields encrypted at rest; keys in secret store (never in repo). [E:ADMIN_SURFACE_MAP.md Secrets]

## 4. Retention
- Class B: retained only while project active + any legal hold; auto-expiry via `retention_expired` event.
- Class A: retention governed by the provider; HPOS retains only the reference.

## 5. Deletion (Right to Erasure)
- HPOS deletes its Class B fields + all `Reference`s to the customer → emits `reference_forgotten`.
- Provider data deleted at the provider.
- Erasure is a **tombstone** event; replay after erasure excludes forgotten data. [E:EVENT_SCHEMA_POLICY.md tombstone]

## 6. Export
Customer may export their References + Class B operational fields (never provider-owned bytes). Export is a `data_exported` event (audit).

## 7. Replay
- Erasure is reconstructable: replay of the post-erasure window omits forgotten content; the `reference_forgotten` event (audit witness) is retained but its payload is empty.
- This satisfies GDPR/CCPA erasure without breaking replay integrity.

## 8. Knowledge Restrictions
- Knowledge (including the Hermes reasoning layer) **MUST NOT** ingest or retain customer PII as owned data.
- It may observe `Reference`s + derive `Claim`s with confidence + reasoning, never the PII body.
- Embedding of PII is **forbidden**. [E:PROJECTION_POLICY.md Embedding Requirements]

## 9. Enforcement
A component violating §1/§5/§8 (storing Class A as owned body, retaining after erasure, embedding PII in Knowledge) is NON-CERTIFIED and blocked from emit.

---
*Cross-reference: CUSTOMER_IDENTITY_POLICY (reference-only), CONNECTOR_POLICY (no copy), EVENT_SCHEMA_POLICY (tombstone), REPLAY_CERTIFICATION_POLICY (certification).*
