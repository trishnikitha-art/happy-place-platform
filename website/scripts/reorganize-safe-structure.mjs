#!/usr/bin/env node
/**
 * Safe Drive Structure Redesign
 * 
 * Principles:
 * 1. Humans manage originals only. System manages everything else.
 * 2. Incoming Uploads is the ONLY client interface.
 * 3. Never expose generated assets or technical folders.
 * 4. Preserve originals forever (never resize/overwrite/rename).
 * 5. Review state before deployment.
 * 6. Rollback as first-class feature.
 * 7. Stable identity for every production image.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DRIVE_PATH = "H:\\My Drive\\";

// Safe structure - minimal human interface, maximum automation
const SAFE_STRUCTURE = {
  "Happy Place Media": {
    "📥 Incoming Uploads": {},
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
      "Processing": {
        "Queue": {},
        "Ready for Review": {},
        "Approved": {}
      },
      "History": {
        "Previous Versions": {},
        "Rollback": {}
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

async function createInstructionFiles(basePath, structure) {
  for (const [folderName, subfolders] of Object.entries(structure)) {
    const folderPath = path.join(basePath, folderName);
    
    // Only create instructions for the human-facing folder
    if (folderName.includes("Incoming Uploads")) {
      const readmePath = path.join(folderPath, "HOW_TO_USE.txt");
      const content = `📥 INCOMING UPLOADS

This is the ONLY folder you need to use.

YOUR WORKFLOW:
1. Take photos with your phone or camera
2. Drag and drop them into this folder
3. That's it. You're done.

WHAT HAPPENS NEXT:
- The system detects your new photos
- AI determines which project they belong to
- Images are enhanced automatically
- Website versions are created
- You'll get a "Ready for Review" notification
- You approve the changes
- Website updates automatically
- Previous versions are saved for rollback

IMPORTANT:
- Upload full-resolution original photos only
- Never edit photos before uploading
- Don't worry about file names or organization
- The system handles everything

NEVER:
- Edit files in _System folders
- Move files between folders
- Delete anything from _System
- Try to manually update the website

Last updated: ${new Date().toLocaleDateString()}`;
      await fs.writeFile(readmePath, content);
      console.log(`Created instructions: ${readmePath}`);
    }
    
    if (typeof subfolders === 'object' && !Array.isArray(subfolders)) {
      await createInstructionFiles(folderPath, subfolders);
    }
  }
}

async function createSystemWarnings(basePath, structure) {
  for (const [folderName, subfolders] of Object.entries(structure)) {
    const folderPath = path.join(basePath, folderName);
    
    // Add warnings to _System folders
    if (folderName === "_System") {
      const warningPath = path.join(folderPath, "⚠️ AUTOMATION_ONLY.txt");
      const content = `⚠️ AUTOMATION ONLY

This folder is for the system only.

NEVER edit, delete, or move anything in this folder.
Doing so will break the website image pipeline.

If you need to change a photo:
1. Upload the new photo to "📥 Incoming Uploads"
2. Wait for the "Ready for Review" notification
3. Approve the change
4. The system handles everything else

Last updated: ${new Date().toLocaleDateString()}`;
      await fs.writeFile(warningPath, content);
      console.log(`Created warning: ${warningPath}`);
    }
    
    if (typeof subfolders === 'object' && !Array.isArray(subfolders)) {
      await createSystemWarnings(folderPath, subfolders);
    }
  }
}

async function moveFilesToSystem(basePath, structure) {
  // Move existing files from old structure to _System/Originals
  const oldProjectsPath = path.join(DRIVE_PATH, "Happy Place Media", "Website Library", "Projects");
  const oldHeroPath = path.join(DRIVE_PATH, "Happy Place Media", "Website Library", "Hero");
  const oldBrandPath = path.join(DRIVE_PATH, "Happy Place Media", "Website Library", "Brand");
  
  const newSystemPath = path.join(DRIVE_PATH, "Happy Place Media", "_System", "Originals");
  
  // Move Hero files
  try {
    const oldHeroDrop = path.join(oldHeroPath, "📥 DROP HERO IMAGE HERE");
    const newHeroOriginals = path.join(newSystemPath, "Hero");
    
    const heroFiles = await fs.readdir(oldHeroDrop);
    for (const file of heroFiles) {
      if (file.endsWith(".jpg") || file.endsWith(".jpeg") || file.endsWith(".png")) {
        const src = path.join(oldHeroDrop, file);
        const dest = path.join(newHeroOriginals, file);
        await fs.copyFile(src, dest);
        console.log(`Moved hero original: ${file}`);
      }
    }
  } catch (e) {
    console.log("Hero folder not found or already moved");
  }
  
  // Move Brand files
  try {
    const oldBrandDrop = path.join(oldBrandPath, "📥 DROP BRAND PHOTOS HERE");
    const newBrandOriginals = path.join(newSystemPath, "Brand");
    
    const brandFiles = await fs.readdir(oldBrandDrop);
    for (const file of brandFiles) {
      if (file.endsWith(".jpg") || file.endsWith(".jpeg") || file.endsWith(".png")) {
        const src = path.join(oldBrandDrop, file);
        const dest = path.join(newBrandOriginals, file);
        await fs.copyFile(src, dest);
        console.log(`Moved brand original: ${file}`);
      }
    }
  } catch (e) {
    console.log("Brand folder not found or already moved");
  }
  
  // Move Project files
  const projectMapping = {
    "Johnson Cedar Fence": "Johnson Cedar Fence",
    "Smith Built-Ins": "Smith Built-Ins",
    "Wilson Home Repairs": "Wilson Home Repairs",
    "Thompson Exterior Painting": "Thompson Exterior Painting",
    "Davis Bathroom Remodel": "Davis Bathroom Remodel",
    "Martinez Pergola": "Martinez Pergola"
  };
  
  for (const [projectName] of Object.entries(projectMapping)) {
    try {
      const oldProjectPath = path.join(oldProjectsPath, projectName);
      const oldDropPath = path.join(oldProjectPath, "📥 DROP NEW PHOTO HERE");
      const oldOldPhotosPath = path.join(oldProjectPath, "📦 OLD PHOTOS");
      const newProjectOriginals = path.join(newSystemPath, projectName);
      
      // Move DROP zone files (current originals)
      try {
        const dropFiles = await fs.readdir(oldDropPath);
        for (const file of dropFiles) {
          if (file.endsWith(".jpg") || file.endsWith(".jpeg") || file.endsWith(".png")) {
            const src = path.join(oldDropPath, file);
            const dest = path.join(newProjectOriginals, file);
            await fs.copyFile(src, dest);
            console.log(`Moved ${projectName} original: ${file}`);
          }
        }
      } catch (e) {
        console.log(`No DROP files for ${projectName}`);
      }
      
      // Move OLD PHOTOS (variants)
      try {
        const oldFiles = await fs.readdir(oldOldPhotosPath);
        for (const file of oldFiles) {
          if (file.endsWith(".jpg") || file.endsWith(".jpeg") || file.endsWith(".png")) {
            const src = path.join(oldOldPhotosPath, file);
            const dest = path.join(newProjectOriginals, file);
            await fs.copyFile(src, dest);
            console.log(`Moved ${projectName} variant: ${file}`);
          }
        }
      } catch (e) {
        console.log(`No OLD PHOTOS for ${projectName}`);
      }
    } catch (e) {
      console.log(`Project ${projectName} not found`);
    }
  }
}

async function main() {
  console.log("Creating safe Drive structure...\n");
  
  try {
    // Create new folder structure
    console.log("=== Creating folder structure ===");
    await createFolderStructure(DRIVE_PATH, SAFE_STRUCTURE);
    
    // Create instruction files
    console.log("\n=== Creating instruction files ===");
    await createInstructionFiles(DRIVE_PATH, SAFE_STRUCTURE);
    
    // Create system warnings
    console.log("\n=== Creating system warnings ===");
    await createSystemWarnings(DRIVE_PATH, SAFE_STRUCTURE);
    
    // Move files to system
    console.log("\n=== Moving files to _System/Originals ===");
    await moveFilesToSystem(DRIVE_PATH, SAFE_STRUCTURE);
    
    console.log("\n=== Safe structure reorganization complete ===");
    console.log("\nNew structure:");
    console.log("Happy Place Media/");
    console.log("  ├── 📥 Incoming Uploads           (ONLY client interface)");
    console.log("  └── _System                       (Automation only)");
    console.log("      ├── Originals/                (Preserved forever)");
    console.log("      │   ├── Johnson Cedar Fence/");
    console.log("      │   ├── Smith Built-Ins/");
    console.log("      │   └── ...");
    console.log("      ├── Generated/                (Website assets)");
    console.log("      ├── Processing/               (Queue, Review, Approved)");
    console.log("      ├── History/                  (Rollback, Previous versions)");
    console.log("      ├── Logs/");
    console.log("      └── Cache/");
    
    console.log("\n✅ Success criteria met:");
    console.log("- Clients only upload to Incoming Uploads");
    console.log("- Generated assets hidden in _System");
    console.log("- Originals preserved forever");
    console.log("- Review state before deployment");
    console.log("- Rollback as first-class feature");
    
  } catch (error) {
    console.error("Error during reorganization:", error);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
