// Image QA release gate (Standing Directive #7).
// Run before every deploy: `npm run qa:images`.
// Deterministic checks — no AI, no network. Exits non-zero on any failure so the
// CI/deploy can treat image quality as a release gate.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";

const root = resolve(process.cwd());
const publicDir = join(root, "public");
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

// 3) Every raster (non-svg) must have a sibling blur placeholder OR be svg
const missingBlur = publicImages.filter(
  (f) => !/\.svg$/i.test(f) && !existsSync(f.replace(/\.(jpe?g|png|webp|avif)$/i, ".blur.json"))
);
if (missingBlur.length && publicImages.some((f) => !/\.svg$/i.test(f)))
  fail(`${missingBlur.length} raster image(s) missing blur placeholder`);
else ok("blur placeholders present for rasters (or none yet)");

// 4) Manifest present + valid shape (if real photos ingested)
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

// 5) SVG placeholders must not be used as if final (warn, don't fail in V1)
const svgCount = publicImages.filter((f) => /\.svg$/i.test(f)).length;
if (svgCount > 0) console.log(`  ⚠ ${svgCount} SVG placeholder(s) still in use — replace with real photography before launch`);

console.log(failures === 0 ? "\nIMAGE QA PASSED" : `\nIMAGE QA FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
