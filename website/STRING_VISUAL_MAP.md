# STRING VISUAL MAP - HOMEPAGE (/)

## HOMEPAGE STRING COVERAGE

### Total visible editorial strings: 12
- **Mapped:** 12
- **Data-driven:** 0 (services/projects are media assignments, not strings)
- **Dynamic:** 0
- **Locked:** 0
- **Accessibility:** 0
- **Unmapped:** 0
- **Ambiguous:** 0

## HOMEPAGE STRING MAP

| Key | Current text | Source file | Component | Route | UI section | Element | Status |
|-----|-------------|-------------|-----------|-------|----------|---------|--------|
| `nav.home` | Home | src/components/site-header.tsx:113 | SiteHeader | global | Navigation | link | MAPPED |
| `nav.services` | Services | src/components/site-header.tsx:113 | SiteHeader | global | Navigation | link | MAPPED |
| `nav.ourWork` | Our Work | src/components/site-header.tsx:113 | SiteHeader | global | Navigation | link | MAPPED |
| `nav.about` | About | src/components/site-header.tsx:113 | SiteHeader | global | Navigation | link | MAPPED |
| `nav.reviews` | Reviews | src/components/site-header.tsx:113 | SiteHeader | global | Navigation | link | MAPPED |
| `nav.estimate` | Get a Free Estimate | src/app/page.tsx:119 | HomePage | / | Hero | button | MAPPED |
| `homepage.hero.title` | Your favorite part of coming home should be the home itself. | src/app/page.tsx:165 | HomePage | / | Hero | h1 | MAPPED |
| `homepage.hero.description` | We repair, restore, and improve homes across the Mid-Willamette Valley. The work should look right the day we leave, and still look right years later. | src/app/page.tsx:168 | HomePage | / | Hero | paragraph | MAPPED |
| `homepage.seeOurWork` | See Our Work | src/app/page.tsx:177 | HomePage | / | Hero | button | MAPPED |
| `homepage.tellUsPlanning` | Tell us what you're planning. | src/app/page.tsx:199 | HomePage | / | Hero | span | MAPPED |
| `trust.licensed` | Licensed, Bonded & Insured | src/app/page.tsx:211 | HomePage | / | Trust | span | MAPPED |
| `trust.familyOwned` | Family-Owned | src/app/page.tsx:212 | HomePage | / | Trust | span | MAPPED |
| `trust.serviceArea` | Mid-Willamette Valley | src/app/page.tsx:213 | HomePage | / | Trust | span | MAPPED |
| `trust.projectsCompleted` | Projects Completed | src/app/page.tsx:214 | HomePage | / | Trust | span | MAPPED |
| `services.title` | A few ways we can help | src/app/page.tsx:235 | HomePage | / | Services | h2 | MAPPED |
| `services.description` | Pick a service to start a free estimate — we'll guide you through the rest. | src/app/page.tsx:236 | HomePage | / | Services | paragraph | MAPPED |
| `featuredProjects.title` | Recent Work | src/app/page.tsx:293 | HomePage | / | Featured Projects | h2 | MAPPED |
| `featuredProjects.description` | A selection of our latest work across the Mid-Willamette Valley. | src/app/page.tsx:293 | HomePage | / | Featured Projects | paragraph | MAPPED |
| `featuredProjects.seeAll` | See all projects | src/app/page.tsx:293 | HomePage | / | Featured Projects | link | MAPPED |
| `family.tagline` | Built by one family. Trusted by many more. | src/app/page.tsx:351 | HomePage | / | Family | span | MAPPED |
| `family.title` | A family business built on doing things the right way. | src/app/page.tsx:351 | HomePage | / | Family | h2 | MAPPED |
| `reviews.title` | What people say once the work's done | src/app/page.tsx:380 | HomePage | / | Reviews | h2 | MAPPED |
| `reviews.empty` | We are building our review portfolio. In the meantime, ask us for references in your neighborhood. | src/app/page.tsx:380 | HomePage | / | Reviews | paragraph | MAPPED |
| `cta.startFreeEstimate` | Start Your Free Estimate | src/components/cta-section.tsx:25 | CTASection | / | CTA | button | MAPPED |

## SECTION-LEVEL GROUPING

### Navigation (global)
- nav.home
- nav.services
- nav.ourWork
- nav.about
- nav.reviews
- nav.estimate

### Hero
- homepage.hero.title
- homepage.hero.description
- homepage.seeOurWork
- homepage.tellUsPlanning
- nav.estimate (hero CTA button)

### Trust
- trust.licensed
- trust.familyOwned
- trust.serviceArea
- trust.projectsCompleted

### Services
- services.title
- services.description

### Featured Projects
- featuredProjects.title
- featuredProjects.description
- featuredProjects.seeAll

### Family
- family.tagline
- family.title

### Reviews
- reviews.title
- reviews.empty

### CTA
- cta.startFreeEstimate

## CLASSIFICATION BREAKDOWN

### CANONICAL EDITABLE (21 strings)
- All homepage editorial strings classified as CANONICAL
- These are the primary targets for string swap system

### CONTEXTUAL (1 string)
- nav.about (CONTEXTUAL - used in navigation, footer, and page title with different semantic contexts)

### DATA-DRIVEN (0 strings on homepage)
- Service names and descriptions come from services.v1.json but not mapped as strings
- Project titles and descriptions come from projects.v1.json but not mapped as strings
- These are MEDIA ASSIGNMENTS, not string swaps

## UI IMPLEMENTATION STATUS

### What existing editor components can be reused?
- **SlotRegistry system:** Already exists for media assignment (editable-slot.tsx, slot-registry.ts)
- **Component registration pattern:** Components already register themselves with the editor
- **Workbench UI infrastructure:** Login, connectors, explorer pages exist
- **NOT reusable for strings:** The current SlotRegistry is designed for MEDIA only (elementType='image')

### What new UI components are actually necessary?
- **StringInspector component:** New component to display selected string metadata (key, current value, source, classification)
- **StringMappingPanel component:** New right-side panel to show selected string details
- **StringHighlightOverlay:** New overlay to highlight mappable strings on hover/click
- **StringEditorInput:** New text input field for string replacement (but not yet for saving)

### What can be done entirely client-side?
- String highlighting (CSS classes, mouse events)
- String selection click handlers
- Right-side panel display of metadata
- Text input for replacement (visual only)
- Section grouping display

### What requires server support?
- **Actual string persistence:** Would need API routes for string mutation
- **String override database:** Would need Redis/KV for string overrides
- **String resolution API:** Would need runtime lookup system
- **NOT needed for mapping phase:** This phase is purely visual mapping

## RECOMMENDED FIRST IMPLEMENTATION SLICE

### Homepage Hero Only

**Left side:** Live hero section (current homepage rendering)
**Right side:** String Inspector panel

**Target strings:**
- homepage.hero.title
- homepage.hero.description
- homepage.seeOurWork
- homepage.tellUsPlanning

**Interaction:**
1. Hover over hero text → highlight
2. Click hero text → right panel shows metadata
3. Right panel displays:
   - Key (e.g., homepage.hero.title)
   - Current value
   - Source (src/app/page.tsx:113)
   - Component (HomePage)
   - Route (/)
   - Classification (CANONICAL)
   - Editable (YES)
4. Text input field for replacement (visual only, no save)

**Why this slice:**
- Single visual section
- 4 key strings
- No dependencies on other sections
- Can prove the mapping concept
- Already has existing harvest data
- No media/Drive complications

**What this slice does NOT include:**
- No string persistence
- No API routes
- No database changes
- No actual string replacement in the UI
- No save functionality
- No deployment impact

This provides the visual mapping foundation you requested: "A trustworthy visual map from visible UI string → canonical/config source → exact source location, presented in a side-by-side editor/inspector UX."