# Media Control Tower - Implementation Plan

## Core Philosophy

**The user never manages files. The user manages the business.**

Instead of "upload image," they think "Change the homepage hero."
Instead of "edit hero.json," they think "Homepage → Hero → Change Photo."

Everything else is hidden.

---

## Integration with Mission Control

**Assets becomes a first-class subsystem, not a utility.**

### Mission Control Navigation

```
Mission Control
├── Overview
├── Missions
├── Knowledge
├── Automation
├── Runtime
├── Assets ← NEW
└── Settings
```

### Overview Integration

**Overview Dashboard shows:**
- Asset health (recent changes, pending reviews)
- Media statistics (total assets, by type, by status)
- Recent media changes (last 24 hours)
- Quick actions (Change Homepage Hero, Refresh Johnson Gallery)

### Knowledge Integration

**Knowledge links assets to business context:**
- Assets appear in project knowledge pages
- Project collections visible in Knowledge
- Asset relationships documented in Knowledge

### Automation Integration

**Automation can work with media:**
- Optimize images automatically
- Resize and crop for responsive needs
- Tag and classify assets
- Publish to multiple channels
- Generate thumbnails and previews

### Missions Integration

**Missions can include media tasks:**
- "Update Homepage Hero"
- "Refresh Johnson Project Gallery"
- "Add drone footage to Smith Deck"
- "Archive old project photos"

---

## Assets Tab Navigation

### Primary Navigation

**Website-first navigation structure:**

```
Assets
├── Website
│   ├── 🏠 Homepage
│   │   ├── Hero
│   │   ├── Featured Project
│   │   └── About Preview
│   ├── 🛠 Services
│   │   ├── Fence Card
│   │   ├── Deck Card
│   │   ├── Bathroom Card
│   │   ├── Repairs Card
│   │   ├── Painting Card
│   │   └── Pergolas Card
│   ├── 📁 Projects
│   │   ├── Johnson Fence Cover
│   │   ├── Johnson Gallery
│   │   ├── Smith Deck Cover
│   │   ├── Smith Gallery
│   │   └── [Other projects...]
│   ├── 👤 About
│   │   ├── Hero
│   │   └── Portrait
│   ├── 🖼 Gallery
│   └── 📞 Contact
├── Library
│   ├── Projects
│   │   ├── Johnson Cedar Fence
│   │   │   ├── Cover
│   │   │   ├── Gallery
│   │   │   ├── Before
│   │   │   ├── After
│   │   │   ├── Drone
│   │   │   ├── Documents
│   │   │   └── Videos
│   │   ├── Smith Built-Ins
│   │   └── [Other projects...]
│   ├── Brand
│   │   ├── Logos
│   │   ├── Hero Images
│   │   └── Portraits
│   ├── Marketing
│   ├── Stock
│   └── Archive
├── Collections
│   ├── Johnson Fence
│   ├── Smith Deck
│   ├── Bathroom Remodel
│   └── [Other collections...]
└── All Assets
```

### User Experience

**Two approaches:**
1. **Website-first:** "I want to change this page" → Click Website → Homepage → Hero
2. **Library-first:** "I have this photo" → Click Library → Projects → Johnson Fence → Gallery

---

## Four-Question Interface

### What is this?

**Asset identification:**
- Johnson Cedar Fence
- Cover Photo
- Gallery
- Before
- After
- Drone
- Documents
- Videos

**Visual preview with metadata:**
- Original filename
- Date added
- Resolution
- Orientation
- Status (Draft / Approved / Archived)

### Where is it used?

**Immediate visibility of usage:**
- Homepage Featured
- Fence Service
- Johnson Project
- Portfolio
- Google Business
- Facebook

**Reverse lookup instant.**

### What happens if I change it?

**Impact analysis before every change:**

```
Changing this photo updates:

✓ Homepage
✓ Fence Service
✓ Johnson Project
✓ Portfolio

Total: 4 placements

[Change Photo] [Cancel]
```

### How do I change it safely?

**Simple workflow:**

```
Change Photo
↓
Use Here (select placement)
↓
Preview
↓
Approve
↓
Done
```

**Never "replace asset." Never "move file."**

---

## Website Navigation Structure

### Homepage Expansion

```
🏠 Homepage
├── Hero
├── Featured Project
└── About Preview
```

### Selecting Hero Shows

```
Homepage → Hero

Current Photo
[Preview image]

Requirements
Resolution: 1920x1080
Orientation: Landscape
Minimum Width: 1800px

History
Spring Hero → Summer Hero → Fall Hero

Change Photo
[Add From Google Drive]
[Upload New]
[Use Existing Asset]
```

### All Website Sections

**Each section follows the same pattern:**
- Current photo preview
- Requirements
- History
- Change Photo options

---

## Google Drive Integration

### OAuth Connection

**Mission Control remembers authorized Drive:**

```
Connected
Google Drive
Workspace: Happy Place Media
My Drive
Shared Drives
```

### Add From Google Drive

**Browse Drive interface:**

```
Add From Google Drive
├── Browse Drive
│   ├── Recent Files
│   ├── Shared Drives
│   ├── Project Folders
│   └── Search Drive
└── Select Image → Done
```

### Acquisition Methods

**Every placement can choose:**

```
[Use Existing Asset]
[Browse Google Drive]
[Upload New]
```

**System imports or references selected file automatically.**

### Drag & Drop

**Drop location mirrors _System/Originals:**

```
Originals
├── Johnson Fence
├── Smith Deck
├── Bathrooms
├── Painting
├── Pergolas
├── Brand
└── Unclassified
```

**Drop directly into project folder, not generic inbox.**

---

## Smart Suggestions

### AI Analysis

**When new image appears:**

```
Detected
Fence
Confidence: 96%

Looks like
Johnson Fence

Suggested Collection
Johnson Fence

Suggested Placement
Gallery

[Accept] [Edit] [Dismiss]
```

### No Manual Organization

**If AI is confident, user simply clicks Accept.**

**Otherwise, user can edit suggestions.**

---

## Asset Inspector

### One Page Per Asset

**Everything on one screen:**

```
Johnson Fence Cover
├─────────────────────────────────────────┤
│ [PREVIEW IMAGE]                         │
├─────────────────────────────────────────┤
│ What is this?                           │
│ Johnson Cedar Fence - Cover Photo       │
│                                         │
│ Original filename: FENCE BUILD.jpg      │
│ Date added: July 18, 2026               │
│ Resolution: 1920x1080                   │
│ Orientation: Landscape                  │
│ Status: Approved                        │
│                                         │
├─────────────────────────────────────────┤
│ Where is it used?                       │
│ ✓ Homepage Featured                     │
│ ✓ Fence Service Card                    │
│ ✓ Johnson Project Cover                 │
│ ✓ Gallery Position 1                    │
│                                         │
├─────────────────────────────────────────┤
│ Which collection owns it?               │
│ Johnson Fence Collection                │
│                                         │
├─────────────────────────────────────────┤
│ Which versions exist?                   │
│ v1: Jan 15, 2026                        │
│ v2: Apr 20, 2026                        │
│ v3: Jun 10, 2026                        │
│ v4: Jul 1, 2026                         │
│ v5: Jul 18, 2026 (current)             │
│                                         │
├─────────────────────────────────────────┤
│ What will changing it affect?           │
│ Homepage Featured                       │
│ Fence Service Card                      │
│ Johnson Project Cover                   │
│ Gallery Position 1                      │
│                                         │
├─────────────────────────────────────────┤
│ What related assets exist?              │
│ Johnson Fence Gallery (23 photos)       │
│ Johnson Fence Before                    │
│ Johnson Fence After                     │
│ Johnson Fence Drone                     │
│                                         │
├─────────────────────────────────────────┤
│ [Change Photo] [Use Here] [Preview]     │
└─────────────────────────────────────────┘
```

**Not multiple dialogs. One page.**

---

## Placement Inspector

### One Page Per Placement

**Everything on one screen:**

```
Homepage Hero
├─────────────────────────────────────────┤
│ [WEBSITE PREVIEW: Homepage screenshot]  │
│ Hero highlighted                        │
├─────────────────────────────────────────┤
│ Current Image                           │
│ [PREVIEW: hero-background-enhanced.jpg] │
│                                         │
├─────────────────────────────────────────┤
│ Requirements                            │
│ Resolution: 1920x1080                   │
│ Orientation: Landscape                  │
│ Minimum Width: 1800px                   │
│ Crop Safe: Yes                          │
│                                         │
├─────────────────────────────────────────┤
│ Desktop Preview                          │
│ [PREVIEW: 1920x1080]                    │
│                                         │
├─────────────────────────────────────────┤
│ Tablet Preview                           │
│ [PREVIEW: 768x1024]                     │
│                                         │
├─────────────────────────────────────────┤
│ Mobile Preview                           │
│ [PREVIEW: 375x667]                      │
│                                         │
├─────────────────────────────────────────┤
│ History                                 │
│ Spring Hero → Summer Hero → Fall Hero   │
│                                         │
├─────────────────────────────────────────┤
│ Change Photo                            │
│ [Add From Google Drive]                 │
│ [Upload New]                            │
│ [Use Existing Asset]                    │
└─────────────────────────────────────────┘
```

**No JSON. No IDs. No filesystem.**

---

## Relationship Graph

### Visual Integration

**Every asset knows its relationships:**

```
Johnson Fence Cover
    ↓ belongs to
Johnson Fence Collection
    ↓ used by
Homepage Featured
Fence Service Card
Johnson Project Cover
Gallery Position 1
    ↓ also used in
Google Business
Facebook
Instagram
Brochure
```

### Reverse Lookups

**Instant:**
- Click any asset → See everywhere it's used
- Click any placement → See current asset and history
- Click any collection → See all assets

### Integration with Mission Control

**Relationship Graph appears in:**
- Asset Inspector
- Placement Inspector
- Knowledge pages
- Overview dashboard

---

## Collections Structure

### Project Collections

**Collections own everything for a project:**

```
Johnson Fence Collection
├── Cover
├── Gallery (23 photos)
├── Before
├── After
├── Drone
├── Invoices
├── Documents
├── Video
└── Blueprints
```

**One project. Everything together.**

### Collection Management

**In Assets tab:**
- Collections section shows all project collections
- Click collection to see all assets
- Add/remove assets from collection
- Collection appears in Knowledge pages

---

## Remove Low-Value Metadata

### Don't Surface

**Remove from UI:**
- Uploaded by
- Internal asset IDs
- Storage paths
- JSON filenames
- File system details

### Keep

**Keep in UI:**
- Original filename
- Date added
- Resolution
- Orientation
- Status (Draft / Approved / Archived)
- Collections
- Placements
- Versions
- Usage count

**Only information that helps business operate.**

---

## Hide Implementation Details

### Internally Continue Using

**System uses:**
- Asset Registry
- Placement Registry
- Collections
- JSON pointers
- Version history
- Internal IDs

### UI Never Exposes

**UI hides:**
- JSON files
- Internal IDs
- File paths
- Registry structure
- Implementation details

**User sees:**
- Website structure
- Asset names
- Visual previews
- Usage information
- Impact analysis

---

## Future-Proof MAM Architecture

### General Media Asset Management

**Same architecture supports:**
- Photos
- Videos
- PDFs
- Logos
- Brand assets
- Documents
- CAD drawings
- Drone footage
- Marketing graphics

### Without Changing Model

**Core model remains:**
- Assets (any media type)
- Placements (where used)
- Collections (groupings)
- Website (pages/sections)

**Type-specific handling:**
- Videos: Duration, format, codec
- PDFs: Page count, document type
- CAD drawings: Scale, format
- Photos: Resolution, orientation

---

## Integration with Mission Control Subsystems

### Overview

**Shows:**
- Asset health dashboard
- Recent media changes
- Media statistics
- Quick actions

### Knowledge

**Links assets to business context:**
- Assets appear in project pages
- Collections visible in Knowledge
- Asset relationships documented

### Automation

**Can work with media:**
- Optimize images automatically
- Resize and crop for responsive needs
- Tag and classify assets
- Publish to multiple channels
- Generate thumbnails and previews

### Missions

**Include media tasks:**
- "Update Homepage Hero"
- "Refresh Johnson Project Gallery"
- "Add drone footage to Smith Deck"
- "Archive old project photos"

### Runtime

**Manages media operations:**
- Asset generation from originals
- Responsive image creation
- Export to multiple channels
- Sync with Google Drive

---

## Implementation Phases

### Phase 1: Mission Control Integration
1. Add Assets tab to Mission Control navigation
2. Create Assets tab layout with Website/Library/Collections navigation
3. Integrate with Overview dashboard (asset health, recent changes)
4. Add quick actions to Overview

### Phase 2: Website Navigation
1. Implement Website-first navigation structure
2. Create placement inspectors for all website sections
3. Add visual previews for each placement
4. Implement change photo workflow

### Phase 3: Library Navigation
1. Implement Library-first navigation structure
2. Create asset inspectors
3. Add collection management
4. Implement reverse lookup (where used)

### Phase 4: Google Drive Integration
1. Implement OAuth connection
2. Add Browse Drive interface
3. Implement file selection and import
4. Add drag & drop with project-specific drop zones

### Phase 5: Smart Suggestions
1. Implement AI analysis for new images
2. Add confidence scores
3. Implement suggested collections and placements
4. Add accept/edit/dismiss workflow

### Phase 6: Relationship Graph
1. Implement relationship graph visualization
2. Add reverse lookup
3. Integrate with Asset Inspector
4. Integrate with Mission Control subsystems

### Phase 7: Collections
1. Implement project collections
2. Add multi-asset support (photos, videos, documents)
3. Integrate with Knowledge
4. Add collection management UI

### Phase 8: Future-Proof MAM
1. Add video support
2. Add PDF support
3. Add document support
4. Add CAD drawing support
5. Ensure type-specific handling

### Phase 9: Subsystem Integration
1. Integrate with Knowledge (business context)
2. Integrate with Automation (optimize, resize, tag)
3. Integrate with Missions (media tasks)
4. Integrate with Runtime (media operations)

---

## Benefits

### For Users
- Manage business, not files
- Website-first thinking
- Instant impact awareness
- Google Drive integration
- Smart suggestions reduce work
- One-page inspectors
- Visual previews everywhere

### For Business
- Professional-grade media management
- Future-proof MAM architecture
- Integrated with Mission Control
- Supports all media types
- Safe changes (impact analysis)
- Clear audit trail

### For System
- Clean integration with existing platform
- Leverages Mission Control infrastructure
- Consistent UX across subsystems
- Scalable architecture
- Hidden implementation details
