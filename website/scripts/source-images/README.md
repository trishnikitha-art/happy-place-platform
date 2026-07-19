# Source images (client-owned originals)

Drop the real Happy Place Carpentry photos here, organized by group:

```
scripts/source-images/
  gallery/
    deck-corvallis.jpg
    fence-philomath.jpg
  projects/
    corvallis-entertainer-deck-1.jpg
  services/
    decks.jpg
```

Then run:

```bash
cd website
npm i -D sharp        # one time
npm run images        # processes everything here
```

The pipeline (`scripts/image-pipeline.mjs`):

- **Preserves** each original untouched in `public/images/originals/`
- Generates **responsive width variants** (400/800/1200/1600/2000) — **never upscales**
- Emits **AVIF + WebP + JPEG** for every variant
- Generates a **blur placeholder** (`blurDataURL`) for `next/image placeholder="blur"`
- Writes `src/config/generated/image-manifest.json` with all metadata

After running, wire manifest entries into `src/config/gallery.ts` /
`projects.ts` (set `src`, `width`, `height`, `blurDataURL`) and add descriptive
`alt` text. Once real rasters are in use, remove `dangerouslyAllowSVG` from
`next.config.ts`.

> This folder is git-ignored except for this README — originals live in the repo
> only after processing (in `public/images/originals/`), or wherever you choose
> to store client assets.
