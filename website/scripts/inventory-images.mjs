#!/usr/bin/env node
/**
 * Image Inventory Script
 * 
 * Crawls all pages and components to inventory every image used on the website.
 * Creates a comprehensive mapping table for Drive reorganization.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const CONFIG = path.join(ROOT, "src", "config");

// Image inventory
const inventory = {
  homepage: {
    hero: {
      source: "page.tsx line 69",
      filename: "hero-background-enhanced.jpg",
      path: "/images/hero-background-enhanced.jpg",
      alt: "Photograph of a completed deck project showing quality carpentry work with warm wood tones and clean construction",
      dimensions: "unknown",
      role: "hero",
      page: "Home",
      section: "Hero"
    }
  },
  brand: {
    hero: {
      source: "media.v1.json brand-hero",
      filename: "hero.jpeg",
      path: "/images/projects/hero/hero-480.webp",
      alt: "Happy Place Carpentry hero image",
      dimensions: "480x640",
      role: "brand-hero",
      page: "Multiple",
      section: "Brand"
    },
    portrait: {
      source: "media.v1.json brand-portrait",
      filename: "portrait.jpeg",
      path: "/images/projects/portrait/portrait-480.webp",
      alt: "Taylor & Lanie of Happy Place Carpentry",
      dimensions: "640x427",
      role: "portrait",
      page: "Home",
      section: "The Family"
    }
  },
  projects: {}
};

async function loadMedia() {
  const mediaData = await fs.readFile(path.join(CONFIG, "media.v1.json"), "utf-8");
  return JSON.parse(mediaData);
}

async function loadProjects() {
  const projectsData = await fs.readFile(path.join(CONFIG, "projects.v1.json"), "utf-8");
  return JSON.parse(projectsData);
}

async function main() {
  console.log("Creating image inventory...\n");
  
  const media = await loadMedia();
  const projects = await loadProjects();
  
  // Process all media entries
  for (const item of media.media) {
    if (item.projectId) {
      const project = projects.projects.find(p => p.id === item.projectId);
      if (project) {
        const projectKey = project.id;
        if (!inventory.projects[projectKey]) {
          inventory.projects[projectKey] = {
            title: project.title,
            service: project.service,
            location: project.location,
            media: {}
          };
        }
        
        inventory.projects[projectKey].media[item.id] = {
          filename: item.filename,
          path: item.variants.web || item.variants.original,
          alt: item.alt,
          dimensions: `${item.dimensions.width}x${item.dimensions.height}`,
          role: item.roles.join(", "),
          driveId: item.driveId || "empty",
          tags: item.tags.join(", ")
        };
      }
    }
  }
  
  // Output inventory
  console.log("=== IMAGE INVENTORY ===\n");
  
  console.log("## HOMEPAGE HERO");
  console.log(`Source: ${inventory.homepage.hero.source}`);
  console.log(`Filename: ${inventory.homepage.hero.filename}`);
  console.log(`Path: ${inventory.homepage.hero.path}`);
  console.log(`Alt: ${inventory.homepage.hero.alt}`);
  console.log(`Role: ${inventory.homepage.hero.role}`);
  console.log(`Page: ${inventory.homepage.hero.page}`);
  console.log(`Section: ${inventory.homepage.hero.section}\n`);
  
  console.log("## BRAND IMAGES");
  console.log(`### Brand Hero`);
  console.log(`Filename: ${inventory.brand.hero.filename}`);
  console.log(`Path: ${inventory.brand.hero.path}`);
  console.log(`Alt: ${inventory.brand.hero.alt}`);
  console.log(`Dimensions: ${inventory.brand.hero.dimensions}`);
  console.log(`Role: ${inventory.brand.hero.role}\n`);
  
  console.log(`### Brand Portrait`);
  console.log(`Filename: ${inventory.brand.portrait.filename}`);
  console.log(`Path: ${inventory.brand.portrait.path}`);
  console.log(`Alt: ${inventory.brand.portrait.alt}`);
  console.log(`Dimensions: ${inventory.brand.portrait.dimensions}`);
  console.log(`Role: ${inventory.brand.portrait.role}\n`);
  
  console.log("## PROJECT IMAGES");
  for (const [projectId, project] of Object.entries(inventory.projects)) {
    console.log(`### ${project.title} (${projectId})`);
    console.log(`Service: ${project.service}`);
    console.log(`Location: ${project.location.city}, ${project.location.county}`);
    console.log(`Media count: ${Object.keys(project.media).length}`);
    
    for (const [mediaId, media] of Object.entries(project.media)) {
      console.log(`  - ${mediaId}: ${media.filename} (${media.dimensions}) [${media.role}]`);
      console.log(`    Path: ${media.path}`);
      console.log(`    DriveId: ${media.driveId}`);
    }
    console.log();
  }
  
  // Write inventory to file
  const inventoryPath = path.join(ROOT, "generated", "image-inventory.json");
  await fs.mkdir(path.dirname(inventoryPath), { recursive: true });
  await fs.writeFile(inventoryPath, JSON.stringify(inventory, null, 2));
  console.log(`Inventory written to: ${inventoryPath}`);
  
  // Summary
  const totalMedia = media.media.length;
  const projectMedia = Object.values(inventory.projects).reduce((sum, p) => sum + Object.keys(p.media).length, 0);
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total media entries: ${totalMedia}`);
  console.log(`Project media: ${projectMedia}`);
  console.log(`Brand media: 2`);
  console.log(`Homepage hero: 1`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
