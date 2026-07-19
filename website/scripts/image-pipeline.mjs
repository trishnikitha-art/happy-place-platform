#!/usr/bin/env node
/**
 * Image pipeline (Directive 023) — first-class photography.
 *
 * For each source raster image in scripts/source-images/**, this:
 *   1. PRESERVES the original (copied untouched to public/images/originals/)
 *   2. Generates responsive width variants (no upscaling — skips widths larger
 *      than the source)
 *   3. Emits WebP + AVIF for each variant (plus a JPEG fallback)
 *   4. Generates a tiny base64 blur placeholder (blurDataURL) for next/image
 *   5. Writes a metadata manifest (src/config/generated/image-manifest.json)
 *
 * Usage:
 *   1. npm i -D sharp
 *   2. Drop client photos into website/scripts/source-images/<group>/<name>.jpg
 *   3. node scripts/image-pipeline.mjs
 *   4. Reference the manifest entries (with blurDataURL) from config.
 *
 * SVG placeholders are ignored — this pipeline is for real raster photography.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(__dirname, "source-images");
const OUT_DIR = path.join(ROOT, "public", "images", "processed");
const ORIG_DIR = path.join(ROOT, "public", "images", "originals");
const MANIFEST = path.join(ROOT, "src", "config", "generated", "image-manifest.json");

const WIDTHS = [400, 800, 1200, 1600, 2000];
const RASTER = /\.(jpe?g|png|webp|tiff?)$/i;

async function loadSharp() {
  try {
    return (await import("sharp")).default;
  } catch {
    console.error("\n✗ sharp is not installed. Run:  npm i -D sharp\n");
    process.exit(1);
  }
}

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (RASTER.test(e.name)) out.push(full);
  }
  return out;
}

async function main() {
  const sharp = await loadSharp();
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(ORIG_DIR, { recursive: true });
  await fs.mkdir(path.dirname(MANIFEST), { recursive: true });

  const files = await walk(SRC_DIR);
  if (!files.length) {
    console.log(`No source images found in ${SRC_DIR}. Nothing to do.`);
    console.log("Drop client photos there (e.g. source-images/gallery/deck.jpg) and re-run.");
    return;
  }

  const manifest = {};
  for (const file of files) {
    const rel = path.relative(SRC_DIR, file);
    const id = rel.replace(RASTER, "").replace(/\\/g, "/");
    const img = sharp(file);
    const meta = await img.metadata();
    const srcW = meta.width ?? 0;
    const srcH = meta.height ?? 0;

    // 1. preserve original
    const origOut = path.join(ORIG_DIR, rel);
    await fs.mkdir(path.dirname(origOut), { recursive: true });
    await fs.copyFile(file, origOut);

    // 2/3. variants (no upscaling)
    const widths = WIDTHS.filter((w) => w <= srcW);
    if (!widths.length) widths.push(srcW); // tiny source: keep native width
    const variants = [];
    for (const w of widths) {
      for (const fmt of ["avif", "webp", "jpeg"]) {
        const outName = `${id}-${w}.${fmt === "jpeg" ? "jpg" : fmt}`;
        const outPath = path.join(OUT_DIR, outName);
        await fs.mkdir(path.dirname(outPath), { recursive: true });
        let pipe = sharp(file).resize({ width: w, withoutEnlargement: true });
        if (fmt === "avif") pipe = pipe.avif({ quality: 55 });
        else if (fmt === "webp") pipe = pipe.webp({ quality: 72 });
        else pipe = pipe.jpeg({ quality: 78, mozjpeg: true });
        await pipe.toFile(outPath);
        variants.push({ width: w, format: fmt, src: `/images/processed/${outName}` });
      }
    }

    // 4. blur placeholder
    const blur = await sharp(file).resize(16).webp({ quality: 40 }).toBuffer();
    const blurDataURL = `data:image/webp;base64,${blur.toString("base64")}`;

    manifest[id] = {
      id,
      width: srcW,
      height: srcH,
      original: `/images/originals/${rel.replace(/\\/g, "/")}`,
      // largest jpg variant is a safe default `src`
      src: variants.filter((v) => v.format === "jpeg").at(-1)?.src ?? null,
      blurDataURL,
      variants,
      alt: "", // fill in descriptive alt text in config
    };
    console.log(`✓ ${id}  (${srcW}×${srcH}, ${widths.length} widths × 3 formats)`);
  }

  await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log(`\nWrote manifest: ${path.relative(ROOT, MANIFEST)} (${Object.keys(manifest).length} images)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
