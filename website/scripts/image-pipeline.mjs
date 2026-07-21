#!/usr/bin/env node
/**
 * V1 Image Pipeline (Directive 031/033) — deterministic, no AI, no cloud.
 *
 * SOURCE OF TRUTH = the folder name.
 *   photo-intake/<Category> - <Location>/
 *     hero.*  cover.*  thumbnail.*  before-1.*  after-1.*  detail-*.*  homeowner.*
 *
 * RUN:  drop photos → `npm run images` →
 *   1. archive originals → photo-intake/_archive/<project>/<file>
 *   2. generate WebP + AVIF (responsive widths) + thumbnail + blur placeholder
 *   3. read dimensions (EXIF-light; we only need W/H)
 *   4. emit src/config/gallery.json  (single source of truth the UI renders)
 *
 * The React layer NEVER references image files directly — it imports
 * gallery.json (via lib/media.ts). Swapping local files for Google Drive
 * later touches ONLY the ImageSource adapter, not the pipeline logic.
 *
 * Categories are derived from the folder (or an explicit manifest.json if the
 * owner supplies one). No computer vision. Unknown → "Uncategorized".
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { FilesystemImageSource } from "./image-source/filesystem-image-source.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const INTAKE = path.join(ROOT, "photo-intake");
const ARCHIVE = path.join(INTAKE, "_archive");
const OUT = path.join(ROOT, "public", "images", "projects");
const GALLERY = path.join(ROOT, "src", "config", "gallery.json");
const MANIFEST = path.join(ROOT, "src", "config", "manifest.v1.json");
const PRESENTATION = path.join(ROOT, "src", "config", "presentation.v1.json");
const GOLDEN = path.join(ROOT, "generated", "golden-manifest.json");
const PIPELINE_MANIFEST = path.join(ROOT, "generated", "gallery.manifest.json");
const CACHE = path.join(ROOT, "generated", "rebuild-cache.json");

const WIDTHS = [480, 768, 1080, 1600, 2000];

const KNOWN = [
  "Decks", "Pergolas", "Fencing", "Kitchen Remodel", "Bathroom Remodel", "Trim",
  "Finish Carpentry", "Custom Cabinetry", "Doors", "Windows", "Repairs",
  "Outdoor Living", "Accessibility", "General Carpentry",
];

async function loadSharp() {
  try { return (await import("sharp")).default; }
  catch { console.error("\n✗ sharp missing. Run: npm i -D sharp\n"); process.exit(1); }
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function deterministicUUID(namespace, name) {
  const hash = crypto.createHash("sha256").update(`${namespace}:${name}`).digest();
  return [
    hash.subarray(0, 4).toString("hex"),
    hash.subarray(4, 6).toString("hex"),
    `5${hash.subarray(6, 8).toString("hex").slice(1)}`,
    `${((hash[8] & 0x3f) | 0x80).toString(16)}${hash.subarray(9, 10).toString("hex")}`,
    hash.subarray(10, 16).toString("hex"),
  ].join("-");
}

// Deterministic folder → category/location (Directive 031). No AI.
const CATEGORY_MAP = {
  "deck build": "Decks",
  "decks": "Decks",
  "fence": "Fencing",
  "fences": "Fencing",
  "pergola": "Pergolas",
  "pergolas": "Pergolas",
  "kitchen remodeling": "Kitchen Remodeling",
  "kitchen remodel": "Kitchen Remodeling",
  "kitchen": "Kitchen Remodeling",
  "bathroom remodeling": "Bathroom Remodeling",
  "bathroom remodel": "Bathroom Remodeling",
  "bathroom": "Bathroom Remodeling",
  "trim": "Trim",
  "finish carpentry": "Finish Carpentry",
  "built-ins": "Custom Carpentry",
  "built ins": "Custom Carpentry",
  "built-in": "Custom Carpentry",
  "cabinetry": "Custom Carpentry",
  "custom cabinetry": "Custom Carpentry",
  "doors": "Doors",
  "windows": "Windows",
  "repairs": "Repairs",
  "outdoor living": "Outdoor Living",
  "accessibility": "Accessibility",
  "general carpentry": "General Carpentry",
  "misc": "Uncategorized",
};

function parseFolder(name) {
  const [rawCat, loc] = name.split(" - ").map((s) => s.trim());
  const key = (rawCat || "").toLowerCase();
  const category = CATEGORY_MAP[key] ?? "Uncategorized";
  const slug = slugify(name);
  return { category, location: loc || "", slug };
}
// Role-by-filename mapping — the actual intake files don't follow a prefix
// convention. This map assigns each known file its pipeline role. Matching is
// case-insensitive against the stem (filename without extension).
const KNOWN_ROLES = {
  bathroomwall: "hero",
  "fence build": "hero",
  "fencerebuildmatchingstain": "detail",
  "finishedcarpentry": "hero",
  "finishedcarpentry0": "detail",
  trimrepair: "hero",
  floor0: "detail",
  floor: "detail",
  guttercleaning: "detail",
  drywall: "detail",
};
function roleOf(filename) {
  const stem = path.basename(filename, path.extname(filename)).toLowerCase().replace(/[^a-z0-9]/g, "");
  return KNOWN_ROLES[stem] ?? "detail";
}
function orderKey(filename) {
  const m = filename.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 999;
}

// ── DAG stage: discover projects from source ────────────────────────────────
async function stageDiscover(source) {
  const projectList = await source.listProjects();
  if (!projectList.length) {
    console.log(`\nNo project folders in ${path.relative(ROOT, INTAKE)}/.`);
    console.log("Expected:  photo-intake/<Category> - <Location>/  (e.g. 'Deck - Corvallis/')");
    console.log("Drop photos and re-run `npm run images`.\n");
    await fs.mkdir(path.dirname(GALLERY), { recursive: true });
    await fs.writeFile(GALLERY, JSON.stringify({ projects: [], images: [] }, null, 2));
    return null;
  }
  return projectList;
}

// ── Hash file for golden regression test ──────────────────────────────────────
async function hashFile(filePath) {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// ── Load rebuild cache for incremental builds ───────────────────────────────────
async function loadCache() {
  try {
    const cacheData = await fs.readFile(CACHE, "utf-8");
    return JSON.parse(cacheData);
  } catch {
    return {};
  }
}

// ── Save rebuild cache ─────────────────────────────────────────────────────────
async function saveCache(cache) {
  await fs.mkdir(path.dirname(CACHE), { recursive: true });
  await fs.writeFile(CACHE, JSON.stringify(cache, null, 2));
}

// ── Detect duplicate hashes ───────────────────────────────────────────────────
function detectDuplicates(images) {
  const hashMap = new Map();
  const duplicates = [];
  
  for (const img of images) {
    const existing = hashMap.get(img.contentHash);
    if (existing) {
      if (existing.id !== img.id) {
        duplicates.push({
          hash: img.contentHash,
          files: [existing.id, img.id],
          projects: [existing.project, img.project],
        });
      }
    } else {
      hashMap.set(img.contentHash, img);
    }
  }
  
  return duplicates;
}

// ── Detect unused presentation entries (P1) ──────────────────────────────────
async function detectUnusedPresentation(presentation, images) {
  const galleryIds = new Set(images.map((img) => img.id));
  const presentationIds = new Set(presentation.photoRoles.map((role) => role.id));
  
  const missingFromGallery = [];
  const missingFromPresentation = [];
  
  for (const id of presentationIds) {
    if (!galleryIds.has(id)) {
      missingFromGallery.push(id);
    }
  }
  
  for (const id of galleryIds) {
    if (!presentationIds.has(id)) {
      missingFromPresentation.push(id);
    }
  }
  
  return { missingFromGallery, missingFromPresentation };
}

// ── Generate pipeline manifest ───────────────────────────────────────────────
async function generatePipelineManifest(projects, images, stats) {
  const galleryHash = await hashFile(GALLERY);
  let presentationHash = null;
  
  try {
    presentationHash = await hashFile(MANIFEST);
  } catch {
    // Presentation may not exist yet
  }
  
  const gitCommit = await getGitCommit();
  
  return {
    pipelineVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    imageCount: images.length,
    projectCount: projects.length,
    galleryHash,
    presentationHash,
    pipelineCommit: gitCommit,
    stats,
  };
}

// ── Get current git commit ────────────────────────────────────────────────────
async function getGitCommit() {
  try {
    const { execSync } = await import("child_process");
    return execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

// ── Generate golden manifest for regression test ─────────────────────────────
async function generateGoldenManifest(projects, images) {
  const galleryHash = await hashFile(GALLERY);
  const imageHashes = {};
  
  for (const img of images) {
    if (img.src) {
      const imagePath = path.join(ROOT, "public", img.src);
      try {
        imageHashes[img.id] = await hashFile(imagePath);
      } catch {
        imageHashes[img.id] = "missing";
      }
    }
  }
  
  return {
    galleryHash,
    imageHashes,
    imageCount: images.length,
    projectCount: projects.length,
  };
}

// ── DAG stage: emit outputs ─────────────────────────────────────────────────
async function stageEmit(projects, images, manifestAssets, stats) {
  await fs.mkdir(path.dirname(GALLERY), { recursive: true });
  await fs.writeFile(GALLERY, JSON.stringify({ projects, images }, null, 2));
  console.log(`\nWrote ${path.relative(ROOT, GALLERY)} — ${projects.length} projects, ${images.length} images.`);
  console.log("UI renders from this file. No component references raw image paths.");

  await fs.mkdir(path.dirname(MANIFEST), { recursive: true });
  await fs.writeFile(MANIFEST, JSON.stringify({
    schemaVersion: "1.0.0",
    description: "Machine-generated image manifest. Human curation lives in presentation.v1.json.",
    generatedAt: new Date().toISOString(),
    projects: projects.map((p) => ({ slug: p.slug, title: p.title, category: p.category, county: p.county })),
    assets: manifestAssets,
  }, null, 2));
  console.log(`Wrote ${path.relative(ROOT, MANIFEST)} — ${manifestAssets.length} assets with SHA-256 content hashes.`);

  // Generate pipeline manifest
  const pipelineManifest = await generatePipelineManifest(projects, images, stats);
  await fs.mkdir(path.dirname(PIPELINE_MANIFEST), { recursive: true });
  await fs.writeFile(PIPELINE_MANIFEST, JSON.stringify(pipelineManifest, null, 2));
  console.log(`Wrote ${path.relative(ROOT, PIPELINE_MANIFEST)} — pipeline metadata.`);

  // Generate golden manifest for regression test
  const goldenManifest = await generateGoldenManifest(projects, images);
  await fs.mkdir(path.dirname(GOLDEN), { recursive: true });
  await fs.writeFile(GOLDEN, JSON.stringify(goldenManifest, null, 2));
  console.log(`Wrote ${path.relative(ROOT, GOLDEN)} — golden regression manifest.`);
}

async function main() {
  const startTime = Date.now();
  const sharp = await loadSharp();
  const projects = [];
  const images = [];
  const manifestAssets = [];

  // Statistics tracking
  const stats = {
    heroGenerated: 0,
    thumbnailGenerated: 0,
    galleryGenerated: 0,
    skipped: 0,
    rebuilt: 0,
  };

  // Load rebuild cache for incremental builds
  const cache = await loadCache();

  // ImageSource: the only coupling point to storage
  const source = new FilesystemImageSource(INTAKE);

  // ── DAG: Discovery ──────────────────────────────────────────────────────────
  const projectList = await stageDiscover(source);
  if (!projectList) return;

  // ── DAG: Classification + Transformation + Manifest (per project) ───────────
  for (const project of projectList) {
    const folder = project.name;
    const { category, location, slug } = parseFolder(folder);
    const title = `${category} — ${location || "Willamette Valley"}`;
    const files = (await source.listFiles(folder))
      .sort((a, b) => orderKey(a.name) - orderKey(b.name));
    const img = { hero: null, cover: null, thumbnail: null, homeowner: null, before: [], after: [], details: [] };
    const galleryOrder = [];

    // Stable project UUID
    const projectUuid = deterministicUUID("project", slug);

    for (const file of files) {
      const role = roleOf(file.name);
      const buffer = await source.open(folder, file.path);
      const meta = await sharp(buffer).metadata();
      const w = meta.width ?? 0, h = meta.height ?? 0;
      const origName = file.name;
      const ext = path.extname(origName);
      const baseName = path.basename(origName, ext);
      const id = `${slug}/${slugify(baseName)}`;
      const destDir = path.join(OUT, slug);
      await fs.mkdir(destDir, { recursive: true });
      await fs.mkdir(path.join(ARCHIVE, slug), { recursive: true });
      await fs.writeFile(path.join(ARCHIVE, slug, origName), buffer);

      const contentHash = crypto.createHash("sha256").update(buffer).digest("hex");
      const uuid = deterministicUUID(slug, origName);
      
      // Incremental rebuild: skip if contentHash unchanged
      const cacheKey = `${id}:${contentHash}`;
      const cached = cache[cacheKey];
      
      if (cached && cached.contentHash === contentHash) {
        stats.skipped++;
        console.log(`  ⊘ ${folder}/${origName}  (skipped, content unchanged)`);
        
        // Use cached data
        images.push(cached.rec);
        galleryOrder.push(id);
        manifestAssets.push(cached.manifestAsset);
        
        if (role === "hero") img.hero = cached.rec;
        else if (role === "cover") img.cover = cached.rec;
        else if (role === "thumbnail") img.thumbnail = cached.rec;
        else if (role === "homeowner") img.homeowner = cached.rec;
        else if (role === "before") img.before.push(cached.rec);
        else if (role === "after") img.after.push(cached.rec);
        else img.details.push(cached.rec);
        
        continue;
      }

      stats.rebuilt++;
      
      const widths = WIDTHS.filter((x) => x <= w); if (!widths.length) widths.push(w);
      const variants = [];
      for (const vw of widths) {
        for (const fmt of ["avif", "webp"]) {
          const outName = `${baseName}-${vw}.${fmt}`;
          await sharp(buffer).resize({ width: vw, withoutEnlargement: true })
            [fmt === "avif" ? "avif" : "webp"]({ quality: fmt === "avif" ? 55 : 72 })
            .toFile(path.join(destDir, outName));
          variants.push({ width: vw, format: fmt, src: `/images/projects/${slug}/${outName}` });
        }
      }
      // thumbnail + blur
      const thumbName = `${baseName}-thumb.webp`;
      await sharp(buffer).resize(480).webp({ quality: 70 }).toFile(path.join(destDir, thumbName));
      const blurBuf = await sharp(buffer).resize(16).webp({ quality: 40 }).toBuffer();
      const blurDataURL = `data:image/webp;base64,${blurBuf.toString("base64")}`;
      const src = variants.find((v) => v.format === "webp")?.src ?? null;

      // Track statistics
      if (role === "hero") stats.heroGenerated++;
      stats.thumbnailGenerated++;
      stats.galleryGenerated++;

      const rec = {
        uuid, contentHash,
        id, title, project: slug, category, county: location,
        featured: false, before: role === "before", after: role === "after", hero: role === "hero",
        alt: `${title} — ${role} photo by Happy Place Carpentry`,
        width: w, height: h, focal: { x: 0.5, y: 0.5 },
        original: origName, src, thumbnail: `/images/projects/${slug}/${thumbName}`, blurDataURL, variants,
        // Image provenance (P2)
        provenance: {
          sourceFile: `${folder}/${origName}`,
          importedAt: new Date().toISOString(),
          pipelineVersion: "1.0.0",
        },
      };
      images.push(rec);
      galleryOrder.push(id);
      
      const manifestAsset = {
        uuid, contentHash,
        id, project: slug, category, county: location,
        originalFilename: origName,
        sourcePath: `${folder}/${origName}`,
        width: w, height: h,
        role, priority: null,
        variants: variants.map((v) => ({ width: v.width, format: v.format, path: v.src })),
        thumbnailPath: `/images/projects/${slug}/${thumbName}`,
        blurDataURL,
        createdAt: new Date().toISOString(),
      };
      manifestAssets.push(manifestAsset);
      
      // Update cache
      cache[cacheKey] = { contentHash, rec, manifestAsset };
      
      if (role === "hero") img.hero = rec;
      else if (role === "cover") img.cover = rec;
      else if (role === "thumbnail") img.thumbnail = rec;
      else if (role === "homeowner") img.homeowner = rec;
      else if (role === "before") img.before.push(rec);
      else if (role === "after") img.after.push(rec);
      else img.details.push(rec);
      console.log(`  ✓ ${folder}/${origName}  (${w}×${h}, ${role})`);
    }
    if (!img.hero && img.details[0]) img.hero = img.details[0];
    if (!img.cover && img.hero) img.cover = img.hero;
    if (!img.thumbnail && img.cover) img.thumbnail = img.cover;
    projects.push({ 
      slug, 
      uuid: projectUuid, // Stable project UUID (P1)
      title, 
      category, 
      county: location, 
      images: img, 
      galleryOrder 
    });
    console.log(`→ project: ${title}  (${images.length} images so far)`);
  }

  // Save rebuild cache
  await saveCache(cache);

  // Detect duplicates (P1)
  const duplicates = detectDuplicates(images);
  if (duplicates.length > 0) {
    console.warn("\n⚠ Duplicate hashes detected:");
    for (const dup of duplicates) {
      console.warn(`  Hash: ${dup.hash}`);
      console.warn(`  Files: ${dup.files.join(", ")}`);
      console.warn(`  Projects: ${dup.projects.join(", ")}`);
    }
  }

  // Detect unused presentation entries (P1)
  let presentation = null;
  try {
    const presentationData = await fs.readFile(PRESENTATION, "utf-8");
    presentation = JSON.parse(presentationData);
  } catch {
    // Presentation may not exist yet
  }
  
  if (presentation) {
    const unused = await detectUnusedPresentation(presentation, images);
    if (unused.missingFromGallery.length > 0) {
      console.warn("\n⚠ Presentation entries missing from gallery:");
      for (const id of unused.missingFromGallery) {
        console.warn(`  ${id}`);
      }
    }
    if (unused.missingFromPresentation.length > 0) {
      console.warn("\n⚠ Gallery images not referenced in presentation:");
      for (const id of unused.missingFromPresentation) {
        console.warn(`  ${id}`);
      }
    }
  }

  // Calculate elapsed time
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  stats.time = elapsed;

  // Print pipeline statistics (P2)
  console.log("\nPipeline Statistics:");
  console.log(`  Projects: ${projects.length}`);
  console.log(`  Images: ${images.length}`);
  console.log(`  Generated: Hero: ${stats.heroGenerated}, Thumbnail: ${stats.thumbnailGenerated}, Gallery: ${stats.galleryGenerated}`);
  console.log(`  Skipped: ${stats.skipped}`);
  console.log(`  Rebuilt: ${stats.rebuilt}`);
  console.log(`  Time: ${stats.time}s`);

  // ── DAG: Emit ───────────────────────────────────────────────────────────────
  await stageEmit(projects, images, manifestAssets, stats);
}

main().catch((e) => { console.error(e); process.exit(1); });
