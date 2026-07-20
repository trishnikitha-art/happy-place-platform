# Photo Intake — Happy Place Carpentry

Real project photography is the design. This folder is the deterministic
pipeline entry point (Standing Directives #4, #5, #8, #9). No computer vision,
no databases, no hidden automation — the **folder name is the source of truth**.

## How the owner drops photos

```
photo-intake/
  Deck Build - Corvallis/
    hero.jpg            # wide hero / cover
    after-1.jpg         # finished detail
    after-2.jpg         # finished detail
    before-1.jpg        # job-site start
    detail-railing.jpg  # joint / trim / railing close-up (craftsmanship)
    detail-cap.jpg
    homeowner.jpg       # happy homeowner (optional)
  Pergola - Salem/
    ...
  Fence - Albany/
    ...
  Kitchen Remodel - Lebanon/
    ...
```

- Folder name pattern: `<Category> - <Location>` → supplies `category` + `location`.
- `hero.*` = hero/cover. `before-*` / `after-*` = before-after pairs (matched by
  numeric suffix). `detail-*` = craftsmanship close-ups (focal: joint/trim/railing).
- `homeowner.*` = the "happy homeowner" story image.

## Deterministic mapping (Directive #4) — never "first file in folder"

Each project resolves to a fixed set:
`hero · cover · thumbnail · before[] · after[] · details[] · homeowner · galleryOrder`

Defined in `src/config/projects.ts` (and `gallery.json` once generated). Editable,
not guessed.

## Pipeline (Directive #8 — simple, reviewable)

1. Owner drops photos into `photo-intake/<Project>/`
2. `npm run photos:process` (scripts/photo-pipeline.mjs)
   - archive originals → `photo-intake/_archive/`
   - generate WebP + AVIF + thumbnail + blur placeholder
   - read EXIF for date/location hints
   - write `public/gallery/<project>/...` + `src/config/gallery.generated.ts`
3. Human reviews the manifest diff
4. Commit → Deploy

## Focal points (Directive #6 — never crop away craftsmanship)

Each image may declare `focal: { x: 0.5, y: 0.4 }` (0–1) so desktop/tablet/mobile
all preserve joints, trim, railings, cabinetry. Default center if omitted.

See `manifest.schema.json` for the exact shape.
