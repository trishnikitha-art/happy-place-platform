# CMS Image Management System - PLAN (UPDATED)

## Core Philosophy

**Stop thinking file system. Start thinking CMS.**

Users think: "I want to change the picture on the homepage."
Not: "Where is this image stored?"

Folders become implementation details. Users never navigate them.

---

## Five-Layer Architecture

**One-way flow: Import → Library → Assets → Placements → Website**

### 1. Import
Bring new photos into the system and classify them immediately.
- Drop zones mirror destination structure
- "Import" workflow (not "upload")
- Immediate classification (Homepage, Projects, Brand, etc.)
- Suggested placements based on content

### 2. Library
Permanent, organized home for original photos (_System/Originals).
- Originals are sacred (NEVER EDIT)
- Every asset has a Home (e.g., Projects → Johnson Fence)
- Decision-relevant metadata only (filename, resolution, orientation, file size, last updated, where used, project, version)
- No enterprise DAM clutter (no "uploaded by", "owner", "created by")

### 3. Assets
Website-ready derivatives generated from originals.
- Cropped, resized, optimized versions
- Homepage Hero, Mobile Hero, Service Card, Thumbnail, Social
- One original produces multiple website assets
- Original never changes, assets are regenerated

### 4. Placements
Every location on the website where an asset can appear.
- Homepage Hero, Services Fence Card, Johnson Project Cover
- One asset per placement
- Easy to change which asset is placed
- Visual previews for every placement

### 5. Website
Actual pages and components users see.
- Homepage, Services, Projects, About, Footer
- Users navigate by website structure, not folders
- Website Explorer for page-first navigation
- Library Explorer for photo-first navigation

---

## Four Core Concepts (Updated)

### 1. Assets
The actual photos.
- Stored in _System/Originals/ (implementation detail, sacred)
- Have internal IDs (A00147, A00148, etc.)
- Have human-readable names (Johnson Fence Cover)
- Have versions (v1, v2, v3)
- Have a Home (e.g., Projects → Johnson Fence)
- Decision-relevant metadata only
- Never manually edited by users

### 2. Placements
Where assets appear on the website.
- Homepage Hero
- Services Fence Card
- Johnson Project Cover
- About Portrait
- One asset per placement
- Easy to change which asset is placed
- Visual preview for every placement
- Two move operations: Move Original (rare) vs Move Placement (common)

### 3. Photo Sets
Groups of related assets (renamed from Collections).
- Johnson Fence Photo Set: Cover, Gallery, Before, After, Drone, Finished
- Smith Built-Ins Photo Set: Cover, Gallery, Progress
- Galleries pull from photo sets automatically

### 4. Views
Website pages/sections.
- Homepage
- Services
- Projects
- About
- Footer
- Users navigate by views, not folders

---

## Website Map Navigation (Updated)

**Primary Navigation:** Website structure, not filesystem

**Website Explorer:**
```
Website
├── Homepage
│   ├── Hero [visual preview]
│   ├── Featured Project [visual preview]
│   └── About Preview [visual preview]
├── Services
│   ├── Fence Card [visual preview]
│   ├── Deck Card [visual preview]
│   ├── Bathroom Card [visual preview]
│   ├── Repairs Card [visual preview]
│   ├── Painting Card [visual preview]
│   └── Pergolas Card [visual preview]
├── Projects
│   ├── Johnson Fence Cover [visual preview]
│   ├── Johnson Gallery [visual preview]
│   ├── Smith Cover [visual preview]
│   ├── Smith Gallery [visual preview]
│   ├── Wilson Cover [visual preview]
│   └── [Other projects...]
├── About
│   ├── Hero [visual preview]
│   └── Portrait [visual preview]
└── Footer
    ├── Logo [visual preview]
    └── Background [visual preview]
```

**Library Explorer (Opposite Direction):**
```
Library
├── Projects
│   ├── Johnson Fence
│   │   ├── All Photos
│   │   ├── Cover
│   │   ├── Gallery
│   │   ├── Before
│   │   ├── After
│   │   └── Drone
│   ├── Smith Deck
│   ├── Bathroom Remodel
│   └── Outdoor Living
├── Brand
│   ├── All Photos
│   ├── Hero
│   └── Portrait
├── Marketing
├── Stock
└── Archive
```

**User Experience:**
- **Website Explorer:** "I want to change this page" → Click Homepage → Hero → See current image → Replace
- **Library Explorer:** "I have this photo" → Click Johnson Fence → All Photos → Select photo → See where used → Assign to placement

No folder navigation. No file browsing. Visual previews everywhere.

---

## Placements Structure (Updated)

**Renamed from Slots to Placements** (more intuitive)

```
_System/
  Placements/
    Homepage/
      hero.json
      featured-project.json
      about-preview.json
    Services/
      fence-card.json
      deck-card.json
      bathroom-card.json
      repairs-card.json
      painting-card.json
      pergolas-card.json
    Projects/
      johnson-cover.json
      johnson-gallery.json
      smith-cover.json
      smith-gallery.json
      wilson-cover.json
      wilson-gallery.json
    About/
      hero.json
      portrait.json
    Footer/
      logo.json
      background.json
```

**Placement JSON Format (Hidden from UI):**
```json
{
  "assetId": "A00147",
  "version": 5,
  "assetName": "Johnson Fence Cover",
  "requirements": {
    "minWidth": 1800,
    "aspectRatio": "16:9",
    "landscape": true,
    "cropSafe": true
  }
}
```

**UI Experience:**
```
Homepage
[actual screenshot with Hero highlighted]
Hero
Current Photo: [preview]
Replace: [drag here]
```

---

## Photo Sets Structure (Renamed from Collections)

**Photo Sets group related assets automatically**

```
_System/
  Photo Sets/
    Johnson Fence/
      cover.json
      gallery.json
      before.json
      after.json
      drone.json
      finished.json
    Smith Built-Ins/
      cover.json
      gallery.json
      progress.json
    [Other projects...]
```

**Photo Set JSON Format (Hidden from UI):**
```json
{
  "name": "Johnson Fence",
  "assets": {
    "cover": "A00147",
    "gallery": ["A00148", "A00149", "A00150"],
    "before": "A00151",
    "after": "A00152",
    "drone": "A00153",
    "finished": "A00154"
  }
}
```

**Gallery Auto-Population:**
- Johnson Gallery placement points to Johnson Fence Photo Set
- System automatically pulls all gallery assets from photo set
- No manual asset ID listing required

---

## Incoming Uploads Structure (Updated)

**Mirrors _System/Originals structure for immediate classification**

```
Happy Place Media/
  📥 Import Photos/              (Renamed from Incoming Uploads)
    🏠 Homepage/
    🪵 Services/
    │   ├── Fences/
    │   ├── Decks/
    │   ├── Bathrooms/
    │   ├── Repairs/
    │   ├── Painting/
    │   └── Pergolas/
    🏗️ Projects/
    │   ├── Johnson Fence/
    │   ├── Smith Deck/
    │   ├── Bathroom Remodel/
    │   ├── Outdoor Living/
    │   └── New Project/
    🎨 Brand/
    📋 Logos/
    📢 Marketing/
    🗂 Archive/
```

**Drop Zone Experience:**
```
Import Photos
🏠 Homepage
🪵 Services
🏗️ Projects
  Johnson Fence
  Smith Deck
  Bathroom Remodel
🎨 Brand
📋 Logos
📢 Marketing
🗂 Archive
```

**User Experience:**
- Drop fence photo into "Johnson Fence" → Feels like "Adding photos to Johnson Fence"
- System automatically knows destination: _System/Originals/Projects/Johnson Fence/
- No additional classification needed
- Matches eventual library organization

---

## Asset Identity System (Updated)

**Separate identity from version. Humans never type IDs.**

**Asset Structure:**
```json
{
  "id": "A00147",
  "name": "Johnson Fence Cover",
  "version": 5,
  "originalFile": "FENCE BUILD.jpg",
  "location": "_System/Originals/Projects/Johnson Cedar Fence/",
  "home": "Projects → Johnson Cedar Fence",
  "metadata": {
    "width": 1920,
    "height": 1080,
    "orientation": "landscape",
    "fileSize": "2.5 MB",
    "format": "jpg",
    "lastUpdated": "2026-07-18"
  },
  "whereUsed": [
    "Homepage Featured",
    "Services Fence Card",
    "Johnson Project Cover",
    "Gallery Position 1"
  ],
  "history": [
    {"version": 1, "date": "2026-01-15"},
    {"version": 2, "date": "2026-04-20"},
    {"version": 3, "date": "2026-06-10"},
    {"version": 4, "date": "2026-07-01"},
    {"version": 5, "date": "2026-07-18"}
  ]
}
```

**Internal ID:** A00147 (system-generated, never changes)
**Human Name:** Johnson Fence Cover (readable, editable)
**Version:** 5 (increments on replacement)
**Home:** Projects → Johnson Cedar Fence (every asset belongs somewhere)

**Decision-Relevant Metadata Only:**
- Original file name
- Resolution
- Orientation
- File size
- Last updated
- Where it's used
- Project
- Version

**Removed Enterprise DAM Clutter:**
- No "uploaded by"
- No "uploaded from"
- No "owner"
- No "created by"

**Benefits:**
- Humans never type IDs
- Stable internal reference
- Human-readable names for UI
- Version tracking built in
- Every asset has a home for easy cleanup
- Metadata affects decisions only

---

## Asset Inspector (Updated)

**One page per asset. Everything visible.**

**UI Layout:**
```
┌─────────────────────────────────────────┐
│ Johnson Fence Cover                      │
├─────────────────────────────────────────┤
│                                         │
│ [PREVIEW IMAGE]                         │
│                                         │
├─────────────────────────────────────────┤
│ Metadata                                │
│ Original File: FENCE BUILD.jpg           │
│ Resolution: 1920x1080                   │
│ Orientation: Landscape                  │
│ File Size: 2.5 MB                       │
│ Last Updated: July 18, 2026              │
│                                         │
├─────────────────────────────────────────┤
│ Home                                    │
│ Projects → Johnson Cedar Fence           │
│                                         │
├─────────────────────────────────────────┤
│ Photo Sets                              │
│ ✓ Johnson Fence Photo Set               │
│                                         │
├─────────────────────────────────────────┤
│ Placements (Where is this used?)        │
│ ✓ Homepage Featured                     │
│ ✓ Services Fence Card                   │
│ ✓ Johnson Project Cover                 │
│ ✓ Gallery Position 1                    │
│                                         │
├─────────────────────────────────────────┤
│ History                                 │
│ v1: Jan 15, 2026                        │
│ v2: Apr 20, 2026                        │
│ v3: Jun 10, 2026                        │
│ v4: Jul 1, 2026                         │
│ v5: Jul 18, 2026 (current)             │
│                                         │
├─────────────────────────────────────────┤
│ [Move Original] [Move Placement] [Duplicate] [Archive]  │
└─────────────────────────────────────────┘
```

**Key Features:**
- "Placements" section shows exactly where this asset is used
- "Home" shows where the original belongs
- Decision-relevant metadata only (no enterprise DAM clutter)
- Two move operations: Move Original (rare) vs Move Placement (common)

**Impact Awareness:** "If I replace this picture... it affects FOUR places."

---

## Placement Inspector (Updated)

**One page per placement. Requirements visible.**

**UI Layout:**
```
┌─────────────────────────────────────────┐
│ Homepage Hero                           │
├─────────────────────────────────────────┤
│ [VISUAL PREVIEW: Homepage screenshot]  │
│ Hero highlighted                        │
│                                         │
├─────────────────────────────────────────┤
│ Current Image                           │
│ [PREVIEW: hero-background-enhanced.jpg] │
│                                         │
│ History                                 │
│ Spring Hero → Summer Hero → Fall Hero   │
│                                         │
├─────────────────────────────────────────┤
│ Requirements                            │
│ Resolution: 1920x1080                   │
│ Orientation: Landscape                  │
│ Minimum Width: 1800px                   │
│ Crop Safe: Yes                          │
│                                         │
├─────────────────────────────────────────┤
│ Preview                                 │
│ [Desktop Preview]                       │
│ [Tablet Preview]                        │
│ [Phone Preview]                         │
│                                         │
├─────────────────────────────────────────┤
│ Replace                                 │
│ [DRAG NEW PHOTO HERE]                   │
│                                         │
└─────────────────────────────────────────┘
```

**Key Features:**
- Visual preview of actual website placement
- Requirements and preview prevent mistakes
- Clear distinction between Move Original vs Move Placement

---

## Live Relationship Graph (Updated)

**Every photo becomes traceable.**

**Graph Visualization:**
```
Homepage Hero
    ↓ uses
Hero Image (A00123)
    ↓ belongs to
Homepage Photo Set
    ↓ derived from
Original Photo (hero-background-enhanced.jpg)
    ↓ located in
_System/Originals/Hero/
    ↓ generates
Homepage Hero Asset (cropped, resized)
Mobile Hero Asset (cropped, resized)
Service Card Asset (cropped, resized)
Thumbnail Asset (cropped, resized)
Social Asset (cropped, resized)
    ↓ used in
├── Facebook
├── Google Business
├── Website
└── Brochure
```

**Reverse Lookup:**
Click any asset → See everywhere it's used.

**Forward Lookup:**
Click any placement → See current asset and history.

**Impact Analysis:**
Before replacing an asset, system shows:
"This asset is used in 5 places. Replacing will update all 5."

---

## Import Workflow (Updated)

**"Import" instead of "Upload" - suggests organize, classify, inspect, approve**

**Workflow:**
```
Import
↓
Review
↓
Approve
↓
Assign
↓
Publish
```

**Import Experience:**
```
Import Photos
🏠 Homepage
🪵 Services
🏗️ Projects
  Johnson Fence
  Smith Deck
🎨 Brand
📋 Logos
📢 Marketing
🗂 Archive

[Drop Johnson Fence Drone.jpg here]

↓

Suggested Placements
✓ Johnson Gallery
✓ Homepage Featured
✓ Fence Service Card

↓

Review
[Preview image]
[Metadata]
[Requirements check]

↓

Approve
[Approve] [Reject]

↓

Assign
[Assign to Johnson Gallery]
[Assign to Homepage Featured]

↓
Publish
[Publish to website]
```

**Benefits:**
- Immediate classification during import
- Suggested placements reduce manual work
- Review before assignment prevents mistakes
- Clear workflow stages

---

## Staging Area (Updated)

**Don't immediately publish imported photos**

**Queue States:**
```
Incoming
↓
Needs Review
↓
Ready
↓
Published
```

**Nothing accidentally goes live.**

**State Descriptions:**
- **Incoming:** New photos imported, awaiting review
- **Needs Review:** Photos ready for human review with confidence scores
- **Ready:** Photos approved and assigned, ready to publish
- **Published:** Photos live on website

**Safety Benefit:** Staging prevents accidental live publication

---

## Suggested Placements Feature

**System suggests placements based on content analysis**

**Example:**
```
Drop: Johnson Fence Drone.jpg

↓

Suggested Placements
✓ Johnson Gallery (98% confidence)
✓ Homepage Featured (85% confidence)
✓ Fence Service Card (92% confidence)

↓

User confirms or changes assignments
```

**Benefits:**
- Reduces manual classification work
- AI analyzes image content (fence, drone, outdoor)
- Confidence scores show reliability
- User always confirms final assignment

---

## Impact Analysis Before Publishing

**Show exactly what changes before publishing**

**Impact Display:**
```
This change affects:

Homepage Hero
Services Fence Card
Johnson Project Cover
Facebook Banner

Total: 4 placements

[Publish] [Cancel]
```

**Benefits:**
- User knows exact impact before publishing
- Prevents unintended changes
- Clear accountability
- Easy to cancel if impact is unexpected

---

## Originals vs Website Assets (Updated)

**Biggest architectural distinction: One original produces multiple website assets**

**Original:**
```
IMG_4839.CR3 (raw file)
Located: _System/Originals/Projects/Johnson Fence/
NEVER EDITED
```

**Website Assets Generated from Original:**
```
Homepage Hero (cropped 16:9, 1920x1080)
Mobile Hero (cropped 16:9, 800x450)
Service Card (cropped 4:3, 600x450)
Thumbnail (cropped 1:1, 300x300)
Social (cropped 1:1, 1080x1080)
```

**Benefits:**
- Original never changes
- Multiple crops/sizes from one source
- Future-proof for responsive images
- Regenerate assets if requirements change
- Rollback to original always available

---

## JSON Hidden from UI

**JSON should disappear completely from user experience**

**UI Experience:**
```
Homepage
Hero
Current Photo: [preview]
Replace: [drag here]
Preview: [desktop/tablet/phone]

No IDs.
No filenames.
No paths.
No JSON.
```

**JSON remains as implementation detail only.**

---

## Move Operations (Updated)

**Two distinct move operations**

**Move Original (Rare):**
- Changes where the master photo belongs
- Example: Move from "Johnson Fence" to "Smith Deck"
- Changes asset's "Home"
- Requires confirmation

**Move Placement (Common):**
- Changes where the website displays the asset
- Example: Move from "Homepage Featured" to "Fence Card"
- Doesn't change asset's home
- Common operation

**UI Distinction:**
```
[Move Original] (Changes home location)
[Move Placement] (Changes website display)
```

---

## _System Structure (Updated)

**Originals are sacred. Everything points back to Originals.**

```
_System/
  Originals/
    NEVER EDIT
    Projects/
      Johnson Cedar Fence/
      Smith Built-Ins/
      ...
    Homepage/
    Brand/
  Placements/
    Homepage/
    Services/
    Projects/
    About/
    Footer/
  Photo Sets/
    Johnson Fence/
    Smith Built-Ins/
    ...
  Generated/
    Website Assets/
      Homepage Hero/
      Mobile Hero/
      Service Card/
      Thumbnail/
      Social/
    Responsive Images/
    Blurhash/
    Metadata/
  Exports/
    Facebook/
    Google Business/
    Brochure/
  Cache/
  Logs/
```

---

## User Workflow Examples (Updated)

### Change Homepage Hero

**Current Workflow:**
1. Navigate folders
2. Find hero file
3. Replace file
4. Hope website updates

**New Workflow:**
1. Open Website Explorer
2. Click Homepage → Hero
3. See visual preview of homepage with Hero highlighted
4. See current asset preview
5. Drag new photo to "Replace" area
6. System shows impact: "This will update Homepage Hero only"
7. Click "Replace"
8. Done

### Import New Photos

**Current Workflow:**
1. Navigate folders
2. Decide where to upload
3. Upload file
4. Manually organize

**New Workflow:**
1. Open Import Photos
2. See destination structure: Homepage, Services, Projects, Brand
3. Drop fence photo into "Johnson Fence"
4. System shows suggested placements: Johnson Gallery, Homepage Featured, Fence Service Card
5. Review preview and metadata
6. Approve
7. Assign to placements
8. Publish
9. Done

### See Where Asset Is Used

**Current Workflow:**
1. Search folders
2. Guess where it might be used
3. Miss some places

**New Workflow:**
1. Open Library Explorer
2. Click Johnson Fence → All Photos
3. Select FENCE BUILD.jpg
4. See "Placements" section:
   - Homepage Featured
   - Services Fence Card
   - Johnson Project Cover
   - Gallery Position 1
5. Know exactly: "Replacing this affects 4 places"

### Move Asset Between Placements

**Current Workflow:**
1. Copy file
2. Paste to new location
3. Update references
4. Hope nothing breaks

**New Workflow:**
1. Open Asset Inspector for FENCE BUILD.jpg
2. Click "Move Placement"
3. Select destination: "Fence Card"
4. System shows: "Moving from Homepage Featured to Fence Card"
5. System shows impact: "This will affect 2 placements"
6. Click "Confirm"
7. Done

### Move Original to Different Project

**Current Workflow:**
1. Move file between folders
2. Update all references
3. Hope nothing breaks

**New Workflow:**
1. Open Asset Inspector for FENCE BUILD.jpg
2. Click "Move Original"
3. Select new home: "Smith Deck"
4. System shows: "Changing home from Johnson Fence to Smith Deck"
5. System shows impact: "This will affect 4 placements"
6. Click "Confirm"
7. Done

---

## Implementation Architecture (Updated)

### JSON Structure (Implementation Detail - Hidden from UI)

**Asset Registry:**
```json
{
  "A00147": {
    "name": "Johnson Fence Cover",
    "version": 5,
    "file": "FENCE BUILD.jpg",
    "home": "Projects → Johnson Cedar Fence",
    "photoSets": ["johnson-fence"],
    "placements": ["homepage-featured", "services-fence-card", "johnson-cover"],
    "metadata": {
      "width": 1920,
      "height": 1080,
      "orientation": "landscape",
      "fileSize": "2.5 MB",
      "lastUpdated": "2026-07-18"
    }
  }
}
```

**Placement Registry:**
```json
{
  "homepage-hero": {
    "assetId": "A00123",
    "version": 2,
    "requirements": {
      "minWidth": 1800,
      "aspectRatio": "16:9",
      "landscape": true,
      "cropSafe": true
    }
  }
}
```

**Photo Set Registry:**
```json
{
  "johnson-fence": {
    "name": "Johnson Fence",
    "cover": "A00147",
    "gallery": ["A00148", "A00149", "A00150"],
    "before": "A00151",
    "after": "A00152",
    "drone": "A00153",
    "finished": "A00154"
  }
}
```

**Relationship Graph:**
```json
{
  "A00147": {
    "used_in": ["homepage-featured", "services-fence-card", "johnson-cover"],
    "belongs_to": ["johnson-fence"],
    "home": "Projects → Johnson Cedar Fence",
    "derived_from": "FENCE BUILD.jpg",
    "generates": ["homepage-hero-asset", "mobile-hero-asset", "service-card-asset"]
  }
}
```

### UI Components

**Website Explorer**
- Visual tree view of website structure
- Visual previews for each placement
- Click to expand/collapse
- Click placement to open Placement Inspector

**Library Explorer**
- Visual tree view of library structure
- Organized by Projects, Brand, Marketing, Archive
- Click to open Asset Inspector

**Asset Inspector**
- Single page per asset
- Shows decision-relevant metadata only
- Shows "Home" location
- Shows "Photo Sets"
- Shows "Placements" (where used)
- Shows version history
- Move Original / Move Placement / Duplicate / Archive actions

**Placement Inspector**
- Single page per placement
- Visual preview of actual website placement
- Shows current asset
- Shows requirements
- Shows responsive previews (desktop/tablet/phone)
- Replace with drag-and-drop

**Relationship Graph Viewer**
- Visual graph of asset relationships
- Click to trace connections
- Impact analysis before changes
- Reverse lookup (where is this used?)
- Forward lookup (what image is here?)

**Import Interface**
- Drop zones mirror destination structure
- Suggested placements based on AI analysis
- Confidence scores for suggestions
- Review before assignment
- Staging area (Incoming → Needs Review → Ready → Published)

---

## Migration Path (Updated)

### Phase 1: Core Structure
1. Create Placements structure (rename Slots)
2. Create Photo Sets structure (rename Collections)
3. Generate internal IDs for all assets
4. Create Asset Registry (with decision-relevant metadata only)
5. Create Placement Registry
6. Create Photo Set Registry
7. Add "Home" concept to every asset

### Phase 2: Import Structure Redesign
1. Rename Incoming Uploads to Import Photos
2. Restructure Import Photos to mirror _System/Originals
3. Add destination categories (Homepage, Services, Projects, Brand, Logos, Marketing, Archive)
4. Add project subfolders (Johnson Fence, Smith Deck, etc.)
5. Create staging area (Incoming → Needs Review → Ready → Published)

### Phase 3: Relationship Mapping
1. Map all current placements to assets
2. Map all assets to photo sets
3. Build relationship graph
4. Create reverse lookup indexes
5. Add impact analysis capability

### Phase 4: UI Components
1. Build Website Explorer (page-first navigation)
2. Build Library Explorer (photo-first navigation)
3. Build Asset Inspector (with "Home" and decision-relevant metadata)
4. Build Placement Inspector (with visual previews)
5. Build Relationship Graph viewer
6. Build Import Interface (with suggested placements)

### Phase 5: Workflow Integration
1. Integrate Import workflow (Import → Review → Approve → Assign → Publish)
2. Integrate Suggested Placements feature
3. Integrate Impact Analysis before publishing
4. Integrate Move Original vs Move Placement distinction
5. Integrate with existing Review/Approval workflow
6. Integrate with Dry Run preview
7. Integrate with Rollback system

### Phase 6: Asset Generation System
1. Separate Originals from Website Assets
2. Implement asset generation from originals (multiple crops/sizes)
3. Add Exports folder (Facebook, Google Business, Brochure)
4. Ensure Originals are sacred (NEVER EDIT)

---

## Benefits Summary (Updated)

### For Users
- Navigate by website structure, not folders (Website Explorer)
- Navigate by photo library (Library Explorer)
- See exactly where assets are used (Asset Inspector)
- Understand impact before changing (Impact Analysis)
- Never type internal IDs (human-readable names only)
- Intuitive "Move" instead of "Replace" (Move Original vs Move Placement)
- Visual previews everywhere (Placement Inspector)
- Import feels like destination (drop zones mirror structure)
- Suggested placements reduce work (AI analysis)
- Decision-relevant metadata only (no enterprise DAM clutter)

### For System
- Stable internal references (internal IDs never change)
- Automatic relationship tracking (Live Relationship Graph)
- Impact analysis built in (before publishing)
- Version tracking automatic (with history)
- Photo Sets simplify gallery management (auto-populate)
- Placements are clear and explicit (visual previews)
- Originals are sacred (NEVER EDIT)
- One original produces multiple website assets (responsive images)
- Staging prevents accidental publication (queue states)
- JSON hidden from UI (implementation detail only)

### For Business
- Prevents mistakes (impact awareness)
- Faster changes (no folder navigation)
- Clear audit trail (relationship graph)
- Easy rollback (version history)
- Scalable (CMS architecture)
- Professional-grade system (5-layer architecture)
- Future-proof (responsive images, multiple crops)
- Safe for non-technical users (simple UI, no JSON)
- Reliable (staging, review, approval workflow)

---

## Key Architectural Changes

### From File System Thinking
- Navigate folders
- Manage files
- Manual organization
- Guess relationships

### To CMS Thinking
- Navigate website structure
- Manage placements
- Automatic organization
- Visible relationships

### Four Core Concepts
1. **Assets** - The photos (with internal IDs)
2. **Placements** - Where assets appear
3. **Collections** - Groups of related assets
4. **Views** - Website pages/sections

### Folders Become Implementation Details
- Users never navigate _System/ folders
- Users never edit JSON files
- Users never type internal IDs
- System handles all file management

---

## Next Steps

1. Create Placements structure (rename Slots)
2. Create Collections structure
3. Generate internal IDs for all 23 current assets
4. Map current website structure to Placements
5. Build relationship graph
6. Design Asset Inspector UI
7. Design Placement Inspector UI
8. Integrate with existing workflow

**This shifts the experience from "managing files" to "managing the website."**
