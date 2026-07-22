# Service Media Coverage Audit

**Date:** 2026-07-22  
**Purpose:** Audit every service in the service registry for authority-backed media coverage

## Methodology

For each service in `services.v1.json`:
1. Verify there is at least one completed project in `projects.v1.json`
2. Verify the project has a hero media reference
3. Verify the hero media exists in `media.v1.json`
4. Verify `getFeaturedServiceMedia(service.slug)` returns a Media object instead of null

## Results

### Services with Authority-Backed Media ✅

| Service | Status | Project | Hero Media |
|---------|--------|---------|------------|
| decks | ✅ | deck-remodel-001 | deck-remodel-001-hero |
| fences | ✅ | cedar-fence-001 | cedar-fence-001-hero |
| kitchens | ✅ | kitchen-remodel-001 | kitchen-remodel-001-hero |
| pergolas | ✅ | pergola-001 | pergola-001-hero |

### Services Missing Authority Data ✗

| Service | Issue | Severity |
|---------|-------|----------|
| bathrooms | no completed projects | medium |
| painting | no completed projects | medium |
| finish-carpentry | no completed projects | medium |
| restoration | no completed projects | medium |
| outdoor-living | no completed projects (pergolas may represent this) | medium |
| repairs | no completed projects | medium |
| built-ins | no completed projects | medium |
| adus | no completed projects | medium |
| pole-barns | no completed projects | medium |
| other | no completed projects | low |

## Validation Findings

The validation engine now emits the following findings for services without coverage:

- **Rule:** `service-has-no-projects`  
  **Severity:** medium  
  **Message:** "Service has no completed projects: {service name}"

- **Rule:** `service-has-no-hero-media`  
  **Severity:** medium  
  **Message:** "Service has projects but no hero media: {service name}"

- **Rule:** `service-hero-media-missing`  
  **Severity:** high  
  **Message:** "Service project hero media not found in Media Authority: {service name}"

## Architecture Status

**Architecture:** ✅ Complete  
- Validation Engine validates services coverage
- Findings emitted for missing content
- UI remains pure consumer of authority data
- No silent fallback behavior

**Content Population:** ⚠️ Incomplete  
- 4 of 14 services have authority-backed media
- 10 services need project and media entries

## Next Steps

To achieve 100% service coverage, add to `projects.v1.json` and `media.v1.json`:

1. bathrooms project with hero media
2. painting project with hero media
3. finish-carpentry project with hero media
4. restoration project with hero media
5. outdoor-living project with hero media (or map pergolas to this service)
6. repairs project with hero media
7. built-ins project with hero media
8. adus project with hero media
9. pole-barns project with hero media

Each entry should follow the existing pattern:
- Project with `status: "completed"`, `featured: true`, and `media.hero` reference
- Media entry with `roles: ["hero", "after"]`, `featured: true`, and full variants
