# STRING INTEGRATION - PHASE 2 SURGICAL PATCH PLAN

## EXECUTION SUMMARY

**Status:** READ-ONLY - NO EDITS YET
**Phase:** 2 of 4 (Forensic Harvest → Canonical Key Map → Surgical Patch → Validation)
**Approach:** Surgical file-by-file replacements with semantic keys

## CANONICAL KEY MAP

Based on the forensic harvest, 85 CANONICAL strings will be mapped to semantic keys following this structure:

### Namespace Convention
- `nav.*` - Navigation items
- `homepage.*` - Homepage-specific strings
- `services.*` - Services section strings
- `featuredProjects.*` - Featured projects section
- `reviews.*` - Reviews section
- `trust.*` - Trust signals/statistics
- `family.*` - Family/owner section
- `about.*` - About page
- `contact.*` - Contact page
- `estimate.*` - Estimate page
- `review.*` - Review form
- `workbench.*` - Workbench UI
- `newsletter.*` - Newsletter signup
- `cta.*` - Call-to-action components
- `beforeAfter.*` - Before/after slider
- `placeholder.*` - Placeholder sections
- `api.error.*` - API error messages
- `a11y.*` - Accessibility strings

### Full Canonical Key Mapping

#### Navigation (nav.*)
```json
{
  "nav.home": "Home",
  "nav.services": "Services",
  "nav.ourWork": "Our Work",
  "nav.about": "About",
  "nav.reviews": "Reviews",
  "nav.estimate": "Get a Free Estimate"
}
```

#### Homepage (homepage.*)
```json
{
  "homepage.hero.title": "Your favorite part of coming home should be the home itself.",
  "homepage.hero.description": "We repair, restore, and improve homes across the Mid-Willamette Valley. The work should look right the day we leave, and still look right years later.",
  "homepage.seeOurWork": "See Our Work",
  "homepage.tellUsPlanning": "Tell us what you're planning."
}
```

#### Trust Signals (trust.*)
```json
{
  "trust.licensed": "Licensed, Bonded & Insured",
  "trust.familyOwned": "Family-Owned",
  "trust.serviceArea": "Mid-Willamette Valley",
  "trust.projectsCompleted": "Projects Completed"
}
```

#### Services (services.*)
```json
{
  "services.title": "A few ways we can help",
  "services.description": "Pick a service to start a free estimate — we'll guide you through the rest."
}
```

#### Featured Projects (featuredProjects.*)
```json
{
  "featuredProjects.title": "Recent Work",
  "featuredProjects.description": "A selection of our latest work across the Mid-Willamette Valley.",
  "featuredProjects.seeAll": "See all projects"
}
```

#### Family Section (family.*)
```json
{
  "family.tagline": "Built by one family. Trusted by many more.",
  "family.title": "A family business built on doing things the right way."
}
```

#### Reviews (reviews.*)
```json
{
  "reviews.title": "What people say once the work's done",
  "reviews.empty": "We are building our review portfolio. In the meantime, ask us for references in your neighborhood.",
  "reviews.readAll": "Read all reviews",
  "reviews.helpingNeighbors": "Helping neighbors find their happy place",
  "reviews.leaveReview": "Leave a Review"
}
```

#### About Page (about.*)
```json
{
  "about.serviceArea.title": "Serving the mid-Willamette Valley",
  "about.cta.title": "Ready to love coming home again?"
}
```

#### Contact Page (contact.*)
```json
{
  "contact.title": "Let's talk about your project",
  "contact.phone": "Phone",
  "contact.email": "Email",
  "contact.serviceArea": "Service area",
  "contact.hours": "Hours"
}
```

#### Estimate Page (estimate.*)
```json
{
  "estimate.title": "Let's scope your project",
  "estimate.description": "About two minutes. Your details go straight to our inbox — no account, no spam."
}
```

#### Review Form (review.*)
```json
{
  "review.thankYou": "Thank you",
  "review.thankForTrusting": "Thank you for trusting Taylor and Lanie with your project.",
  "review.tellUsAboutProject": "Tell us about your project",
  "review.label.yourName": "Your name",
  "review.label.city": "City (optional)",
  "review.label.service": "What did we work on?",
  "review.label.rating": "How would you rate your experience?",
  "review.label.experience": "Tell us about your experience",
  "review.submit": "Share your experience"
}
```

#### Workbench (workbench.*)
```json
{
  "workbench.login.title": "Workbench Login",
  "workbench.login.subtitle": "Administrative access required",
  "workbench.login.password": "Password",
  "workbench.login.placeholder": "Enter workbench password",
  "workbench.login.button": "Login",
  "workbench.connectors.title": "Connector Studio",
  "workbench.connectors.connectDrive": "Connect Drive",
  "workbench.connectors.openDrive": "Open Drive",
  "workbench.explorer.title": "Google Drive Explorer",
  "workbench.explorer.search": "Search files and folders...",
  "workbench.explorer.useAsset": "Use This Asset"
}
```

#### Newsletter (newsletter.*)
```json
{
  "newsletter.title": "Stay Ahead of Home Maintenance",
  "newsletter.description": "Get practical homeowner tips, seasonal maintenance reminders, remodeling ideas, project showcases, and exclusive offers delivered to your inbox.",
  "newsletter.emailPlaceholder": "Email address",
  "newsletter.firstNamePlaceholder": "First name (optional)",
  "newsletter.subscribe": "Subscribe",
  "newsletter.noSpam": "No spam, ever. Unsubscribe anytime."
}
```

#### CTA Components (cta.*)
```json
{
  "cta.startFreeEstimate": "Start Your Free Estimate"
}
```

#### Service Card (serviceCard.*)
```json
{
  "serviceCard.startQuote": "Start a quote",
  "serviceCard.photosComingSoon": "Project photos coming soon"
}
```

#### Placeholder (placeholder.*)
```json
{
  "placeholder.gallery": "Project Photos Coming Soon",
  "placeholder.gallery.description": "We're currently building our portfolio. Check back soon to see our latest work."
}
```

#### Before/After (beforeAfter.*)
```json
{
  "beforeAfter.before": "Before",
  "beforeAfter.after": "After"
}
```

#### API Errors (api.error.*)
```json
{
  "api.error.unauthorized": "Unauthorized",
  "api.error.workbenchAuthRequired": "Workbench authentication required",
  "api.error.driveDiscoveryFailed": "Failed to discover Drive structure",
  "api.error.driveFilesFailed": "Failed to list Drive files",
  "api.error.estimateFailed": "Estimate submission failed",
  "api.error.reviewValidationFailed": "Review validation failed",
  "api.error.newsletterFailed": "Failed to subscribe to newsletter"
}
```

#### Accessibility (a11y.*)
```json
{
  "a11y.theme.toggle": "Toggle theme",
  "a11y.siteHeader.home": "{company.name} home",
  "a11y.siteHeader.primary": "Primary",
  "a11y.siteHeader.mobile": "Mobile",
  "a11y.siteHeader.closeMenu": "Close menu",
  "a11y.siteHeader.openMenu": "Open menu"
}
```

## DYNAMIC STRING TEMPLATES

These require interpolation support:

```json
{
  "dynamic.about.hero.title": {
    "template": "Every family deserves a {signature} place.",
    "variables": ["signature"],
    "canonicalText": "Every family deserves a happy place."
  },
  "dynamic.estimate.preferTalk": {
    "template": "Prefer to talk? Call {phone} or email {email}.",
    "variables": ["phone", "email"]
  },
  "dynamic.starRating.aria": {
    "template": "Rated {rating} out of 5",
    "variables": ["rating"]
  },
  "dynamic.stats.average": {
    "template": "{stats.average} / 5 across {stats.count} featured reviews from homeowners across the Willamette Valley.",
    "variables": ["stats.average", "stats.count"]
  }
}
```

## CONTEXTUAL STRINGS - REQUIRE HUMAN REVIEW

```json
{
  "contextual.about": {
    "currentText": "About",
    "contexts": [
      "nav.about (navigation link)",
      "footer.about (footer section heading)",
      "page.about (page title)"
    ],
    "recommendation": "Keep separate keys for each context despite identical English text",
    "proposedKeys": {
      "nav.about": "About",
      "footer.about": "About",
      "page.about.title": "About"
    }
  }
}
```

## DO-NOT-TOUCH IDENTIFIER LIST (LOCKED)

These 36 identifiers must NEVER be modified:

```json
{
  "lockedIdentifiers": [
    "driveCurrentDriveId",
    "driveBreadcrumb",
    "driveFiles",
    "driveStructure",
    "driveLoading",
    "driveError",
    "driveCurrentFolderId",
    "driveSelectedFile",
    "driveViewMode",
    "driveNextPageToken",
    "driveLoadingMore",
    "/api/drive/discovery",
    "/api/drive/files",
    "/api/drive/reference",
    "/api/drive/auth/status",
    "/api/drive/oauth/authorize",
    "/api/drive/oauth/callback",
    "/api/workbench/login",
    "application/vnd.google-apps.folder",
    "OAuth",
    "httpOnly",
    "sameSite",
    "workbenchSession",
    "driveSession",
    "mediaId",
    "fileId",
    "folderId",
    "pageToken",
    "driveId",
    "ServiceCard",
    "ProjectSpotlight",
    "VisualSlot",
    "BeforeAfterSlider",
    "EstimateWizard",
    "NewsletterSignup",
    "ThemeToggle",
    "SiteHeader",
    "SiteFooter",
    "CTASection",
    "StarRating",
    "ProjectLightbox",
    "PlaceholderSection"
  ]
}
```

## SURGICAL PATCH PLAN - FILE BY FILE

### Files Requiring Changes (18 files)

#### 1. src/app/page.tsx
**Changes:** 12 string replacements
- Lines 113, 116, 119, 125, 147, 159-162, 183-184, 220-221, 269, 281, 283, 328, 344, 350

#### 2. src/app/about/page.tsx
**Changes:** 3 string replacements
- Lines 39 (DYNAMIC), 69, 82

#### 3. src/app/contact/page.tsx
**Changes:** 5 string replacements
- Lines 29, 35, 39, 43, 47, 61

#### 4. src/app/estimate/page.tsx
**Changes:** 3 string replacements
- Lines 28, 29, 37 (DYNAMIC)

#### 5. src/app/reviews/page.tsx
**Changes:** 3 string replacements
- Lines 32, 34 (DYNAMIC), 45

#### 6. src/app/review/page.tsx
**Changes:** 8 string replacements
- Lines 102, 106, 163, 186, 201, 215, 238, 258, 302

#### 7. src/app/workbench/login/page.tsx
**Changes:** 5 string replacements
- Lines 50, 52, 59, 67, 83

#### 8. src/app/workbench/connectors/page.tsx
**Changes:** 3 string replacements
- Lines 132, 202, 212

#### 9. src/app/workbench/explorer/drive/page.tsx
**Changes:** 3 string replacements
- Lines 184, 199, 371

#### 10. src/components/site-header.tsx
**Changes:** 6 string replacements
- Lines 89 (DYNAMIC/ACCESSIBILITY), 101 (ACCESSIBILITY), 113, 135 (ACCESSIBILITY), 144 (ACCESSIBILITY)

#### 11. src/components/site-footer.tsx
**Changes:** 3 string replacements
- Lines 40, 44, 50

#### 12. src/components/service-card.tsx
**Changes:** 2 string replacements
- Lines 82, 90

#### 13. src/components/cta-section.tsx
**Changes:** 3 string replacements
- Lines 9, 25, 28

#### 14. src/components/newsletter-signup.tsx
**Changes:** 6 string replacements
- Lines 63, 66, 75, 87, 110, 116

#### 15. src/components/theme-toggle.tsx
**Changes:** 2 string replacements (ACCESSIBILITY)
- Lines 20, 33

#### 16. src/components/before-after-slider.tsx
**Changes:** 2 string replacements
- Lines 170, 171

#### 17. src/components/star-rating.tsx
**Changes:** 1 string replacement (DYNAMIC/ACCESSIBILITY)
- Line 17

#### 18. src/components/placeholder-section.tsx
**Changes:** 2 string replacements
- Lines 42, 43

#### API Routes (8 files - error messages only)
19. src/app/api/drive/discovery/route.ts (3 replacements)
20. src/app/api/drive/files/route.ts (3 replacements)
21. src/app/api/workbench/login/route.ts (1 replacement)
22. src/app/api/estimate/route.ts (1 replacement)
23. src/app/api/reviews/route.ts (1 replacement)
24. src/app/api/newsletter/subscribe/route.ts (1 replacement)

## VALIDATION GATES

### Pre-Commit Validation
1. **TypeScript Compilation**
   ```bash
   npx tsc --noEmit
   ```
   Must pass with zero errors.

2. **Production Build**
   ```bash
   npm run build
   ```
   Must succeed with zero build errors.

3. **Grep for Hardcoded Strings**
   ```bash
   # Check for remaining hardcoded customer-facing strings
   grep -r "Home\|Services\|Our Work\|About\|Reviews" src/app/ src/components/ --exclude-dir=node_modules
   ```
   Should return zero matches in customer-facing components.

4. **Grep for Locked Identifiers**
   ```bash
   # Confirm locked identifiers unchanged
   grep -r "driveCurrentDriveId\|driveBreadcrumb\|/api/drive/discovery" src/ --exclude-dir=node_modules
   ```
   Should return existing matches (no changes).

### Post-Commit Validation
5. **Visual Verification - Customer Routes**
   - http://localhost:3000/
   - http://localhost:3000/services
   - http://localhost:3000/our-work
   - http://localhost:3000/about
   - http://localhost:3000/reviews
   - http://localhost:3000/estimate
   - http://localhost:3000/contact

6. **Visual Verification - Workbench Routes**
   - http://localhost:3000/workbench/login
   - http://localhost:3000/workbench/connectors
   - http://localhost:3000/workbench/media
   - http://localhost:3000/workbench/explorer/drive

7. **Behavior Verification**
   - Navigation still works
   - Forms still submit
   - Media Workbench still functions
   - Drive integration still works
   - No API contract changes

8. **Git Diff Review**
   ```bash
   git diff
   ```
   Diff should be overwhelmingly string/copy changes only.
   No component behavior changes.
   No API route changes.
   No Drive integration changes.

## IMPLEMENTATION ORDER

### Phase 2A: Create Canonical String Layer
1. Create `src/lib/strings.ts` - centralized string exports
2. Define all CANONICAL string keys with current English values
3. Define DYNAMIC string templates with interpolation support
4. Export helper functions for string lookup

### Phase 2B: Surgical Replacement (File-by-File)
1. Replace strings in customer website pages (7 files)
2. Replace strings in shared components (8 files)
3. Replace strings in workbench pages (3 files)
4. Replace API error messages (6 files)

### Phase 2C: Validation
1. Run TypeScript compilation
2. Run production build
3. Grep validation
4. Visual verification
5. Git diff review

### Phase 2D: Commit
1. Commit only if all validation gates pass
2. Commit message: "Phase 2: Implement canonical string integration"
3. Push to origin/main

## CRITICAL RULES

1. **NO GLOBAL SEARCH-AND-REPLACE** - Every replacement must be scoped to a specific line
2. **PRESERVE BEHAVIOR** - No changes to component logic, state, event handlers
3. **PRESERVE INTERPOLATION** - Dynamic strings must maintain variable interpolation
4. **PRESERVE ACCESSIBILITY** - ARIA labels and alt text must be preserved
5. **DO NOT TOUCH LOCKED** - All 36 locked identifiers must remain unchanged
6. **VALIDATE AFTER EACH FILE** - TypeScript must pass after each file change
7. **NO REFACTORING** - Do not opportunistically refactor surrounding code

## NEXT STEPS

1. **Review this plan** - Approve the canonical key mapping
2. **Approve DO-NOT-TOUCH list** - Confirm the 36 locked identifiers
3. **Approve CONTEXTUAL handling** - Confirm "About" should have separate keys
4. **Approve execution order** - Confirm the file-by-file approach
5. **Begin Phase 2A** - Create the canonical string layer

**NO EDITS UNTIL ENTIRE PLAN IS APPROVED**
