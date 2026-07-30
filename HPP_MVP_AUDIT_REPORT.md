# HPP Strategic Pivot - MVP Audit Report

**Date:** July 28, 2026
**Objective:** Audit HPP for existing marketing infrastructure before building new features
**Rule:** Repurpose first. Build second. Never duplicate.

---

## Phase 1: HPP Repository Inventory

### Pages (41 total)

**Marketing Pages (Existing)**
- ✅ Homepage (`/`) - Hero, services, featured reviews, CTA
- ✅ Contact (`/contact`) - Phone, email, address, estimate CTA
- ✅ Estimate (`/estimate`) - Full multi-step estimate wizard
- ✅ Services (`/services`) - Service listing
- ✅ Services Detail (`/services/[slug]`) - Individual service pages
- ✅ Projects (`/projects`) - Project gallery
- ✅ Project Detail (`/projects/[slug]`) - Individual project pages
- ✅ Reviews (`/reviews`) - Review listing with filtering
- ✅ FAQ (`/faq`) - FAQ page
- ✅ About (`/about`) - About page
- ✅ Privacy (`/privacy`) - Privacy policy

**Admin Pages (Existing)**
- ✅ Admin Dashboard (`/admin/dashboard`) - Metrics and system status
- ✅ Admin Reviews (`/admin/reviews`) - Review moderation

**Authority Editor Pages (Existing - Not MVP)**
- Authority Editor (18 pages) - Constitutional runtime management
- Workbench (12 pages) - Runtime debugging and monitoring

**Missing for MVP**
- ❌ Newsletter signup page
- ❌ Newsletter archive page
- ❌ Blog listing page
- ❌ Blog post pages
- ❌ Resource library page
- ❌ Guide pages

### Components (50+ total)

**Reusable Marketing Components**
- ✅ `site-header.tsx` - Navigation, logo, theme toggle
- ✅ `site-footer.tsx` - Footer links, contact info
- ✅ `section.tsx` - Section container with heading
- ✅ `cta-section.tsx` - Call-to-action section
- ✅ `service-card.tsx` - Service display card
- ✅ `review-card.tsx` - Review display card
- ✅ `featured-review.tsx` - Featured review component
- ✅ `star-rating.tsx` - Star rating display
- ✅ `project-spotlight.tsx` - Project showcase
- ✅ `project-photos.tsx` - Project photo gallery
- ✅ `project-lightbox.tsx` - Photo lightbox
- ✅ `before-after-slider.tsx` - Before/after comparison
- ✅ `scroll-reveal.tsx` - Scroll animation
- ✅ `button.tsx` (UI) - Button component
- ✅ `card.tsx` (UI) - Card component
- ✅ `badge.tsx` (UI) - Badge component

**Form Components**
- ✅ `estimate-wizard.tsx` - Full multi-step estimate wizard (827 lines)
  - Service selection
  - Project details
  - Photo upload
  - Property information
  - Contact information
  - Draft recovery
  - Autosave
  - Validation

**Missing for MVP**
- ❌ Newsletter signup form
- ❌ Download gate form
- ❌ Blog post display component
- ❌ Guide display component
- ❌ Resource download component

### API Routes

**Existing APIs**
- ✅ `/api/estimate/route.ts` - Estimate submission (5458 bytes)
- ✅ `/api/reviews/route.ts` - Review management (10410 bytes)
- ✅ `/api/reviews/[id]` - Individual review operations
- ✅ `/api/reviews/bulk` - Bulk review operations
- ✅ `/api/auth/google` - Google OAuth
- ✅ `/api/admin/metrics` - Admin metrics
- ✅ `/api/admin/system` - Admin system status

**Missing for MVP**
- ❌ Newsletter subscription API
- ❌ Kit webhook handler
- ❌ Blog post API
- ❌ Resource download API
- ❌ Guide content API

### Content Systems

**Existing**
- ✅ Google Sheets integration (`lib/google-sheets.ts`) - 12712 bytes
- ✅ Media library (`lib/media.ts`) - Image/media management
- ✅ Service registry (`lib/registries.ts`) - Service data
- ✅ Project library (`lib/projects.ts`) - Project data
- ✅ Review library (`lib/reviews.ts`) - Review data
- ✅ Company data (`lib/company.ts`) - Company info
- ✅ Brand data (`lib/brand.ts`) - Brand assets
- ✅ FAQ data (`lib/faq.ts`) - FAQ content

**Missing for MVP**
- ❌ Blog content system (no markdown, no MDX, no CMS)
- ❌ Newsletter content system
- ❌ Guide content system
- ❌ Resource library system
- ❌ Static content folders for markdown

### Authentication

**Existing**
- ✅ Google OAuth (`lib/oauth.ts`, `/api/auth/google`)
- ✅ OAuth authority adapter pattern
- ✅ Provider configuration system

**Status:** Reuse as-is for admin access. Not needed for public newsletter signup.

### Dashboard

**Existing**
- ✅ Admin Dashboard (`/admin/dashboard`) - Metrics, system status
- ✅ Admin Reviews (`/admin/reviews`) - Review moderation
- ✅ Dashboard component with metrics fetching

**Status:** Reuse as-is. Add newsletter metrics when available.

---

## Phase 2: Cross-Repository Harvest (Email/Newsletter)

### Kit Integration Found

**Location:** `constitutional-runtime/notification/providers/kit.py`

**Capabilities:**
- ✅ Subscriber creation
- ✅ Tag management
- ✅ Sequence enrollment
- ✅ Broadcast triggering
- ✅ Webhook handling

**Transport:** Uses `TransportAuthority` for HTTP (retry, timeout, TLS)

**Maturity:** Production-ready, constitutional runtime integrated

**Webhook Adapter:** `constitutional-runtime/ingress/adapters/kit_webhook.py`
- Canonicalizes Kit webhooks to constitutional commands
- Maps Kit events to constitutional event names
- Ready for integration

**Reuse Recommendation:** Copy Kit provider and webhook adapter to HPP. Remove constitutional runtime dependencies (ExecutionContext, CanonicalAuthority) and replace with simplified HPP equivalents.

### Other Email Infrastructure

**Search Results:**
- ❌ No Mailchimp integration found
- ❌ No Resend integration found
- ❌ No Nodemailer integration found
- ❌ No SMTP integration found
- ❌ No React Email found
- ❌ No MJML found
- ❌ No email templates found

**Conclusion:** Kit is the only email/newsletter infrastructure available.

---

## Phase 3: PING Harvest (Presentation Layer)

### PING UI Components Found

**Location:** `constitutional-runtime/CascadeProjects/infra/ui-next/src/components/`

**Components:**
- `ArchitectureView.tsx` - Architecture visualization
- `EmptyStateRedesign.tsx` - Empty state display
- `MarkdownRenderer.tsx` - Markdown rendering
- `MessageInput.tsx` - Chat input
- `MessageList.tsx` - Chat message list
- `MissionControlHeader.tsx` - Mission control header
- `ModelSelector.tsx` - Model selection
- `ObservatoryMode.tsx` - Observatory mode
- `PremiumChatBubble.tsx` - Chat bubble
- `PromptLibrary.tsx` - Prompt library

**Assessment:** These are mission control/observatory components for constitutional runtime debugging. Not suitable for marketing website.

**Reuse Recommendation:** Do not harvest. HPP already has superior marketing components.

---

## Phase 4: Gap Analysis

### Newsletter Implementation

**Required:**
1. Homepage newsletter signup form
2. Kit API integration
3. Subscriber creation endpoint
4. Success confirmation
5. Tag assignment (e.g., "website-subscriber")
6. Optional: Sequence enrollment

**Gap Analysis:**
- ✅ Homepage exists - add signup form
- ✅ Kit provider exists in constitutional-runtime - copy and adapt
- ✅ TransportAuthority exists in constitutional-runtime - copy or use httpx directly
- ❌ Newsletter signup component - BUILD NEW
- ❌ Kit subscription API endpoint - BUILD NEW
- ❌ Kit webhook handler - BUILD NEW (adapt from constitutional-runtime)

**Classification:** Adapt Existing (Kit provider) + Build New (signup component, API endpoint)

### Newsletter Archive

**Required:**
1. Newsletter listing page
2. Newsletter detail pages
3. Markdown content system
4. Search functionality
5. Categories/tags

**Gap Analysis:**
- ❌ Newsletter listing page - BUILD NEW
- ❌ Newsletter detail page - BUILD NEW
- ❌ Markdown content system - BUILD NEW
- ✅ Search - can adapt existing search patterns
- ✅ Categories - can use existing tag patterns

**Classification:** Build New

### Blog

**Required:**
1. Blog listing page
2. Blog post pages
3. Markdown/MDX content system
4. Optional: Substack integration

**Gap Analysis:**
- ❌ Blog listing page - BUILD NEW
- ❌ Blog post page - BUILD NEW
- ❌ Markdown/MDX content system - BUILD NEW
- ❌ Substack integration - BUILD NEW (or defer)

**Classification:** Build New

### Resource Library

**Required:**
1. Resource listing page
2. Download gate form
3. PDF generation/storage
4. Budget planners
5. Inspection checklists
6. Maintenance guides

**Gap Analysis:**
- ❌ Resource listing page - BUILD NEW
- ❌ Download gate form - BUILD NEW
- ❌ PDF storage system - BUILD NEW
- ❌ Resource content system - BUILD NEW

**Classification:** Build New

### Guides

**Required:**
1. Guide listing page
2. Guide detail pages
3. Markdown content system
4. SEO optimization
5. Lead magnet CTAs

**Gap Analysis:**
- ❌ Guide listing page - BUILD NEW
- ❌ Guide detail page - BUILD NEW
- ❌ Markdown content system - BUILD NEW (reuse from blog/newsletter)
- ✅ SEO - Next.js handles this
- ✅ CTAs - existing CTA components

**Classification:** Build New

### Estimate Flow

**Required:**
1. Estimate wizard
2. Kit integration (tag subscriber as "estimate-requested")
3. Estimate submission API

**Gap Analysis:**
- ✅ Estimate wizard exists - REUSE AS-IS
- ✅ Estimate submission API exists - REUSE AS-IS
- ❌ Kit integration for estimate tagging - ADAPT EXISTING (Kit provider)

**Classification:** Reuse As-Is + Adapt Existing

---

## Summary

### Reuse As-Is (No Changes Required)

- Homepage
- Contact page
- Estimate page and wizard
- Services pages
- Projects pages
- Reviews pages
- FAQ page
- About page
- Privacy page
- Admin dashboard
- All marketing components (header, footer, cards, CTAs, etc.)
- Estimate submission API
- Review management API
- Google OAuth
- Google Sheets integration
- Media library
- Service registry
- Project library
- Review library
- Company data
- Brand data

### Adapt Existing (Small Changes Required)

- **Kit Provider** (`constitutional-runtime/notification/providers/kit.py`)
  - Remove constitutional runtime dependencies
  - Simplify for HPP use case
  - Add to HPP backend

- **Kit Webhook Adapter** (`constitutional-runtime/ingress/adapters/kit_webhook.py`)
  - Remove constitutional runtime dependencies
  - Simplify for HPP use case
  - Add webhook endpoint to HPP

- **TransportAuthority** (`constitutional-runtime/notification/transport_authority.py`)
  - Copy to HPP or use httpx directly
  - Simplify if needed

### Build New (Proven Not to Exist)

- Newsletter signup component
- Newsletter subscription API endpoint
- Kit webhook handler endpoint
- Newsletter listing page
- Newsletter detail page
- Blog listing page
- Blog post page
- Resource listing page
- Download gate form
- Guide listing page
- Guide detail page
- Markdown/MDX content system
- PDF storage system
- Resource content system
- Substack integration (deferred)

---

## Implementation Priority

### Phase 1: Newsletter (Immediate)
1. Copy and adapt Kit provider
2. Build newsletter signup component
3. Build subscription API endpoint
4. Add signup form to homepage
5. Test Kit integration

### Phase 2: Newsletter Archive (Short-term)
1. Build markdown content system
2. Build newsletter listing page
3. Build newsletter detail page
4. Add search and categories

### Phase 3: Blog (Medium-term)
1. Extend markdown system for blog
2. Build blog listing page
3. Build blog post page
4. Add SEO optimization

### Phase 4: Resources & Guides (Long-term)
1. Build resource listing page
2. Build download gate form
3. Build PDF storage system
4. Build guide pages
5. Add lead magnet CTAs

---

## Conclusion

HPP has a strong foundation with 41 pages, 50+ components, and working APIs. The estimate wizard is production-ready. Kit integration exists in constitutional-runtime and can be adapted.

**Key Gaps:** Newsletter, blog, resources, guides, and markdown content system are missing and must be built.

**Strategy:** Reuse all existing marketing infrastructure. Adapt Kit provider from constitutional-runtime. Build new only for content systems and missing pages.

**Next Step:** Implement Phase 1 (Newsletter) using adapted Kit provider and new signup component.
