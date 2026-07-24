# Google Workspace Boundary (Stage 3)

**Frozen spec:** Google Workspace remains the operational provider. Never duplicate provider-owned records. HPOS stores **references** only.

**Evidence tags:** [Observed] = verified in HPOS repo · [Asserted] = context from frozen spec (Google internals not repo-verified).

---

## Per-Service Boundary

| Service | Provider owns | HPOS owns | Reference stored | Observation emitted | Evidence produced | Replay required |
|---------|---------------|-----------|------------------|---------------------|-------------------|-----------------|
| **Drive** | File bytes, folders | Canonical Media object + metadata (variants, roles, eligibility) | Drive `fileId` + URL | Upload / move / delete | EvidenceEnvelope(media) | Yes (rebuild media state) |
| **Contacts** | Customer records | Reference (`customerId`) + local operational fields | Contact `resourceId` | Create / update / merge | EvidenceEnvelope(customer) | Yes |
| **Gmail** | Messages, threads | Reference (thread/message ids) + send log | Message `id` | Inbound / outbound | EvidenceEnvelope(comms) | Yes (audit) |
| **Calendar** | Events | Operational schedule + reference | Event `id` | Create / reschedule / cancel | EvidenceEnvelope(scheduling) | Yes |
| **Forms** | Form defs + responses | Reference (response ids) + parsed intake | Response `id` | Submission | EvidenceEnvelope(intake) | Yes |
| **Sheets** | Spreadsheet bytes | Reference (sheet id) + derived values | Sheet `id` + range | Edit | EvidenceEnvelope(data) | Optional |
| **Maps** | Geodata | Reference (place id, geocode) | Place `id` | (static) | — | No |
| **OAuth** | Tokens, consent | Connection state + refresh token (secret store) | Token handle | Connect / revoke / rotate | Audit log entry | N/A |

---

## Principles (frozen)

1. **Bytes live in Drive.** HPOS Media object stores `original`/`variants` URLs + Drive `fileId`. HPOS never copies image bytes.
2. **Records live in provider.** Customer/Contact/Email/Calendar truth stays in Google. HPOS holds only the `resourceId` and derived operational fields.
3. **Observations are one-way.** Edge node: Observe → Normalize → EvidenceEnvelope → Forget. No reasoning at the edge.
4. **Replay rebuilds HPOS state** from EvidenceEnvelopes + provider references — never from a provider-owned copy.

---

## Assimilation Classification

| Google Service | Class | Note |
|----------------|-------|------|
| Drive | **Reference** | Media already references Drive URLs (verify in `media.v1.json`). |
| Contacts | **Reference** | No HPOS customer object yet → deferred; reference-only when built. |
| Gmail | **Reference** | Future sensor; reference thread ids. |
| Calendar | **Reference** | Future sensor; reference event ids. |
| Forms | **Reference** | Intake → reference response ids. |
| Sheets | **Reference** | Estimate math references sheet ranges. |
| Maps | **Reference** | City/zip geocode references. |
| OAuth | **Wrap** | Connection state managed by HPOS admin; token in secret store. |

**No Google service is duplicated. No Replace required.**
