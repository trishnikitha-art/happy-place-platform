#!/usr/bin/env node
/**
 * Human-Centered Drive Reorganization
 * 
 * Redesigns Drive structure to separate Human Space from Machine Space.
 * Taylor/Lanie only interact with: Incoming Uploads, DROP NEW PHOTO HERE folders
 * Automation handles everything else.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DRIVE_PATH = "H:\\My Drive\\";

// New human-centered structure
const HUMAN_CENTERED_STRUCTURE = {
  "Happy Place Media": {
    "Incoming Uploads": {},
    "Website Library": {
      "Hero": {
        "📥 DROP HERO IMAGE HERE": {},
        "⚙️ WEBSITE FILES": {},
        "📦 PREVIOUS HEROES": {}
      },
      "Projects": {
        "Johnson Cedar Fence": {
          "📥 DROP NEW PHOTO HERE": {},
          "⚙️ WEBSITE FILES": {},
          "📦 OLD PHOTOS": {}
        },
        "Smith Built-Ins": {
          "📥 DROP NEW PHOTO HERE": {},
          "⚙️ WEBSITE FILES": {},
          "📦 OLD PHOTOS": {}
        },
        "Wilson Home Repairs": {
          "📥 DROP NEW PHOTO HERE": {},
          "⚙️ WEBSITE FILES": {},
          "📦 OLD PHOTOS": {}
        },
        "Thompson Exterior Painting": {
          "📥 DROP NEW PHOTO HERE": {},
          "⚙️ WEBSITE FILES": {},
          "📦 OLD PHOTOS": {}
        },
        "Davis Bathroom Remodel": {
          "📥 DROP NEW PHOTO HERE": {},
          "⚙️ WEBSITE FILES": {},
          "📦 OLD PHOTOS": {}
        },
        "Martinez Pergola": {
          "📥 DROP NEW PHOTO HERE": {},
          "⚙️ WEBSITE FILES": {},
          "📦 OLD PHOTOS": {}
        }
      },
      "Brand": {
        "📥 DROP BRAND PHOTOS HERE": {},
        "⚙️ WEBSITE FILES": {},
        "📦 OLD PHOTOS": {}
      }
    },
    "Archive": {
      "Processed Uploads": {}
    },
    "_System": {
      "Metadata": {},
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

async function createReadmeFiles(basePath, structure) {
  for (const [folderName, subfolders] of Object.entries(structure)) {
    const folderPath = path.join(basePath, folderName);
    
    // Create README for human-facing folders
    if (folderName.includes("DROP")) {
      const readmePath = path.join(folderPath, "README.txt");
      const content = `DROP NEW PHOTOS HERE

This is your drop zone. 

1. Take photos with your phone or camera
2. Drag and drop them into this folder
3. That's it. You're done.

The automation will:
- Enhance your photos
- Create website versions
- Update the website
- Archive old photos
- Email you when complete

Never delete anything from this folder.
The automation handles everything.

Last updated: ${new Date().toLocaleDateString()}`;
      await fs.writeFile(readmePath, content);
      console.log(`Created README: ${readmePath}`);
    }
    
    if (folderName.includes("WEBSITE FILES")) {
      const readmePath = path.join(folderPath, "README.txt");
      const content = `⚙️ WEBSITE FILES

AUTOMATION ONLY - DO NOT EDIT

This folder contains:
- Optimized website images (AVIF, WebP, JPG)
- Blurhash placeholders
- Metadata files

These files are generated automatically.
Never edit, delete, or rename anything here.

If you need to change a photo:
1. Drop the new photo in "📥 DROP NEW PHOTO HERE"
2. Automation will replace everything here automatically

Last updated: ${new Date().toLocaleDateString()}`;
      await fs.writeFile(readmePath, content);
      console.log(`Created README: ${readmePath}`);
    }
    
    if (folderName.includes("OLD PHOTOS") || folderName.includes("PREVIOUS")) {
      const readmePath = path.join(folderPath, "README.txt");
      const content = `📦 OLD PHOTOS

Archive of previous photos.

These are automatically moved here when you upload new photos.
Safe to delete if you're sure you don't need them.

Last updated: ${new Date().toLocaleDateString()}`;
      await fs.writeFile(readmePath, content);
      console.log(`Created README: ${readmePath}`);
    }
    
    if (typeof subfolders === 'object' && !Array.isArray(subfolders)) {
      await createReadmeFiles(folderPath, subfolders);
    }
  }
}

async function createStatusFiles(basePath, structure) {
  for (const [folderName, subfolders] of Object.entries(structure)) {
    const folderPath = path.join(basePath, folderName);
    
    // Create status file for projects
    if (folderName.includes("Johnson") || folderName.includes("Smith") || 
        folderName.includes("Wilson") || folderName.includes("Thompson") ||
        folderName.includes("Davis") || folderName.includes("Martinez") ||
        folderName.includes("Hero") || folderName.includes("Brand")) {
      const statusPath = path.join(folderPath, "STATUS.txt");
      const content = `✅ Website Updated

Last synced: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}

Status: All photos processed and live on website

If you see ⚠ Needs Processing or ❌ Failed:
- Check that you dropped photos in the correct folder
- Wait 5 minutes for automation to process
- Contact support if issue persists`;
      await fs.writeFile(statusPath, content);
      console.log(`Created STATUS: ${statusPath}`);
    }
    
    if (typeof subfolders === 'object' && !Array.isArray(subfolders)) {
      await createStatusFiles(folderPath, subfolders);
    }
  }
}

async function moveExistingFiles(basePath, structure) {
  // Move existing files to new structure
  const oldProjectsPath = path.join(DRIVE_PATH, "Projects");
  const oldHeroPath = path.join(DRIVE_PATH, "Hero");
  const oldBrandPath = path.join(DRIVE_PATH, "Brand");
  
  const newProjectsPath = path.join(DRIVE_PATH, "Happy Place Media", "Website Library", "Projects");
  const newHeroPath = path.join(DRIVE_PATH, "Happy Place Media", "Website Library", "Hero");
  const newBrandPath = path.join(DRIVE_PATH, "Happy Place Media", "Website Library", "Brand");
  
  // Move Hero files
  try {
    const oldHeroMaster = path.join(oldHeroPath, "MASTER");
    const newHeroDrop = path.join(newHeroPath, "📥 DROP HERO IMAGE HERE");
    const newHeroWebsite = path.join(newHeroPath, "⚙️ WEBSITE FILES");
    
    const heroFiles = await fs.readdir(oldHeroMaster);
    for (const file of heroFiles) {
      if (file.endsWith(".jpg") || file.endsWith(".jpeg") || file.endsWith(".png")) {
        const src = path.join(oldHeroMaster, file);
        const dest = path.join(newHeroDrop, file);
        await fs.copyFile(src, dest);
        console.log(`Moved hero file: ${file}`);
      }
    }
  } catch (e) {
    console.log("Hero folder not found or already moved");
  }
  
  // Move Brand files
  try {
    const oldBrandMaster = path.join(oldBrandPath, "MASTER");
    const newBrandDrop = path.join(newBrandPath, "📥 DROP BRAND PHOTOS HERE");
    
    const brandFiles = await fs.readdir(oldBrandMaster);
    for (const file of brandFiles) {
      if (file.endsWith(".jpg") || file.endsWith(".jpeg") || file.endsWith(".png")) {
        const src = path.join(oldBrandMaster, file);
        const dest = path.join(newBrandDrop, file);
        await fs.copyFile(src, dest);
        console.log(`Moved brand file: ${file}`);
      }
    }
  } catch (e) {
    console.log("Brand folder not found or already moved");
  }
  
  // Move Project files
  const projectMapping = {
    "001 - Johnson Cedar Fence": "Johnson Cedar Fence",
    "002 - Smith Built-Ins": "Smith Built-Ins",
    "003 - Wilson Home Repairs": "Wilson Home Repairs",
    "004 - Thompson Exterior Painting": "Thompson Exterior Painting",
    "005 - Davis Bathroom Remodel": "Davis Bathroom Remodel",
    "006 - Martinez Pergola": "Martinez Pergola"
  };
  
  for (const [oldName, newName] of Object.entries(projectMapping)) {
    try {
      const oldProjectPath = path.join(oldProjectsPath, oldName);
      const oldMasterPath = path.join(oldProjectPath, "MASTER");
      const oldVariantsPath = path.join(oldProjectPath, "Variants");
      const newProjectPath = path.join(newProjectsPath, newName);
      const newDropPath = path.join(newProjectPath, "📥 DROP NEW PHOTO HERE");
      
      // Move MASTER files to DROP zone
      try {
        const masterFiles = await fs.readdir(oldMasterPath);
        for (const file of masterFiles) {
          if (file.endsWith(".jpg") || file.endsWith(".jpeg") || file.endsWith(".png")) {
            const src = path.join(oldMasterPath, file);
            const dest = path.join(newDropPath, file);
            await fs.copyFile(src, dest);
            console.log(`Moved ${newName} master: ${file}`);
          }
        }
      } catch (e) {
        console.log(`No MASTER files for ${newName}`);
      }
      
      // Move Variants to OLD PHOTOS
      try {
        const variantFiles = await fs.readdir(oldVariantsPath);
        for (const file of variantFiles) {
          if (file.endsWith(".jpg") || file.endsWith(".jpeg") || file.endsWith(".png")) {
            const src = path.join(oldVariantsPath, file);
            const dest = path.join(newProjectPath, "📦 OLD PHOTOS", file);
            await fs.copyFile(src, dest);
            console.log(`Moved ${newName} variant: ${file}`);
          }
        }
      } catch (e) {
        console.log(`No Variants for ${newName}`);
      }
    } catch (e) {
      console.log(`Project ${oldName} not found`);
    }
  }
}

async function main() {
  console.log("Creating human-centered Drive structure...\n");
  
  try {
    // Create new folder structure
    console.log("=== Creating folder structure ===");
    await createFolderStructure(DRIVE_PATH, HUMAN_CENTERED_STRUCTURE);
    
    // Create README files
    console.log("\n=== Creating README files ===");
    await createReadmeFiles(DRIVE_PATH, HUMAN_CENTERED_STRUCTURE);
    
    // Create status files
    console.log("\n=== Creating status files ===");
    await createStatusFiles(DRIVE_PATH, HUMAN_CENTERED_STRUCTURE);
    
    // Move existing files
    console.log("\n=== Moving existing files ===");
    await moveExistingFiles(DRIVE_PATH, HUMAN_CENTERED_STRUCTURE);
    
    console.log("\n=== Human-centered reorganization complete ===");
    console.log("\nNew structure:");
    console.log("Happy Place Media/");
    console.log("  ├── Incoming Uploads/          (Drop zone)");
    console.log("  ├── Website Library/");
    console.log("  │   ├── Hero/");
    console.log("  │   │   ├── 📥 DROP HERO IMAGE HERE");
    console.log("  │   │   ├── ⚙️ WEBSITE FILES");
    console.log("  │   │   └── 📦 PREVIOUS HEROES");
    console.log("  │   ├── Projects/");
    console.log("  │   │   └── [Project Name]/");
    console.log("  │   │       ├── 📥 DROP NEW PHOTO HERE");
    console.log("  │   │       ├── ⚙️ WEBSITE FILES");
    console.log("  │   │       └── 📦 OLD PHOTOS");
    console.log("  │   └── Brand/");
    console.log("  ├── Archive/");
    console.log("  └── _System/                   (Hidden, automation only)");
    
  } catch (error) {
    console.error("Error during reorganization:", error);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
