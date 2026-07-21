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
function roleOf(filename) {
  const base = filename.toLowerCase();
  if (/^hero/.test(base)) return "hero";
  if (/^cover/.test(base)) return "cover";
  if (/^thumb/.test(base)) return "thumbnail";
  if (/^homeowner/.test(base)) return "homeowner";
  if (/^before/.test(base)) return "before";
  if (/^after/.test(base)) return "after";
  return "detail";
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

// ── DAG stage: emit outputs ─────────────────────────────────────────────────
async function stageEmit(projects, images, manifestAssets) {
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
}

async function main() {
  const sharp = await loadSharp();
  const projects = [];
  const images = [];
  const manifestAssets = [];

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

      const contentHash = crypto.createHash("sha256").update(buffer).digest("hex");
      const uuid = deterministicUUID(slug, origName);
      const rec = {
        uuid, contentHash,
        id, title, project: slug, category, county: location,
        featured: false, before: role === "before", after: role === "after", hero: role === "hero",
        alt: `${title} — ${role} photo by Happy Place Carpentry`,
        width: w, height: h, focal: { x: 0.5, y: 0.5 },
        original: origName, src, thumbnail: `/images/projects/${slug}/${thumbName}`, blurDataURL, variants,
      };
      images.push(rec);
      galleryOrder.push(id);
      manifestAssets.push({
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
      });
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
    projects.push({ slug, title, category, county: location, images: img, galleryOrder });
    console.log(`→ project: ${title}  (${images.length} images so far)`);
  }

  // ── DAG: Emit ───────────────────────────────────────────────────────────────
  await stageEmit(projects, images, manifestAssets);
}

main().catch((e) => { console.error(e); process.exit(1); });
