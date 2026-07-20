#!/usr/bin/env node
/**
 * V1 Image Pipeline (Directive 031) — deterministic, no AI, no cloud.
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
 * gallery.json (via lib/gallery.ts). Swapping local files for Google Drive
 * later touches ONLY this pipeline + the loader, not the components.
 *
 * Categories are derived from the folder (or an explicit manifest.json if the
 * owner supplies one). No computer vision. Unknown → "Uncategorized".
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const INTAKE = path.join(ROOT, "photo-intake");
const ARCHIVE = path.join(INTAKE, "_archive");
const OUT = path.join(ROOT, "public", "images", "projects");
const GALLERY = path.join(ROOT, "src", "config", "gallery.json");

const WIDTHS = [480, 768, 1080, 1600, 2000];
const RASTER = /\.(jpe?g|png|webp|tiff?|heic?)$/i;

const KNOWN = [
  "Decks", "Pergolas", "Fencing", "Kitchen Remodel", "Bathroom Remodel", "Trim",
  "Finish Carpentry", "Custom Cabinetry", "Doors", "Windows", "Repairs",
  "Outdoor Living", "Accessibility", "General Carpentry",
];

async function loadSharp() {
  try { return (await import("sharp")).default; }
  catch { console.error("\n✗ sharp missing. Run: npm i -D sharp\n"); process.exit(1); }
}
async function walk(dir) {
  const out = []; let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); }
  catch { return out; }
  for (const e of entries) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(f)));
    else if (RASTER.test(e.name)) out.push(f);
  }
  return out;
}
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Deterministic folder → category/location (Directive 031). No AI.
// Folder "Deck Build - Corvallis" → { category: "Decks", location: "Corvallis" }
// Folder "Kitchen Remodel - Salem" → { category: "Kitchen Remodel", location: "Salem" }
// Folder "Built Ins" (no location) → { category: "Custom Cabinetry", location: "" }
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
  const slug = slugify(name); // e.g. "deck-build-corvallis", "built-ins"
  return { category, location: loc || "", slug };
}
function roleOf(file) {
  const base = path.basename(file).toLowerCase();
  if (/^hero/.test(base)) return "hero";
  if (/^cover/.test(base)) return "cover";
  if (/^thumb/.test(base)) return "thumbnail";
  if (/^homeowner/.test(base)) return "homeowner";
  if (/^before/.test(base)) return "before";
  if (/^after/.test(base)) return "after";
  return "detail";
}
function orderKey(file) {
  const m = path.basename(file).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 999;
}

async function main() {
  const sharp = await loadSharp();
  const projects = [];
  const images = [];

  const folders = (await fs.readdir(INTAKE, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && e.name !== "_archive")
    .map((e) => e.name);

  if (!folders.length) {
    console.log(`\nNo project folders in ${path.relative(ROOT, INTAKE)}/.`);
    console.log("Expected:  photo-intake/<Category> - <Location>/  (e.g. 'Deck - Corvallis/')");
    console.log("Drop photos and re-run `npm run images`.\n");
    // still (re)write an empty gallery so the build has a valid shape
    await fs.mkdir(path.dirname(GALLERY), { recursive: true });
    await fs.writeFile(GALLERY, JSON.stringify({ projects: [], images: [] }, null, 2));
    return;
  }

  for (const folder of folders) {
    const { category, location, slug } = parseFolder(folder);
    const title = `${category} — ${location || "Willamette Valley"}`;
    const projDir = path.join(INTAKE, folder);
    const files = (await walk(projDir)).sort((a, b) => orderKey(a) - orderKey(b));
    const img = { hero: null, cover: null, thumbnail: null, homeowner: null, before: [], after: [], details: [] };
    const galleryOrder = [];

    for (const file of files) {
      const role = roleOf(file);
      const meta = await sharp(file).metadata();
      const w = meta.width ?? 0, h = meta.height ?? 0;
      const origName = path.basename(file);
      const id = `${slug}/${slugify(path.basename(file, path.extname(file)))}`;
      const destDir = path.join(OUT, slug);
      await fs.mkdir(destDir, { recursive: true });
      await fs.mkdir(path.join(ARCHIVE, slug), { recursive: true });
      await fs.copyFile(file, path.join(ARCHIVE, slug, origName)); // 1. archive

      const widths = WIDTHS.filter((x) => x <= w); if (!widths.length) widths.push(w);
      const variants = [];
      for (const vw of widths) {
        for (const fmt of ["avif", "webp"]) {
          const outName = `${path.basename(file, path.extname(file))}-${vw}.${fmt}`;
          await sharp(file).resize({ width: vw, withoutEnlargement: true })
            [fmt === "avif" ? "avif" : "webp"]({ quality: fmt === "avif" ? 55 : 72 })
            .toFile(path.join(destDir, outName));
          variants.push({ width: vw, format: fmt, src: `/images/projects/${slug}/${outName}` });
        }
      }
      // thumbnail + blur
      const thumbName = `${path.basename(file, path.extname(file))}-thumb.webp`;
      await sharp(file).resize(480).webp({ quality: 70 }).toFile(path.join(destDir, thumbName));
      const blurBuf = await sharp(file).resize(16).webp({ quality: 40 }).toBuffer();
      const blurDataURL = `data:image/webp;base64,${blurBuf.toString("base64")}`;
      const src = variants.find((v) => v.format === "webp")?.src ?? null;

      const rec = {
        id, title, project: slug, category, county: location,
        featured: false, before: role === "before", after: role === "after", hero: role === "hero",
        alt: `${title} — ${role} photo by Happy Place Carpentry`,
        width: w, height: h, focal: { x: 0.5, y: 0.5 },
        original: origName, src, thumbnail: `/images/projects/${slug}/${thumbName}`, blurDataURL, variants,
      };
      images.push(rec);
      galleryOrder.push(id);
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

  await fs.mkdir(path.dirname(GALLERY), { recursive: true });
  await fs.writeFile(GALLERY, JSON.stringify({ projects, images }, null, 2));
  console.log(`\nWrote ${path.relative(ROOT, GALLERY)} — ${projects.length} projects, ${images.length} images.`);
  console.log("UI renders from this file. No component references raw image paths.");
}

main().catch((e) => { console.error(e); process.exit(1); });
