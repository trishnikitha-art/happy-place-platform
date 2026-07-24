# Administrative Surface Map (Stage 4)

**Goal:** One enterprise administration experience — not disconnected panels.

---

## Existing Administrative Capabilities (inventory)

| Capability | Where it lives today | Manages |
|-----------|---------------------|---------|
| Business Objects | `src/config/*.json` (edited manually) | Brand, Services, Projects, Media, Reviews, Pricing, FAQ, Cities, Materials |
| Provider Connections | `oauth.v1.json` | Google scopes, future Stripe/Square |
| Runtime Configuration | `featureFlags.ts` | App feature toggles |
| Knowledge Configuration | *none* [Backlog] | Future recommendation policy |
| Brand | `company.v1.json` + `brand.v1.json` | Identity, visuals |
| Pricing | `services.v1.json` `capabilities` | Estimation rules |
| Marketing | `seo.ts`, `gallery-presets.v1.json` | SEO, galleries |
| Projects | `projects.v1.json` | Project records |
| Media | `media.v1.json` + Drive | Photo library |
| Customers | *none as object* [Backlog] | Future (provider-ref) |
| Scheduling | *Google Calendar* [Asserted] | Operational schedule |
| OAuth | `oauth.v1.json` | Auth connection |
| Secrets | *secret store* [Asserted] | Refresh tokens, API keys |
| Audit Logs | *PING event log* [Asserted] | Immutable constitutional audit |

---

## Desired Single Surface (classification only)

| Admin Area | Current State | Assimilation Class |
|-----------|---------------|--------------------|
| Business Objects | JSON files, manual | **Preserve** + wrap with admin UI over canonical objects |
| Provider Connections | `oauth.v1.json` | **Wrap** (OAuth handshake + rotation UI) |
| Runtime Configuration | `featureFlags.ts` | **Preserve** (reuse as config primitive) |
| Knowledge Configuration | absent | **Backlog** (not Stage 1) |
| Brand / Pricing / Marketing / Projects / Media | JSON config | **Preserve** |
| Customers | absent | **Reference** (provider-ref when built) |
| Scheduling | Google Calendar | **Reference** |
| OAuth | JSON | **Wrap** |
| Secrets | secret store | **Wrap** (never expose; rotate via control plane) |
| Audit Logs | PING event log | **Reference** (read-only view of PING evidence) |

---

## Conclusion

The administrative *data* already exists (config JSON + feature flags + oauth). What is missing is a **unified admin surface** that edits canonical objects instead of raw JSON, and that surfaces Provider Connections / Secrets / Audit Logs through one panel. This is a **Wrap**, not a rebuild: the underlying authorities are preserved; the surface is a constitutional adapter over them.

No new subsystem is required. Reusing `featureFlags.ts` (Runtime Configuration) and `oauth.v1.json` (Provider Connections) as the seeds of the unified surface avoids duplication.
