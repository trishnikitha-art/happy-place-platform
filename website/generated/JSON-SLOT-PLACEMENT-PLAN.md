# JSON-Based Slot Placement System - PLAN

## Objective

Create a dedicated folder for website placements using JSON pointers instead of photo copies. No duplicate images. Easy to move or change asset locations without opening JSON files.

---

## Proposed Structure

```
_System/
  Slots/
    Homepage/
      hero.json
      featured-project.json
    
    Services/
      fences-card.json
      decks-card.json
      bathrooms-card.json
      repairs-card.json
      painting-card.json
      pergolas-card.json
    
    Projects/
      johnson-cover.json
      smith-cover.json
      wilson-cover.json
      thompson-cover.json
      davis-cover.json
      martinez-cover.json
    
    About/
      hero.json
      portrait.json
    
    Gallery/
      deck-gallery.json
      fence-gallery.json
      bathroom-gallery.json
      outdoor-living-gallery.json
```

---

## JSON Format

Each JSON file simply points to an asset:

```json
{
  "assetId": "hero-background-enhanced-v1"
}
```

**No duplicate images exist.** The JSON only references the asset by ID.

---

## AssetId Naming Convention

**Format:** `{project}-{type}-{version}`

**Examples:**
- `hero-background-enhanced-v1` - Homepage hero
- `fences-johnson-cover-v1` - Johnson fence project cover
- `brand-hero-taylor-v1` - Brand hero photo
- `decks-featured-project-v1` - Featured deck project

**Components:**
- **project:** fences, decks, bathrooms, repairs, painting, pergolas, hero, brand
- **type:** cover, hero, card, gallery, portrait, featured
- **version:** v1, v2, v3 (increments on replacement)

---

## Current Website Placements → JSON Mapping

### Homepage
- **hero.json** → `hero-background-enhanced-v1`
- **featured-project.json** → `fences-johnson-cover-v1`

### Services
- **fences-card.json** → `fences-johnson-cover-v1`
- **decks-card.json** → (needs deck project)
- **bathrooms-card.json** → `bathrooms-davis-cover-v1`
- **repairs-card.json** → `repairs-wilson-cover-v1`
- **painting-card.json** → `painting-thompson-cover-v1`
- **pergolas-card.json** → `pergolas-martinez-cover-v1`

### Projects
- **johnson-cover.json** → `fences-johnson-cover-v1`
- **smith-cover.json** → `builtins-smith-cover-v1`
- **wilson-cover.json** → `repairs-wilson-cover-v1`
- **thompson-cover.json** → `painting-thompson-cover-v1`
- **davis-cover.json** → `bathrooms-davis-cover-v1`
- **martinez-cover.json** → `pergolas-martinez-cover-v1`

### About
- **hero.json** → `brand-hero-taylor-v1`
- **portrait.json** → `brand-portrait-taylor-v1`

### Gallery
- **deck-gallery.json** → (array of deck asset IDs)
- **fence-gallery.json** → (array of fence asset IDs)
- **bathroom-gallery.json** → (array of bathroom asset IDs)
- **outdoor-living-gallery.json** → (array of outdoor living asset IDs)

---

## How It Works

### Changing an Asset
**Before:** Move photo file, update multiple references
**After:** Edit one JSON file:

```json
{
  "assetId": "fences-johnson-cover-v2"
}
```

That's it. The system looks up the new asset and updates the website.

### Adding a New Project
1. Create new asset in _System/Originals/[Project]/
2. Generate assetId (e.g., `decks-newproject-cover-v1`)
3. Create `newproject-cover.json` in _System/Slots/Projects/
4. Done

### Reordering Gallery
**Before:** Reorder files in folder
**After:** Edit gallery.json:

```json
{
  "assetIds": [
    "fences-johnson-gallery-001",
    "fences-johnson-gallery-002",
    "fences-johnson-gallery-003"
  ]
}
```

---

## Asset Registry

All assets tracked in a single registry:

```json
{
  "hero-background-enhanced-v1": {
    "originalFile": "hero-background-enhanced.jpg",
    "location": "_System/Originals/Hero/",
    "versions": ["v1"],
    "currentVersion": "v1",
    "metadata": {
      "width": 1920,
      "height": 1080,
      "format": "jpg",
      "uploader": "Taylor",
      "uploadedAt": "2026-07-29"
    }
  }
}
```

**Benefits:**
- Single source of truth for all assets
- Easy to find any asset
- Version tracking built in
- No duplicate images

---

## Simplified User Experience

### For Taylor/Lanie (No JSON Editing)

**Option 1: Drag and Drop**
1. Drop new photo in Incoming Uploads
2. System asks: "Which placement?"
3. Taylor selects: "Johnson Fence Cover"
4. System updates JSON automatically
5. Done

**Option 2: Simple UI**
```
Homepage Hero
Current: hero-background-enhanced.jpg
[Change Photo]

Johnson Fence Cover
Current: FENCE BUILD.jpg
[Change Photo]

Services - Fences Card
Current: FENCE BUILD.jpg
[Change Photo]
```

Click "Change Photo" → Select new photo → System updates JSON.

---

## Implementation Plan

### Phase 1: Structure Setup
1. Create _System/Slots/ directory structure
2. Create JSON files for all current placements
3. Map current assets to assetIds
4. Create asset registry

### Phase 2: Asset ID Generation
1. Generate assetIds for all 23 current photos
2. Update asset registry with metadata
3. Link JSON files to assetIds

### Phase 3: Automation Integration
1. Update automation to read JSON files
2. Update automation to write JSON files on approval
3. Update dry run to show JSON changes
4. Update rollback to restore JSON versions

### Phase 4: User Interface (Future)
1. Create simple UI for viewing placements
2. Create simple UI for changing placements
3. Add drag-and-drop assignment
4. Add visual preview of current vs proposed

---

## Benefits

### No Duplicate Images
- Photos exist only in _System/Originals/
- JSON files only reference assets by ID
- Single source of truth

### Easy to Change Locations
- Edit one JSON file
- System handles the rest
- No file moving required

### Easy to Add New Placements
- Create new JSON file
- Point to assetId
- Done

### Easy to Reorder
- Edit array in JSON
- System reorders display
- No file moving

### Version Tracking Built In
- assetId includes version (v1, v2, v3)
- Asset registry tracks all versions
- Rollback restores previous JSON

### Simplified for Non-Technical Users
- Never need to open JSON files
- Simple UI or drag-and-drop
- System handles all complexity

---

## Migration Path

### Current State
- Photos in _System/Originals/
- Website references files directly
- No assetId system

### Target State
- Photos in _System/Originals/ (unchanged)
- JSON files in _System/Slots/ reference assets by ID
- Website reads JSON to find assets
- Asset registry tracks everything

### Migration Steps
1. Create _System/Slots/ structure
2. Generate assetIds for all current photos
3. Create JSON files for all current placements
4. Update website to read JSON files instead of direct paths
5. Test all placements
6. Remove old direct path references

---

## Example Workflow

### Taylor Changes Homepage Hero

**Current Workflow:**
1. Taylor uploads new photo
2. System processes photo
3. System replaces hero-background-enhanced.jpg
4. Website updates

**New Workflow:**
1. Taylor uploads new photo
2. System processes photo
3. System generates new assetId: `hero-background-enhanced-v2`
4. System updates _System/Slots/Homepage/hero.json:
   ```json
   {
     "assetId": "hero-background-enhanced-v2"
   }
   ```
5. Website reads JSON, finds v2, displays new photo
6. Old v1 preserved in asset registry for rollback

**Difference:** No file replacement. Only JSON pointer changes.

---

## Summary

**Structure:** _System/Slots/ with JSON files pointing to assets
**Format:** Simple JSON with assetId
**No Duplicates:** Photos exist only in _System/Originals/
**Easy Changes:** Edit one JSON file
**Version Tracking:** Built into assetId
**User Experience:** Simple UI, no JSON editing required

**Next Step:** Implement structure setup and asset ID generation.
