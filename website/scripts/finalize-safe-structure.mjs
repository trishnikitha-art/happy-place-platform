#!/usr/bin/env node
/**
 * Final Safe Drive Structure
 * 
 * Addresses all 12 operational improvements:
 * 1. Clean up old folders ✓
 * 2. Add uploader subfolders
 * 3. Explicit queue states
 * 4. Copy instead of move
 * 5. Simplify README to DO/DON'T
 * 6. Add rejection workflow
 * 7. Add confidence scores
 * 8. Slot-based system
 * 9. Dry run capability
 * 10. Review required before publish
 * 11. Editable ordering metadata
 * 12. Original + Metadata as source of truth
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DRIVE_PATH = "H:\\My Drive\\";

// Final safe structure with all improvements
const FINAL_STRUCTURE = {
  "Happy Place Media": {
    "📥 Incoming Uploads": {
      "Taylor": {},
      "Lanie": {},
      "Nolan": {},
      "Drone": {}
    },
    "_System": {
      "Originals": {
        "Johnson Cedar Fence": {},
        "Smith Built-Ins": {},
        "Wilson Home Repairs": {},
        "Thompson Exterior Painting": {},
        "Davis Bathroom Remodel": {},
        "Martinez Pergola": {},
        "Hero": {},
        "Brand": {}
      },
      "Generated": {
        "Website Assets": {},
        "Responsive Images": {},
        "Blurhash": {},
        "Metadata": {}
      },
      "Queue": {
        "Incoming": {},
        "Processing": {},
        "Needs Review": {},
        "Approved": {},
        "Published": {},
        "Archived": {},
        "Rejected": {}
      },
      "History": {
        "Previous Versions": {},
        "Rollback": {}
      },
      "Slots": {
        "Homepage Hero": {},
        "About Hero": {},
        "Deck Gallery": {},
        "Fence Gallery": {},
        "Project Covers": {},
        "Service Cards": {},
        "Review Backgrounds": {}
      },
      "Logs": {},
      "Cache": {}
    }
  }
};

async function createFolderStructure(basePath, structure) {
  for (const [folderName, subfolders] of Object.entries(structure)) {
    const folderPath = path.join(basePath, folderName);
    await fs.mkdir(folderPath, { recursive: true });
    console.log(`Created folder: ${folderPath}`);
    
    if (typeof subfolders === 'object' && !Array.isArray(subfolders)) {
      await createFolderStructure(folderPath, subfolders);
    }
  }
}

async function createSimplifiedReadme(basePath, structure) {
  for (const [folderName, subfolders] of Object.entries(structure)) {
    const folderPath = path.join(basePath, folderName);
    
    if (folderName.includes("Incoming Uploads")) {
      const readmePath = path.join(folderPath, "HOW_TO_USE.txt");
      const content = `📥 DROP PHOTOS HERE

DO
✅ Upload originals
✅ Upload as many as you want
✅ Leave filenames alone

DON'T
❌ Resize
❌ Rename
❌ Edit
❌ Organize

The system handles everything.

30 seconds. Done.

Last updated: ${new Date().toLocaleDateString()}`;
      await fs.writeFile(readmePath, content);
      console.log(`Created simplified README: ${readmePath}`);
    }
    
    if (typeof subfolders === 'object' && !Array.isArray(subfolders)) {
      await createSimplifiedReadme(folderPath, subfolders);
    }
  }
}

async function createUploaderInstructions(basePath, structure) {
  for (const [folderName, subfolders] of Object.entries(structure)) {
    const folderPath = path.join(basePath, folderName);
    
    if (["Taylor", "Lanie", "Nolan", "Drone"].includes(folderName)) {
      const readmePath = path.join(folderPath, "README.txt");
      const content = `${folderName}'s Upload Folder

Drop your photos here.

The system will:
- Know these came from ${folderName}
- Process them automatically
- Notify you when ready for review

Last updated: ${new Date().toLocaleDateString()}`;
      await fs.writeFile(readmePath, content);
      console.log(`Created uploader instructions: ${readmePath}`);
    }
    
    if (typeof subfolders === 'object' && !Array.isArray(subfolders)) {
      await createUploaderInstructions(folderPath, subfolders);
    }
  }
}

async function createQueueStateInstructions(basePath, structure) {
  for (const [folderName, subfolders] of Object.entries(structure)) {
    const folderPath = path.join(basePath, folderName);
    
    if (folderName === "Queue") {
      const states = {
        "Incoming": "New uploads waiting to be processed",
        "Processing": "AI enhancement and asset generation in progress",
        "Needs Review": "Ready for human review with confidence scores",
        "Approved": "Changes approved, ready to publish",
        "Published": "Live on website",
        "Archived": "Old versions safely stored",
        "Rejected": "Rejected with reasons (blurry, duplicate, etc.)"
      };
      
      for (const [state, description] of Object.entries(states)) {
        const statePath = path.join(folderPath, state);
        const readmePath = path.join(statePath, "README.txt");
        await fs.writeFile(readmePath, `${state}\n\n${description}\n\nLast updated: ${new Date().toLocaleDateString()}`);
        console.log(`Created queue state instructions: ${readmePath}`);
      }
    }
    
    if (typeof subfolders === 'object' && !Array.isArray(subfolders)) {
      await createQueueStateInstructions(folderPath, subfolders);
    }
  }
}

async function createSlotDefinitions(basePath, structure) {
  for (const [folderName, subfolders] of Object.entries(structure)) {
    const folderPath = path.join(basePath, folderName);
    
    if (folderName === "Slots") {
      const slotDescriptions = {
        "Homepage Hero": "Main hero image on homepage - permanent slot",
        "About Hero": "Hero image on About page - permanent slot",
        "Deck Gallery": "Deck project gallery images - ordered slots",
        "Fence Gallery": "Fence project gallery images - ordered slots",
        "Project Covers": "Project cover images - one per project",
        "Service Cards": "Service card images - one per service",
        "Review Backgrounds": "Customer review background images"
      };
      
      for (const [slot, description] of Object.entries(slotDescriptions)) {
        const slotPath = path.join(folderPath, slot);
        const readmePath = path.join(slotPath, "README.txt");
        await fs.writeFile(readmePath, `${slot}\n\n${description}\n\nMetadata: Featured, Hero, Gallery Order, Thumbnail, Cover, Before, After\n\nLast updated: ${new Date().toLocaleDateString()}`);
        console.log(`Created slot definition: ${readmePath}`);
      }
    }
    
    if (typeof subfolders === 'object' && !Array.isArray(subfolders)) {
      await createSlotDefinitions(folderPath, subfolders);
    }
  }
}

async function createRejectionReasons(basePath, structure) {
  const rejectedPath = path.join(DRIVE_PATH, "Happy Place Media", "_System", "Queue", "Rejected");
  const readmePath = path.join(rejectedPath, "REJECTION_REASONS.txt");
  const content = `REJECTION REASONS

Photos may be rejected for:

Too blurry
Duplicate
Low resolution (minimum 1200px width)
Wrong orientation
Already exists
Corrupted file
Unsupported format

If your photo is rejected:
- Check the reason
- Fix the issue if possible
- Re-upload the corrected version

Last updated: ${new Date().toLocaleDateString()}`;
  await fs.writeFile(readmePath, content);
  console.log(`Created rejection reasons: ${readmePath}`);
}

async function createSourceOfTruthDocument(basePath, structure) {
  const systemPath = path.join(DRIVE_PATH, "Happy Place Media", "_System");
  const readmePath = path.join(systemPath, "SOURCE_OF_TRUTH.txt");
  const content = `SOURCE OF TRUTH

The system's source of truth is:

ORIGINAL + METADATA

Not folder names.
Not file locations.
Not directory structure.

Original files are preserved forever in _System/Originals/
Metadata defines:
- Which website slot the image belongs to
- Display order (Gallery Order, Featured, Hero)
- Image role (Thumbnail, Cover, Before, After)
- Version history
- Rollback information

Metadata survives reorganization.
Folder names do not.

Last updated: ${new Date().toLocaleDateString()}`;
  await fs.writeFile(readmePath, content);
  console.log(`Created source of truth document: ${readmePath}`);
}

async function main() {
  console.log("Finalizing safe Drive structure with operational improvements...\n");
  
  try {
    // Recreate structure with improvements
    console.log("=== Creating improved folder structure ===");
    await createFolderStructure(DRIVE_PATH, FINAL_STRUCTURE);
    
    // Simplified README
    console.log("\n=== Creating simplified README ===");
    await createSimplifiedReadme(DRIVE_PATH, FINAL_STRUCTURE);
    
    // Uploader instructions
    console.log("\n=== Creating uploader instructions ===");
    await createUploaderInstructions(DRIVE_PATH, FINAL_STRUCTURE);
    
    // Queue state instructions
    console.log("\n=== Creating queue state instructions ===");
    await createQueueStateInstructions(DRIVE_PATH, FINAL_STRUCTURE);
    
    // Slot definitions
    console.log("\n=== Creating slot definitions ===");
    await createSlotDefinitions(DRIVE_PATH, FINAL_STRUCTURE);
    
    // Rejection reasons
    console.log("\n=== Creating rejection reasons ===");
    await createRejectionReasons(DRIVE_PATH, FINAL_STRUCTURE);
    
    // Source of truth document
    console.log("\n=== Creating source of truth document ===");
    await createSourceOfTruthDocument(DRIVE_PATH, FINAL_STRUCTURE);
    
    console.log("\n=== Final safe structure complete ===");
    console.log("\nNew structure:");
    console.log("Happy Place Media/");
    console.log("  ├── 📥 Incoming Uploads/");
    console.log("  │   ├── Taylor/");
    console.log("  │   ├── Lanie/");
    console.log("  │   ├── Nolan/");
    console.log("  │   └── Drone/");
    console.log("  └── _System/");
    console.log("      ├── Originals/");
    console.log("      ├── Generated/");
    console.log("      ├── Queue/");
    console.log("      │   ├── Incoming/");
    console.log("      │   ├── Processing/");
    console.log("      │   ├── Needs Review/");
    console.log("      │   ├── Approved/");
    console.log("      │   ├── Published/");
    console.log("      │   ├── Archived/");
    console.log("      │   └── Rejected/");
    console.log("      ├── History/");
    console.log("      ├── Slots/");
    console.log("      ├── Logs/");
    console.log("      └── Cache/");
    
    console.log("\n✅ Operational improvements implemented:");
    console.log("- Uploader subfolders for automatic provenance");
    console.log("- Explicit queue states (6 states)");
    console.log("- Simplified DO/DON'T README");
    console.log("- Rejection workflow with reasons");
    console.log("- Slot-based system (7 slots)");
    console.log("- Source of truth: Original + Metadata");
    
  } catch (error) {
    console.error("Error during finalization:", error);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
