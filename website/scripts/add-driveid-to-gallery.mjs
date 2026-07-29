#!/usr/bin/env node
/**
 * Add driveId fields to gallery.json
 * 
 * This script adds driveId, driveFolder, and driveModifiedAt fields
 * to all provenance objects in gallery.json.
 * 
 * These fields are optional and additive - existing entries simply
 * won't have them until re-synced from Drive.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GALLERY = path.join(ROOT, "src", "config", "gallery.json");

async function main() {
  console.log("Adding driveId fields to gallery.json...");
  
  const data = await fs.readFile(GALLERY, "utf-8");
  const gallery = JSON.parse(data);
  
  let updatedCount = 0;
  
  for (const project of gallery.projects) {
    for (const [role, image] of Object.entries(project.images)) {
      if (image && typeof image === "object" && image.provenance) {
        // Add driveId fields if they don't exist
        if (!image.provenance.driveId) {
          image.provenance.driveId = undefined;
          updatedCount++;
        }
        if (!image.provenance.driveFolder) {
          image.provenance.driveFolder = undefined;
        }
        if (!image.provenance.driveModifiedAt) {
          image.provenance.driveModifiedAt = undefined;
        }
      }
    }
  }
  
  await fs.writeFile(GALLERY, JSON.stringify(gallery, null, 2));
  console.log(`Updated ${updatedCount} image entries with driveId fields.`);
  console.log("Fields added: driveId, driveFolder, driveModifiedAt (all undefined until Drive sync)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
