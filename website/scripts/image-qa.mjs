// Image QA release gate (Standing Directive #7 + Phase 6 constitutional validation).
// Run before every deploy: `npm run qa:images`.
// Deterministic checks — no AI, no network. Exits non-zero on any failure so the
// CI/deploy can treat image quality as a release gate.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";

const root = resolve(process.cwd());
const publicDir = join(root, "public");

// gallery.json (the single source of truth produced by `npm run images`)
let G_IMAGES = [];
let hasReal = false;
try {
  const g = JSON.parse(readFileSync(join(root, "src", "config", "gallery.json"), "utf8"));
  G_IMAGES = g.images ?? [];
  hasReal = G_IMAGES.some((i) => i.src);
} catch {}

// manifest.v1.json (machine-generated identity — uuid, contentHash)
let MANIFEST_ASSETS = [];
try {
  const m = JSON.parse(readFileSync(join(root, "src", "config", "manifest.v1.json"), "utf8"));
  MANIFEST_ASSETS = m.assets ?? [];
} catch {}

// presentation.v1.json (human-curated decisions)
let PRESENTATION = null;
try {
  PRESENTATION = JSON.parse(readFileSync(join(root, "src", "config", "presentation.v1.json"), "utf8"));
} catch {}

let failures = 0;
const fail = (m) => { console.error("  ✗ " + m); failures++; };
const ok = (m) => console.log("  ✓ " + m);

console.log("IMAGE QA — release gate");

// 1) No broken public image refs in /images and /gallery
function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}
const publicImages = walk(publicDir).filter((f) => /\.(svg|png|jpe?g|webp|avif)$/i.test(f));
if (publicImages.length === 0) fail("no images found under /public");
else ok(`${publicImages.length} image files present`);

// 2) Every image path referenced from src/config must resolve to a real file.
//    This catches the "config points at a path that 404s" class of bug (release gate).
const configDir = join(root, "src", "config");
const referenced = new Set();
function scanRefs(dir) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { scanRefs(p); continue; }
    if (!/\.(ts|tsx|js|json)$/.test(e)) continue;
    const src = readFileSync(p, "utf8");
    const re = /(?:src|heroImage|image|cover|thumbnail|backgroundImage)\s*:\s*["'`](\/[^"'`]+)/g;
    let m;
    while ((m = re.exec(src))) referenced.add(m[1]);
  }
}
scanRefs(configDir);
scanRefs(join(root, "src", "components"));
let brokenRefs = 0;
for (const ref of referenced) {
  if (/\.(svg|png|jpe?g|webp|avif)$/i.test(ref) && !existsSync(join(publicDir, ref.replace(/^\//, "")))) {
    fail(`referenced image missing: ${ref}`); brokenRefs++;
  }
}
if (brokenRefs === 0) ok(`all ${referenced.size} referenced image paths resolve`);

// 3) Blur placeholders — when gallery.json has real photos, each must carry blurDataURL.
//    (The pipeline bakes blur into gallery.json; no sibling files needed.)
let blurOk = true;
if (hasReal) {
  const noBlur = G_IMAGES.filter((i) => i.src && !i.blurDataURL);
  if (noBlur.length) { fail(`${noBlur.length} gallery image(s) missing blurDataURL`); blurOk = false; }
}
if (blurOk) ok(hasReal ? "all real photos carry blur placeholders" : "blur placeholders present for rasters (or none yet)");

// Phase 6 — Constitutional validation
// 4a) uuid content-hash integrity chain: every gallery image with uuid+contentHash
//     must match the manifest.v1.json asset with the same uuid.
if (G_IMAGES.length && MANIFEST_ASSETS.length) {
  let uuidOk = 0; let uuidFail = 0;
  for (const gi of G_IMAGES) {
    if (!gi.uuid || !gi.contentHash) { uuidFail++; continue; }
    const ma = MANIFEST_ASSETS.find((a) => a.uuid === gi.uuid);
    if (!ma) { fail(`gallery image ${gi.id} has uuid ${gi.uuid} but manifest has no matching asset`); uuidFail++; continue; }
    if (ma.contentHash !== gi.contentHash) { fail(`gallery image ${gi.id} content hash mismatch: gallery=${gi.contentHash} manifest=${ma.contentHash}`); uuidFail++; continue; }
    uuidOk++;
  }
  if (uuidFail === 0) ok(`uuid/content-hash integrity verified for all ${uuidOk} gallery images`);
  else ok(`${uuidOk}/${G_IMAGES.length} gallery images passed uuid/content-hash check`);
}

// 4b) presentation.v1.json every referenced photo id resolves in gallery.json
if (PRESENTATION) {
  const galleryIds = new Set(G_IMAGES.map((i) => i.id));
  let presOk = 0; let presFail = 0;
  for (const role of (PRESENTATION.photoRoles || [])) {
    if (!galleryIds.has(role.id)) { fail(`presentation photoRoles references "${role.id}" but not in gallery.json`); presFail++; }
    else presOk++;
  }
  for (const id of (PRESENTATION.homepageCuration || [])) {
    if (!galleryIds.has(id)) { fail(`presentation homepageCuration references "${id}" but not in gallery.json`); presFail++; }
  }
  if (PRESENTATION.featuredTransformationId && !galleryIds.has(PRESENTATION.featuredTransformationId)) {
    fail(`presentation featuredTransformationId "${PRESENTATION.featuredTransformationId}" not in gallery.json`);
    presFail++;
  }
  if (presFail === 0) ok(`presentation.v1.json all ${presOk} photoRoles + homepageCuration + featuredTransformationId resolve in gallery.json`);
}

// 4c) verify gallery.json and manifest.v1.json both exist when there are real photos
if (hasReal) {
  if (!G_IMAGES.every((i) => i.uuid)) fail("gallery.json images missing uuid (run npm run images to regenerate)");
  if (!G_IMAGES.every((i) => i.contentHash)) fail("gallery.json images missing contentHash (run npm run images to regenerate)");
}
if (hasReal && !MANIFEST_ASSETS.length) fail("manifest.v1.json missing or empty despite real photos");
else if (hasReal) ok("manifest.v1.json present with assets");

// 5) photo-intake/manifest.json shape validation (if present)
const manifestPath = join(root, "photo-intake", "manifest.json");
if (existsSync(manifestPath)) {
  try {
    const m = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (!m.projects?.length) fail("manifest.json has no projects");
    else {
      let imgChecks = 0;
      for (const p of m.projects) {
        for (const role of ["hero", "cover", "thumbnail"]) {
          const im = p.images?.[role];
          if (!im) { fail(`${p.slug}: missing ${role}`); continue; }
          if (!im.alt) fail(`${p.slug}.${role}: missing alt text`);
          if (!existsSync(join(publicDir, im.src.replace(/^\//, "")))) fail(`${p.slug}.${role}: missing file ${im.src}`);
          imgChecks++;
        }
        const b = p.images.before?.length ?? 0, a = p.images.after?.length ?? 0;
        if (b !== a) fail(`${p.slug}: before(${b})/after(${a}) counts differ`);
      }
      ok(`manifest validated (${imgChecks} role mappings checked)`);
    }
  } catch (e) { fail("manifest.json invalid JSON: " + e.message); }
} else {
  ok("manifest.json not yet present (placeholder mode) — skipping manifest checks");
}

// 6) SVG placeholders must not be used as if final (warn, don't fail in V1)
const svgCount = publicImages.filter((f) => /\.svg$/i.test(f)).length;
if (svgCount > 0) console.log(`  ⚠ ${svgCount} SVG placeholder(s) still in use — replace with real photography before launch`);

// 7) Release gate (Directive 031): once gallery.json has real photos, customer
//    pages must not hardcode /images/*.svg. Scan component/src for raw svg srcs.
if (hasReal) {
  const appDir = join(root, "src", "app");
  const compDir = join(root, "src", "components");
  let hardSvg = 0;
  for (const dir of [appDir, compDir]) {
    if (!existsSync(dir)) continue;
    for (const e of walk(dir)) {
      if (!/\.(ts|tsx)$/.test(e)) continue;
      const s = readFileSync(e, "utf8");
      if (/src=["'`]\/images\/[^"'`]+\.svg["'`]/.test(s)) { fail(`hardcoded placeholder SVG in ${relative(root, e)}`); hardSvg++; }
    }
  }
  if (hardSvg === 0) ok("real photos active — no hardcoded placeholder SVGs on customer pages");
} else {
  ok("no real photos yet — placeholder SVGs permitted until gallery.json populates");
}

console.log(failures === 0 ? "\nIMAGE QA PASSED" : `\nIMAGE QA FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
