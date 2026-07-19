# Architecture

## Goal
A **reusable contractor platform**. The frontend is generic; the first deployment
(Happy Place Carpentry) is expressed entirely through configuration.

## Layering (strict)

```
UI components  ──►  features/  ──►  services/  ──►  mock/ | api/
                                      (interface)     (impl today) (impl later)
```

- **Components** never import a data source. They receive props or call a hook.
- **Features** compose components + call `services`.
- **Services** define interfaces (e.g. `LeadService`, `GalleryService`).
- **Mock** implements those interfaces with local data today.
- **API** will implement them against the future backend, swapping only the file.

## Naming convention (critical for reusability)
- Generic: `Company`, `Service`, `ProjectGallery`, `LeadForm`, `BusinessConfig`, `Review`.
- Never name code after a client. Client specifics live only in `config/`.

## Configuration
All business data is centralized:
- `website/src/config/company.ts` — name, tagline, contact, social
- `website/src/config/services.ts` — service catalog
- `website/src/config/counties.ts` — service area
- `website/src/config/contact.ts` — email, phone
- `website/src/config/reviews.ts` — testimonials (placeholder until real)
- `website/src/config/seo.ts` — metadata defaults
- `website/src/config/navigation.ts` — nav + reserved admin routes

This is the file a future contractor changes to rebrand.

## Images
- Originals downloaded once into `public/images/originals/` (or `storage/`).
- Build step generates `webp`, `avif`, responsive sizes, and blur placeholders.
- Components reference **metadata objects** (id, title, service, county, srcset),
  never raw URLs. Future DB integration only swaps the metadata source.

## Future backend seam
The `services/` interfaces are the contract. When the backend exists:
1. Implement the same interfaces in `api/`.
2. Flip a flag / env var.
3. No component or feature changes.

## Backend infrastructure to migrate (from archive)
Reviewed individually; only infra with clear value moves forward:
- Durable outbox (enqueue/drain/retry/backoff/dead-letter)
- Retry engine + error classification (retryable vs permanent)
- Provider interfaces (Calendar/Drive/Mail/Contacts)
- Append-only event log
- Observability (structured logs to DB)
- Health checks + startup config validation
- Configuration + logging core

Everything else is reconsidered.
