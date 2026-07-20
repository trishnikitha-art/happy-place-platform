# Photo Intake — Happy Place Carpentry

Real project photography is the design. This folder is the deterministic,
reviewable entry point. **No computer vision, no databases, no hidden automation.**
The folder name is the source of truth.

## Drop photos (one folder per project)

```
photo-intake/
  Decks/
    hero.jpg          # wide hero / cover
    after-1.jpg       # finished detail
    before-1.jpg      # job-site start
    detail-railing.jpg # joint / trim / railing close-up (craftsmanship)
  Fences/
    hero.jpg
    before-1.jpg
    after-1.jpg
  Kitchen Remodeling/
    hero.jpg
    after-1.jpg
  Bathroom Remodeling/
    hero.jpg
  Built-Ins/
    hero.jpg
  Repairs/
    after-1.jpg
  Outdoor Living/
    hero.jpg
  Misc/
    detail-1.jpg
```

- Folder name determines **category** via `scripts/image-pipeline.mjs` (`Decks` → Decks,
  `Kitchen Remodeling` → Kitchen Remodeling, `Built-Ins` → Custom Carpentry,
  `Misc` → Uncategorized). See `CATEGORY_MAP` in that file.
- `hero.*` = hero/cover. `before-*` / `after-*` = before→after pairs (matched by numeric
  suffix). `detail-*` = craftsmanship close-ups. No location suffix needed for V1.

## Run the pipeline

```bash
npm run images        # scripts/image-pipeline.mjs
```

What it does, in order:
1. Archives every original → `photo-intake/_archive/<folder>/`
2. Generates AVIF + WebP at responsive widths (no upscaling) → `public/images/projects/<folder>/`
3. Generates a thumbnail + a base64 blur placeholder
4. Reads width/height (lightweight, no EXIF dependency)
5. Writes `src/config/gallery.json` — the single source of truth

## Site updates automatically

Components never reference image files. They call `media(key)` in `src/lib/media.ts`,
which reads `gallery.json`. The moment `gallery.json` populates:
- Homepage hero + owner photo, service cards, and the gallery grid flip to real photos.
- The before/after sliders use real `before-*` / `after-*` pairs.
- **No React component is edited.** This is the whole point of the seam.

## Release gate

```bash
npm run qa:images      # scripts/image-qa.mjs
```

Fails the deploy if any customer page still hardcodes a placeholder SVG once real
photos exist, or if any referenced image path is broken. Run it before every commit.

## Reproducible for anyone

The `H:\My Drive\...` path exists only on the owner's machine. To contribute:
copy/sync the real photos into `website/photo-intake/<Folder>/`, run `npm run images`,
review the `gallery.json` diff, then commit. Nothing about the workflow is remote-specific.

See `manifest.schema.json` only if you later add an explicit per-project manifest —
the folder convention alone is sufficient for V1.
