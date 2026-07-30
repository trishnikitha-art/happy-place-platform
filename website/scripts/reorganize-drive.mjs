#!/usr/bin/env node
/**
 * Drive Reorganization Script
 * 
 * Reorganizes local Google Drive folder to mirror website structure.
 * Creates project-based folder structure with MASTER/Variants organization.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DRIVE_PATH = "H:\\My Drive\\";

// Drive folder structure based on mapping table
const DRIVE_STRUCTURE = {
  "Hero": {
    "MASTER": ["hero-background-enhanced.jpg"],
    "Variants": []
  },
  "Brand": {
    "MASTER": ["hero.jpeg", "portrait.jpeg"],
    "Variants": []
  },
  "Projects": {
    "001 - Johnson Cedar Fence": {
      "MASTER": ["FENCE BUILD.jpg"],
      "Variants": ["FENCE BEFORE.jpg", "FENCE AFTER.jpg", "FENCEREBUILDMATCHINGSTAIN.png"],
      "Drone": [],
      "Progress": [],
      "Finished": []
    },
    "002 - Smith Built-Ins": {
      "MASTER": ["FINISHEDCARPENTRY.png"],
      "Variants": ["FINISHEDCARPENTRY0.png"],
      "Progress": []
    },
    "003 - Wilson Home Repairs": {
      "MASTER": ["TRIMREPAIR.png"],
      "Variants": ["DRYWALL.png", "FLOOR.png", "GUTTERCLEANING.jpg", "FLOOR0.jpg", "IMG_0544.JPG", "IMG_0546.JPG"],
      "Progress": []
    },
    "004 - Thompson Exterior Painting": {
      "MASTER": ["IMG_0535.JPG"],
      "Variants": ["IMG_0555.JPG", "IMG_0559.JPG", "IMG_0737.JPG", "IMG_0805.JPG", "IMG_0841.JPG"],
      "Progress": []
    },
    "005 - Davis Bathroom Remodel": {
      "MASTER": ["BATHROOM_WALL.png"],
      "Variants": [],
      "Progress": []
    },
    "006 - Martinez Pergola": {
      "MASTER": ["HOMESERVICEPROJECTPERGOLAS.jpg"],
      "Variants": ["1.png"],
      "Progress": []
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

async function moveFilesToStructure(basePath, structure) {
  for (const [folderName, subfolders] of Object.entries(structure)) {
    const folderPath = path.join(basePath, folderName);
    
    if (typeof subfolders === 'object' && !Array.isArray(subfolders)) {
      await moveFilesToStructure(folderPath, subfolders);
    } else if (Array.isArray(subfolders)) {
      // This is a file list (MASTER, Variants, etc.)
      for (const filename of subfolders) {
        const sourcePath = path.join(DRIVE_PATH, filename);
        const destPath = path.join(folderPath, filename);
        
        try {
          // Check if source exists
          await fs.access(sourcePath);
          
          // Move file
          await fs.rename(sourcePath, destPath);
          console.log(`Moved: ${filename} -> ${folderPath}`);
        } catch (error) {
          console.log(`File not found (will need to be added): ${filename}`);
        }
      }
    }
  }
}

async function main() {
  console.log("Reorganizing Drive folder structure...\n");
  
  try {
    // Create folder structure
    console.log("=== Creating folder structure ===");
    await createFolderStructure(DRIVE_PATH, DRIVE_STRUCTURE);
    
    // Move files to new structure
    console.log("\n=== Moving files to new structure ===");
    await moveFilesToStructure(DRIVE_PATH, DRIVE_STRUCTURE);
    
    console.log("\n=== Reorganization complete ===");
    console.log("Note: Files marked as 'not found' need to be added manually");
    console.log("They are currently missing from the Drive folder.");
    
  } catch (error) {
    console.error("Error during reorganization:", error);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
