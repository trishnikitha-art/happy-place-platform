# HPP + TenantOS Canonical Bootstrap Audit
**Date:** 2026-10-18  
**Objective:** Audit HPP as canonical tenant bootstrap template for rapid social substrate network expansion  
**Mode:** READ-ONLY AUDIT  
**Repository:** trishnikitha-art/happy-place-platform  
**Production Domain:** happyplacecarpentry.com

---

## Executive Summary

Happy Place Platform (HPP) is a sophisticated Next.js 15.5.24 application with:
- **Constitutional runtime architecture** (PING integration)
- **Multi-tenant safety enforcement** (tenantId, owner, authority boundaries)
- **Media authority system** (canonical identities, KV/R2 storage, publication gates)
- **Provider-agnostic capability broker** (Google, Jobber, Stripe, Twilio adapters)
- **Event-sourced domain model** (Identity, Mission, Evidence, Observation primitives)
- **Workbench administration** (text editing, media management, deployment coordination)

**Key Finding:** HPP is already implementing TenantOS architecture principles through:
1. Constitutional layering (PING framework integration)
2. Capability contracts with versioning
3. Media authority with immutable chains
4. Multi-tenant isolation enforcement
5. Provider-independent capability resolution

**Critical Gap:** Documentation describes "frontend-only MVP with placeholder assets" but actual code is substantially more elaborate. The repository contains 100+ audit reports but many are historical/stale.

---

## 1. Git Baseline

### Repository State
- **Branch:** `main` (checked out, clean working tree)
- **HEAD:** `0a597c943b9b72bb3f7319a3e962ccd852a57fa7`
- **Latest Commit:** "fix: isolate public homepage from workbench previews (#7)"
- **Remote:** `https://github.com/trishnikitha-art/happy-place-platform.git`
- **Branches:** 11 total including `codex/hpp-discovery-main-20261016`, `codex/hpp-release-composition-20261011`, research branches

### Recent Commit History (last 30)
```
0a597c94 fix: isolate public homepage from workbench previews (#7)
0ad33343 feat: add bounded append-only UI research workflow (#5)
8e63442e fix: respond to live reduced motion preference changes
3cae81fb fix: show Google session freshness in connection details
93febdc4 perf: overlap homepage authority reads and identify Drive connection
ef64922d fix: restore dialog focus and preserve native scroll ownership
c8756083 fix: match loading feedback to editor and public content
247df1da fix: reorder photos across the complete archive in a row-first grid
6b443a26 Workbench: accept media changes
b3fb5be7 fix: retain every batch receipt in Git recovery markers
4d9c8d5f Workbench: accept media changes
f4d7eda6 fix: preserve gallery sharpness and reset staged field immediately
94192d9b fix: activate inline copy, batch approved edits, and reduce gallery work
b593b91c Workbench: accept media changes
573a1345 fix: edit service area and hours in preview and restore contact contrast
6c37d4bb fix: keep inline copy review readable in dark mode
cc149a9d Workbench: accept media changes
71b7c9a4 Workbench: accept media changes
43193a98 fix: verify text publication identity on every page
435fb3dc fix: edit canonical website copy directly in preview
720ffb94 fix: preserve Drive reconnect authority and clarify media evidence
5b89a70a fix: unify website editing and consolidate service layouts
07ff60a7 fix: native workbench scrolling and transactional content visibility
d4199a54 Workbench: accept media changes
2f2e502c fix: harden text transaction review recovery and publication proof
ed1b19e2 feat: expand reviewed text editing to homepage hero copy
e4a7d6a7 Workbench: accept media changes
3ba07aef Workbench: accept media changes
ff4d7315 feat: stage and preview homepage text through deployment coordinator
090de4c6 fix: project verified R2 media through canonical public origin
```

### Deployment Discrepancy (from CEO directive)
- **Latest Vercel deployment:** `codex/hpp-performance-surgical-20261018`, commit `9cb222cf62530eebe6d553a0c4c4fa41815e2071`
- **GitHub main HEAD:** `0a597c94` (different from deployed commit)
- **Deployment status:** READY but associated with preview branch, not production target
- **Production domain status:** `live: false`, previous production deployment on commit `0ad33343bdb4d1880aae731530bb5158ed29cc54`

**Implication:** Production domain may not be serving latest main code. Live verification required.

---

## 2. Technology Stack

### Core Dependencies
```json
{
  "next": "15.5.24",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "node": "24.x",
  "typescript": "^5"
}
```

### Key Libraries
- **UI/Motion:** `framer-motion@12.42.2`, `lenis@1.3.26` (smooth scroll)
- **Storage:** `@upstash/redis@1.34.4`, `@vercel/blob@2.8.0`, `@aws-sdk/client-s3@3.1147.0`
- **Google:** `googleapis@144.0.0`
- **Image Processing:** `sharp@0.35.5`
- **Styling:** `tailwindcss@4`, `class-variance-authority@0.7.1`
- **Icons:** `lucide-react@1.25.0`

### Build Pipeline
```bash
"build": "node scripts/graph-edge-generator.js && node scripts/constitutional-projection-generator.js && next build"
```
- Generates graph edges
- Generates constitutional projections
- Builds Next.js application

---

## 3. Public Route Inventory

### Primary Public Routes (18 pages)
```
/ (homepage)
/about
/blog
/blog/[slug]
/contact
/estimate
/faq
/gallery
/newsletter
/newsletter/thank-you
/our-work
/privacy
/projects/[slug]
/review
/reviews
/services
/services/[slug]
```

### Workbench Routes (admin, not public)
```
/workbench
/workbench/login
/workbench/connectors
/workbench/content
/workbench/estimate
/workbench/evidence
/workbench/execution
/workbench/explorer/drive
/workbench/explorer
/workbench/graph
/workbench/media
/workbench/projections
/workbench/recommendations
/workbench/reconcile
/workbench/replay
/workbench/settings
/workbench/text
/workbench/timeline
/workbench/voice-factory
/workbench/preview/[[...path]]
```

### Admin Routes (protected)
```
/admin/dashboard
/admin/reviews
```

### API Routes (100+ endpoints)
- Admin diagnostics (30+): media reconciliation, KV bootstrap, OAuth state, etc.
- Drive integration (8+): auth, discovery, files, folder, ingest, search
- Public APIs: estimate, health, reviews, newsletter, projections
- Workbench APIs: text lifecycle, media authority, materialization, deployment

---

## 4. Component Architecture

### Core UI Components (50+)
**Navigation:**
- `site-header.tsx` - Main navigation with tape-measure theme
- `site-footer.tsx` - Footer with links and contact
- `mobile-site-navigation.tsx` - Mobile navigation
- `tape-measure-nav.tsx` - Brand navigation component

**Hero/Visual:**
- `visual-slot.tsx` - Dynamic media slot with authority tracking
- `workshop-atmosphere.tsx` - Particle effects
- `blueprint-grid.tsx` - Decorative grid background
- `parallax-image.tsx` - Parallax scrolling images
- `cedar-corner.tsx` - Brand accent decoration
- `tool-mark.tsx` - Brand signature mark

**Content:**
- `text-copy.tsx` - Canonical text with editing capability
- `content-copy.tsx` - Content copy with route support
- `before-after-slider.tsx` - Interactive before/after comparison
- `service-card.tsx` - Service display card
- `project-spotlight.tsx` - Project showcase
- `review-card.tsx` - Review display
- `newsletter-signup.tsx` - Email signup

**Conversion:**
- `estimate-wizard.tsx` - Multi-step estimate form
- `cta-section.tsx` - Call-to-action section
- `tracked-contact.tsx` - Contact form with tracking

**Motion:**
- `scroll-reveal.tsx` - Scroll-triggered animations
- `motion-provider.tsx` - Framer Motion context
- `lenis-provider.tsx` - Smooth scroll provider
- `wood-grain-shimmer.tsx` - Material texture effect

**Utility:**
- `loading-ui.tsx` - Loading states
- `photo-placeholder.tsx` - Fallback for missing images
- `card-light-sweep.tsx` - Hover effect
- `pencil-line.tsx` - Section separator

### Workbench Components (admin-only)
Full admin interface with:
- Media management
- Text editing
- Deployment coordination
- Drive integration
- Materialization control

---

## 5. Media Authority System

### Canonical Media Architecture

**Data Flow:**
```
photo-intake/ (folder source)
    ↓ npm run images
generated/ + public/images/ + gallery.json
    ↓
media.v1.json (canonical manifest)
    ↓
KV Store (runtime assignments)
    ↓
resolvePublicMedia() (public gate)
    ↓
VisualSlot (rendered with authority tracking)
```

### Key Libraries
- `media.ts` - Core media resolution
- `media-kv-store.ts` - KV storage adapter
- `r2-storage.ts` - R2 object storage
- `visual-asset-registry.ts` - Asset canonicalization
- `brand.ts` - Brand media authority
- `projects.ts` - Project media authority
- `homepage-service-media.ts` - Service card media

### Media Gate Safety
```typescript
// Public media gate enforces:
- DriveReference rejection (drive-prefixed IDs blocked)
- Storage contract validation (static vs blob)
- Publication state check (lifecycleState: "published")
- Runtime fallback to static authority during builds
```

### Media Inventory (from AGENTS.md)
- **Total media records:** 96
- **Valid published assets:** All 96 with `lifecycleState: "published"`, `source: "local"`, `storage: "static"`
- **Brand media:** brand-hero, brand-portrait, brand-featured all valid
- **Project media:** 14 projects with valid hero and gallery references

### Known Issues
- **Data integrity findings:** 4 duplicate content hash groups, 70 placeholder-hash records (documented, requires forensic investigation)
- **Gallery projection:** Potentially stale `.generated/gallery-projection.json` (needs regeneration)

---

## 6. TenantOS Architecture Integration

### Constitutional Convergence (from TENANT_OS_ARCHITECTURE.md)

**Core Principle:** Tenant OS is a Sovereign Constitutional Node within PING framework

**Domain Primitives (Four):**
```
Identity → Mission → Evidence → Observation → Fact → Knowledge (computed)
```

**Runtime Services:**
- Planner (Intent generation)
- Capability Broker (Provider resolution)
- Repository (Event store)
- Projection (Read models)
- Replay (State reconstruction)
- Witness (Verification)
- Kernel (Constitutional execution)
- Constitution (Rules and contracts)

**Capability Contracts:**
- Calendar (schedule, cancel, reschedule, availability, conflict-detection)
- Payments (charge, refund, subscription, invoice)
- CRM (create customer, update customer, sync contacts)
- Messaging (send email, send SMS, send notification)
- Storage (upload, download, delete, archive)
- Vision (detect objects, classify images, extract text)
- Scheduling (find window, detect conflict, optimize schedule)

### Key Architectural Decisions
1. **Knowledge as computed, not stored** - derived from verified facts
2. **Mission as event-sourced aggregate root** - state reconstructed from events
3. **Evidence immutable chain** - raw → observation → claim → verification → fact
4. **Planner produces intent, not execution** - provider-independent
5. **Capability registry with versioning** - constitutional contracts
6. **Separate repository from projection** - immutable event store vs ephemeral read models
7. **Identity canonical across providers** - externalId mappings
8. **Observation authority** - constitutional verification at each stage

### Generation-Based Architecture
```
PING Kernel
    ↓
Tenant Constitution
    ↓
Generation Manifest
    ↓
Code Generator
    ↓
Repositories, Services, Events, APIs, Tests, Projections, Replay, Witness
```

**Key Insight:** Constitution becomes executable source code for PING agents to compile into application.

---

## 7. Visual Identity System

### Brand Palette (from globals.css @theme)
- **Primary (evergreen):** `#1F3F3C`
- **Honey (accent):** `#d99a4e`
- **Accent (taupe):** `#B0A092`
- **Background (linen):** `#EDEAE0`
- **Cream:** `#E9DBC9`
- **Surface:** `#EDEDED`
- **Deep:** `#162b29`

### Typography
- **Display headings:** Playfair Display (via `font-display` CSS variable)
- **Signature:** Playball (brand signature)
- **Body:** System font stack

### Brand Signature Elements
- Cedar corner accent
- Evergreen gradient
- Warm golden light on photos
- Tape-measure mark
- Honey CTA buttons

### Design Principles (from AGENTS.md)
- Cedar *principles* (organic rhythm, depth over borders, floating content, offset/overlapping images)
- Photography leads layout order (hero photo → composition → typography → copy → CTA)
- Every image explicitly mapped with focal point surviving desktop/tablet/mobile
- No cropping of craftsmanship

---

## 8. Standing Design Directives

### A. Owner Introduction
- Single "Meet Taylor & Lanie" block on homepage + full story on /about
- No repeated owner name-drops elsewhere
- Brand speaks as "Happy Place Carpentry"

### B. Original Voice Preservation
- Old Google Site is source material
- Modernize *presentation*, never rewrite voice

### C. Photography Authority
- Layout order = Hero photo → Composition → Typography → Copy → CTA
- Never fit photos into pre-made grid

### D. Explicit Image Mapping
- Every image mapped in `photo-intake/manifest.schema.json`
- Deterministic + editable
- No "first file in folder"

### E. Project-Centric Media
- `Project → Hero/Before/After/Details/Homeowner/Timeline/Materials`
- Galleries, project pages, home features derive from project

### F. Focal Point Preservation
- Each image has `focal:{x,y}` surviving desktop/tablet/mobile
- Joints, trim, railings, cabinetry preserved

### G. Image QA Gate
- `npm run qa:images` before every deploy
- Hero crops, no stretch, before/after aligned, mobile/desktop crops, retina sharp, lazy-load, alt text, blur placeholders, no broken images
- Fails → block deploy

### H. Simple V1 Pipeline
- Owner drops photos in `photo-intake/<Folder>/`
- `npm run images` archives originals, generates AVIF/WebP/thumb/blur, writes `gallery.json`, commits
- No AI/db/hidden automation

### I. Folder = Source of Truth
- Folder name supplies category
- `CATEGORY_MAP` maps to canonical category

### J. Every Commit Refines Visuals
- Each near-end commit adds ≥1 polish (spacing/type/alignment/composition/mobile rhythm/hover/loading)
- Site gets visibly better each commit

### K. Photography Authority Over Copy
- If strong photo communicates what paragraph says, shorten or remove paragraph
- Every commit should make site feel more premium in under five seconds

---

## 9. Performance & Motion System

### Motion Library
- **Framer Motion 12.42.2** - Core animation library
- **Lenis 1.3.26** - Smooth scroll
- **Custom components:** scroll-reveal, parallax-image, wood-grain-shimmer, workshop-atmosphere

### Image Loading Strategy
- **Next.js Image** with priority loading for hero
- **Responsive variants** - webp, original, blur placeholders
- **Lazy loading** for below-fold images
- **BlurDataURL** for progressive enhancement

### Performance Scripts
- `npm run qa:images` - Image quality verification
- Build-time graph edge generation
- Build-time constitutional projection generation

---

## 10. Documentation Landscape

### Audit Reports (100+ markdown files in website/)
**Key Categories:**
- Media authority audits (30+)
- Deployment audits (20+)
- Drive/OAuth audits (15+)
- Constitutional architecture (10+)
- Performance audits (10+)
- UI research (10+)
- TenantOS integration (5+)

**Critical Documentation:**
- `TENANT_OS_ARCHITECTURE.md` - Constitutional framework integration
- `AGENTS.md` - Standing engineering rules
- `README.md` - Outdated (describes "frontend-only MVP with placeholder assets")

**Note:** Many reports are historical/stale. Current code is substantially more elaborate than documentation suggests.

---

## 11. Next Audit Phases

### Phase 1: Visual Identity & Art Direction
- Typography hierarchy audit
- Color system verification
- Composition analysis
- Brand signature consistency

### Phase 2: Homepage Hero & First Impression
- Hero image quality assessment
- Typography rhythm
- CTA visibility
- Mobile hero experience
- Load performance

### Phase 3: Project Gallery & Storytelling
- Project case study quality
- Before/after implementation
- Gallery filtering UX
- Project page completeness
- Visual storytelling

### Phase 4: Service Pages & Clarity
- Service information completeness
- Pricing/expectation communication
- Visual consistency
- Conversion optimization

### Phase 5: Estimate Journey & Conversion
- Estimate wizard UX
- Form friction analysis
- Completion rates
- Mobile estimate flow
- Feedback loops

### Phase 6: Trust Signals
- Review authenticity
- Owner identity presentation
- Proof of work quality
- Local relevance
- Social proof integration

### Phase 7: Mobile Experience
- Responsive design audit
- Touch target sizing
- Mobile navigation
- Mobile performance
- Mobile-specific UX patterns

### Phase 8: Accessibility
- Keyboard navigation
- Screen reader compatibility
- Color contrast verification
- Focus states
- ARIA landmarks

### Phase 9: Performance
- Core Web Vitals measurement
- Image optimization
- Animation cost analysis
- Bundle size optimization
- Network waterfall analysis

### Phase 10: SEO
- Metadata completeness
- Structured data
- Sitemap verification
- Robots.txt audit
- Local SEO optimization

### Phase 11: External Research
- Research 100 website references (Awwwards, CSS Design Awards, etc.)
- Competitive analysis (5 relevant references)
- Pattern extraction
- Adaptation feasibility assessment

### Phase 12: Canonical Tenant Bootstrap Template
- Extract HPP as canonical tenant
- Document tenant bootstrap process
- Create tenant configuration schema
- Design tenant onboarding flow
- Specify tenant customization boundaries

---

## 12. Immediate Concerns

### Critical
1. **Production deployment discrepancy** - Latest code not deployed to production domain
2. **DNS misconfiguration** - Domain pointing to Squarespace instead of Vercel
3. **Vercel build gate** - Ignored-build step intentionally skipping production builds

### High Priority
1. **Documentation drift** - README describes MVP but code is production-ready
2. **Stale audit reports** - 100+ reports, many historical
3. **Gallery projection** - Potentially stale, needs regeneration
4. **Data integrity issues** - Duplicate hashes, placeholder records need investigation

### Medium Priority
1. **Shared caching disabled** - Pending authority and cache-safety requirements
2. **Preview isolation** - Environment variables span Preview/Production
3. **Media authority validation** - Needs runtime verification against KV/R2

---

## 13. Canonical Tenant Bootstrap Template Requirements

Based on HPP + TenantOS architecture, canonical tenant bootstrap should include:

### Required Tenant Configuration
1. **Tenant identity** (name, domain, owner)
2. **Brand configuration** (colors, typography, signature elements)
3. **Media authority setup** (KV/R2 credentials, publication gates)
4. **Capability contracts** (Google Workspace, payment, CRM, etc.)
5. **Provider adapters** (OAuth credentials, API keys)
6. **Constitutional policies** (business rules, approval workflows)
7. **Navigation structure** (public routes, admin routes)
8. **Content schema** (homepage, services, projects, reviews)
9. **Estimate workflow** (question definitions, routing rules)
10. **Localization** (language, currency, service area)

### Bootstrap Process
1. **Tenant creation** - Generate tenantId, initialize KV/R2 buckets
2. **Brand setup** - Configure colors, typography, upload logo
3. **Provider connection** - OAuth flows, API key registration
4. **Content import** - Initial projects, services, reviews
5. **Constitution setup** - Define authorities, policies, contracts
6. **Route generation** - Generate public pages from content schema
7. **Admin onboarding** - Create admin user, set permissions
8. **Verification** - Test OAuth chains, media authority, deployment

### Customization Boundaries
- **Fixed:** Constitutional kernel, runtime execution, authority boundaries
- **Configurable:** Brand identity, content schema, provider selection, business policies
- **Extensible:** Capability contracts, workflow rules, custom integrations

---

## 14. Audit Status

**Completed:**
- ✅ Git baseline
- ✅ Technology stack inventory
- ✅ Public route inventory
- ✅ Component architecture
- ✅ Media authority system documentation
- ✅ TenantOS architecture review
- ✅ Visual identity system
- ✅ Standing design directives
- ✅ Documentation landscape

**In Progress:**
- 🔄 Visual identity detailed audit
- 🔄 Homepage hero analysis
- 🔄 Media authority runtime verification

**Pending:**
- ⏳ Project gallery audit
- ⏳ Service pages audit
- ⏳ Estimate journey audit
- ⏳ Trust signals audit
- ⏳ Mobile experience audit
- ⏳ Accessibility audit
- ⏳ Performance audit
- ⏳ SEO audit
- ⏳ External research (100 references)
- ⏳ Competitive comparison
- ⏳ Scorecard generation
- ⏳ Ideal experience specification
- ⏳ Canonical tenant bootstrap template design
- ⏳ 10,000x animation improvements documentation

---

## 15. Preliminary Assessment

### Strengths
1. **Sophisticated architecture** - Constitutional runtime, media authority, multi-tenant safety
2. **Rich component library** - Before/after sliders, scroll reveals, visual slots
3. **Provider independence** - Capability broker pattern, adapter architecture
4. **Brand identity system** - Consistent palette, typography, signature elements
5. **Media governance** - Canonical identities, publication gates, QA pipeline
6. **Extensive audit trail** - 100+ reports document decisions and issues

### Weaknesses
1. **Production deployment gap** - Latest code not deployed
2. **Documentation drift** - README describes MVP, reality is production platform
3. **Stale audit reports** - Historical reports need verification against current code
4. **Shared environment secrets** - Preview/Production not fully isolated
5. **Data integrity issues** - Duplicate hashes, placeholder records need investigation
6. **DNS misconfiguration** - Domain not pointing to Vercel

### Opportunities for Tenant Bootstrap
1. **Extractable patterns** - Media authority, capability broker, constitutional runtime
2. **Configurable brand system** - Colors, typography, signature elements
3. **Modular content schema** - Projects, services, reviews structure
4. **Pluggable providers** - Google, Jobber, Stripe, Twilio adapters
5. **Admin Workbench** - Complete CMS for content and media management
6. **Generation architecture** - Constitution → Code generator pattern

### Risks for Tenant Bootstrap
1. **Complexity** - System is sophisticated, may overwhelm simple tenants
2. **Configuration burden** - Many moving parts (KV, R2, OAuth, providers)
3. **Media pipeline** - Photo intake pipeline requires owner participation
4. **Documentation debt** - Current docs don't reflect actual capabilities
5. **Deployment complexity** - Build gates, environment variables, DNS setup

---

## 16. Next Steps

### Immediate (This Session)
1. Complete visual identity detailed audit
2. Audit homepage hero implementation
3. Verify media authority runtime behavior
4. Begin 100 external website references research

### Short-term (Next Session)
1. Complete performance audit
2. Complete accessibility audit
3. Complete SEO audit
4. Build competitive comparison (5 references)

### Medium-term
1. Generate comprehensive scorecard
2. Specify ideal HPP experience (P0/P1/P2/P3)
3. Design canonical tenant bootstrap template
4. Document 10,000x animation improvements

### Long-term
1. Implement tenant bootstrap process
2. Create tenant onboarding flow
3. Validate tenant bootstrap with test tenant
4. Deploy canonical template

---

**Status:** Baseline audit complete. Proceeding with detailed phase audits.
