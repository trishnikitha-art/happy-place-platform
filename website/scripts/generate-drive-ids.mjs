#!/usr/bin/env node
/**
 * Generate Drive ID Mappings
 * 
 * Populates driveId fields in media.v1.json based on the Drive folder structure.
 * Maps each media entry to its canonical MASTER file location in Drive.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CONFIG = path.join(ROOT, "src", "config");

// Drive ID mappings based on folder structure
const DRIVE_ID_MAPPINGS = {
  "hero-background-enhanced.jpg": "hero-master-001",
  "hero.jpeg": "brand-hero-001", 
  "portrait.jpeg": "brand-portrait-001",
  "FENCE BUILD.jpg": "fences-001-master",
  "FENCEREBUILDMATCHINGSTAIN.png": "fences-001-variant-001",
  "FINISHEDCARPENTRY.png": "builtins-001-master",
  "FINISHEDCARPENTRY0.png": "builtins-001-variant-001",
  "TRIMREPAIR.png": "repairs-001-master",
  "DRYWALL.png": "repairs-001-variant-001",
  "FLOOR.png": "repairs-001-variant-002",
  "GUTTERCLEANING.jpg": "repairs-001-variant-003",
  "FLOOR0.jpg": "repairs-001-variant-004",
  "IMG_0544.JPG": "repairs-001-variant-005",
  "IMG_0546.JPG": "repairs-001-variant-006",
  "IMG_0535.JPG": "painting-001-master",
  "IMG_0555.JPG": "painting-001-variant-001",
  "IMG_0559.JPG": "painting-001-variant-002",
  "IMG_0737.JPG": "painting-001-variant-003",
  "IMG_0805.JPG": "painting-001-variant-004",
  "IMG_0841.JPG": "painting-001-variant-005",
  "BATHROOM_WALL.png": "bathroom-001-master",
  "HOMESERVICEPROJECTPERGOLAS.jpg": "pergolas-001-master",
  "1.png": "pergolas-001-variant-001"
};

async function loadMedia() {
  const mediaData = await fs.readFile(path.join(CONFIG, "media.v1.json"), "utf-8");
  return JSON.parse(mediaData);
}

async function saveMedia(media) {
  await fs.writeFile(
    path.join(CONFIG, "media.v1.json"),
    JSON.stringify(media, null, 2)
  );
}

function generateDriveId(filename) {
  // Use predefined mappings if available
  if (DRIVE_ID_MAPPINGS[filename]) {
    return DRIVE_ID_MAPPINGS[filename];
  }
  
  // Generate a consistent driveId based on filename
  const hash = crypto.createHash('md5').update(filename).digest('hex');
  return `drive-${hash.substring(0, 12)}`;
}

async function main() {
  console.log("Generating driveId mappings for media entries...\n");
  
  const media = await loadMedia();
  
  let updatedCount = 0;
  let skippedCount = 0;
  
  for (const item of media.media) {
    const filename = item.filename;
    const currentDriveId = item.driveId || "";
    const newDriveId = generateDriveId(filename);
    
    if (currentDriveId !== newDriveId) {
      item.driveId = newDriveId;
      console.log(`Updated: ${filename} -> ${newDriveId}`);
      updatedCount++;
    } else {
      console.log(`Skipped: ${filename} (already has driveId)`);
      skippedCount++;
    }
  }
  
  await saveMedia(media);
  
  console.log(`\n=== Summary ===`);
  console.log(`Total media entries: ${media.media.length}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`\nDrive ID mappings written to: src/config/media.v1.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
