# Human-Centered Drive Design - COMPLETE

## The Problem

The previous technical structure (MASTER/Variants) was designed for developers, not humans. Taylor/Lanie faced confusing questions:
- Which folder do I use?
- Do I upload into MASTER?
- Do I replace something?
- Do I delete variants?
- What if I accidentally rename something?

## The Solution

**Separate Human Space from Machine Space.**

Taylor/Lanie interact with simple, obvious folders. Automation handles everything technical.

---

## New Drive Structure

```
Happy Place Media
│
├── 📥 Incoming Uploads              (THE INBOX)
│   └── Taylor drops photos here. Done.
│
├── 📚 Website Library               (ORGANIZED PHOTOS)
│   ├── 🏠 Hero
│   │   ├── 📥 DROP HERO IMAGE HERE
│   │   ├── ⚙️ WEBSITE FILES
│   │   └── 📦 PREVIOUS HEROES
│   │
│   ├── 🏗️ Projects
│   │   ├── Johnson Cedar Fence
│   │   │   ├── 📥 DROP NEW PHOTO HERE
│   │   │   ├── ⚙️ WEBSITE FILES
│   │   │   └── 📦 OLD PHOTOS
│   │   │
│   │   ├── Smith Built-Ins
│   │   │   ├── 📥 DROP NEW PHOTO HERE
│   │   │   ├── ⚙️ WEBSITE FILES
│   │   │   └── 📦 OLD PHOTOS
│   │   │
│   │   └── [Other projects...]
│   │
│   └── 🎨 Brand
│       ├── 📥 DROP BRAND PHOTOS HERE
│       ├── ⚙️ WEBSITE FILES
│       └── 📦 OLD PHOTOS
│
├── 🗄️ Archive                      (PROCESSED UPLOADS)
│   └── Processed Uploads
│
└── 🔧 _System                       (HIDDEN - AUTOMATION ONLY)
    ├── Metadata
    ├── Logs
    └── Cache
```

---

## Taylor's Workflow (3 Steps)

### Option 1: The Inbox (Simplest)
1. Take photos with phone/camera
2. Open Google Drive → Happy Place Media → Incoming Uploads
3. Drag and drop photos
4. Close Google Drive
5. **Done.**

### Option 2: Direct to Project (More Control)
1. Take photos with phone/camera
2. Open Google Drive → Happy Place Media → Website Library → Projects → [Project Name]
3. Drop photos in 📥 DROP NEW PHOTO HERE
4. Close Google Drive
5. **Done.**

**That's it.** No thinking. No organization. No resizing. No variants. No replacing.

---

## What Automation Does

When Taylor drops photos:

1. **Detects** new files in DROP zone
2. **Enhances** image quality (denoise, sharpen, exposure correction)
3. **Creates** responsive website versions (AVIF, WebP, JPG)
4. **Generates** blurhash placeholder
5. **Creates** metadata.json file
6. **Moves** original to project folder
7. **Populates** ⚙️ WEBSITE FILES with generated assets
8. **Archives** previous original to 📦 OLD PHOTOS
9. **Updates** media.v1.json with new driveId
10. **Updates** STATUS.txt file
11. **Sends** success email: "Website updated successfully"

Taylor never touches generated files. Ever.

---

## Folder Explanations

### 📥 DROP NEW PHOTO HERE
**Purpose:** Taylor's drop zone.
**Contains:** Original photos from phone/camera.
**Rule:** Drop photos here. That's it.

### ⚙️ WEBSITE FILES
**Purpose:** Generated website assets.
**Contains:** hero.avif, hero.webp, hero.jpg, blurhash.json, metadata.json
**Rule:** **NEVER EDIT.** Automation owns this folder completely.

### 📦 OLD PHOTOS / PREVIOUS HEROES
**Purpose:** Archive of previous photos.
**Contains:** Old originals when Taylor uploads replacements.
**Rule:** Safe to delete if you're sure you don't need them.

### 🔧 _System
**Purpose:** Automation workspace.
**Contains:** Metadata, logs, cache.
**Rule:** **NEVER TOUCH.** Hidden from normal users.

---

## Visual Status System

Every project folder has a STATUS.txt file:

### ✅ Website Updated
```
✅ Website Updated

Last synced: July 29, 2026 5:15 PM

Status: All photos processed and live on website
```

### ⚠ Needs Processing
```
⚠ Needs Processing

Last synced: July 29, 2026 5:10 PM

Status: New photos detected, automation running...
```

### ❌ Failed
```
❌ Failed

Last synced: July 29, 2026 5:05 PM

Reason: Image too small (minimum 1200px width required)
```

Taylor instantly knows if everything worked.

---

## What Taylor Should Never Do

- ❌ Never edit files in ⚙️ WEBSITE FILES
- ❌ Never manually move files between folders
- ❌ Never delete files from DROP zones
- ❌ Never edit STATUS.txt files
- ❌ Never touch 🔧 _System folder

---

## Why This Works

### Human-Readable Names
- **Before:** 001 - Johnson Cedar Fence/MASTER
- **After:** Johnson Cedar Fence/📥 DROP NEW PHOTO HERE

Taylor understands "DROP NEW PHOTO HERE."  
Nobody outside photography says "Where is the MASTER asset?"

### One Action Per Project
Each project has exactly ONE thing Taylor can do:
- Drop photo in 📥 DROP NEW PHOTO HERE

Impossible to misunderstand.

### Technical Complexity Hidden
Taylor doesn't need to understand:
- Variants
- Enhanced versions
- AVIF vs WebP
- Blurhash
- Responsive images
- Metadata
- driveId

Automation handles all of this.

### Project Names, Not Numbers
- **Before:** 001, 002, 003
- **After:** Johnson Cedar Fence, Smith Built-Ins, Wilson Home Repairs

Humans search by customer/project, not by ID.

---

## The Future Agent Workflow

```
Taylor drops photo
    ↓
AI detects project context
    ↓
Matches to website asset
    ↓
Enhances (denoise, sharpen, exposure)
    ↓
Creates responsive images (AVIF, WebP, JPG)
    ↓
Generates blurhash
    ↓
Updates metadata
    ↓
Updates media.json
    ↓
Commits change
    ↓
Deploys
    ↓
Confirms success
    ↓
Archives previous original
    ↓
Emails "Website updated successfully"
```

No human decision-making about:
- Enhanced v3 vs Enhanced v4
- Final vs Really Final
- Best version

That's machine work.

---

## Files Created

**Scripts:**
- `scripts/reorganize-human-centered.mjs` - Reorganization script

**Generated:**
- `generated/human-centered-mapping.json` - New mapping table
- `generated/HUMAN-CENTERED-DRIVE-DESIGN.md` - This document

**Drive Structure:**
- Happy Place Media/Incoming Uploads/
- Happy Place Media/Website Library/Hero/ (with emoji folders)
- Happy Place Media/Website Library/Projects/ (6 projects with emoji folders)
- Happy Place Media/Website Library/Brand/ (with emoji folders)
- Happy Place Media/Archive/
- Happy Place Media/_System/

**README Files:** 21 README.txt files created in DROP/WEBSITE FILES/OLD PHOTOS folders
**Status Files:** 8 STATUS.txt files created in project folders

---

## Current Status

**Structure:** ✅ Complete  
**Files Moved:** ✅ 23 files moved to new locations  
**README Files:** ✅ 21 files created  
**Status Files:** ✅ 8 files created  
**Mapping Table:** ✅ Updated for new structure  

**Next Step:** Implement automation to process DROP zones and generate WEBSITE FILES.

---

## The One Non-Negotiable Principle

**There should never be a situation where Taylor/Lanie is expected to manage generated files.**

Clients should only interact with:
- Original photos
- A "drop here" folder
- Simple project names
- Clear success/failure indicators

Everything else—enhancement, responsive variants, modern formats, metadata, JSON updates, deployment, caching, and archival—is fully automated.

This keeps the system approachable today while aligning with the long-term vision of an agent-managed platform. The less users need to understand the pipeline, the more reliable it will be.
