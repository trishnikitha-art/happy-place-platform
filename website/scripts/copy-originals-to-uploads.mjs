#!/usr/bin/env node
/**
 * Copy Originals to Incoming Uploads
 * 
 * Changes workflow from MOVE to COPY.
 * Originals stay in Incoming Uploads (preserve in place).
 * Processing works from copies in _System/Originals/.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DRIVE_PATH = "H:\\My Drive\\";

async function copyOriginalsToUploads() {
  const systemOriginalsPath = path.join(DRIVE_PATH, "Happy Place Media", "_System", "Originals");
  const incomingUploadsPath = path.join(DRIVE_PATH, "Happy Place Media", "📥 Incoming Uploads");
  
  const projectMapping = {
    "Hero": "Taylor",
    "Brand": "Taylor",
    "Johnson Cedar Fence": "Taylor",
    "Smith Built-Ins": "Taylor",
    "Wilson Home Repairs": "Taylor",
    "Thompson Exterior Painting": "Taylor",
    "Davis Bathroom Remodel": "Taylor",
    "Martinez Pergola": "Taylor"
  };
  
  for (const [project, uploader] of Object.entries(projectMapping)) {
    try {
      const projectPath = path.join(systemOriginalsPath, project);
      const uploaderPath = path.join(incomingUploadsPath, uploader);
      
      const files = await fs.readdir(projectPath);
      
      for (const file of files) {
        if (file.endsWith(".jpg") || file.endsWith(".jpeg") || file.endsWith(".png")) {
          const src = path.join(projectPath, file);
          const dest = path.join(uploaderPath, file);
          
          // Copy file (preserve original in place)
          await fs.copyFile(src, dest);
          console.log(`Copied: ${project}/${file} → ${uploader}/${file}`);
        }
      }
    } catch (e) {
      console.log(`Project ${project} not found or empty`);
    }
  }
}

async function updateWorkflowDocumentation() {
  const systemPath = path.join(DRIVE_PATH, "Happy Place Media", "_System");
  const workflowPath = path.join(systemPath, "WORKFLOW.txt");
  
  const content = `WORKFLOW: COPY, NOT MOVE

PRINCIPLE: Never process the only copy. Ever.

STEP 1: Upload
- Taylor drops photos in 📥 Incoming Uploads/Taylor/
- Originals stay in place (never moved)

STEP 2: Copy to System
- System copies originals to _System/Originals/[Project]/
- Originals remain in Incoming Uploads (preserved forever)

STEP 3: Process from Copy
- System works from _System/Originals/ copies
- Enhancement, responsive generation, metadata all use copies
- Originals in Incoming Uploads never touched

STEP 4: Review & Approve
- Taylor reviews processed results in _System/Queue/Needs Review/
- Confidence scores shown for AI decisions
- Taylor approves or rejects

STEP 5: Publish
- System deploys approved changes to website
- Previous versions archived in _System/History/
- Rollback always available

STEP 6: Archive
- Originals in Incoming Uploads can be archived after successful deployment
- System moves to _System/Queue/Archived/ if desired

WHY COPY INSTEAD OF MOVE:
- Originals preserved forever in original location
- No risk of data loss during processing
- Multiple processing attempts possible from same original
- Clear separation between user space and system space

Last updated: ${new Date().toLocaleDateString()}`;
  
  await fs.writeFile(workflowPath, content);
  console.log(`Created workflow documentation: ${workflowPath}`);
}

async function main() {
  console.log("Changing workflow from MOVE to COPY...\n");
  
  try {
    console.log("=== Copying originals to Incoming Uploads ===");
    await copyOriginalsToUploads();
    
    console.log("\n=== Updating workflow documentation ===");
    await updateWorkflowDocumentation();
    
    console.log("\n=== Workflow change complete ===");
    console.log("Originals now preserved in Incoming Uploads");
    console.log("Processing works from copies in _System/Originals/");
    console.log("No risk of data loss during processing");
    
  } catch (error) {
    console.error("Error during workflow change:", error);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
