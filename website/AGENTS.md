<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structures may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Standing Engineering Rules (CEO Directive 032 review)

1. **Commit only on green.** End every implementation turn by attempting a commit
   to `main` ONLY after all checks pass (`npx tsc --noEmit` + Vercel build READY).
   If the build/tests fail, fix them before committing. If they cannot be fixed in
   that turn, STOP and report the blocker — never commit a broken state.
2. **Alternate feature work with UI review passes.** Every few implementation
   turns, do a dedicated UI review instead of adding components. Review at:
   1440px desktop, ~1280px laptop, tablet, mobile (390–430px). Check header
   spacing, hero composition, typography rhythm, image cropping, button alignment,
   section transitions, empty space, visual balance, and accessibility (contrast,
   focus states, tap targets ≥44px). Feature work and polish are different
   activities — intentionally alternate them.
3. **Design for the eye, not the grid.** Apply cedar *principles* (organic rhythm,
   depth over borders, floating content, offset/overlapping images, one
   unmistakable visual signature) rather than identical boxes/dividers. The brand
   signature = cedar corner accent + evergreen gradient + warm golden light on
   photos + Playfair headings + Playball signature + honey CTA.

# Brand (Happy Place Carpentry)
- Owners: Taylor (craftsmanship/build) + Lanie (communication/estimates). Contact: taylor@happyplacecarpentry.com.
- Palette tokens in `globals.css @theme`: primary=evergreen #1F3F3C, honey #d99a4e, accent=taupe #B0A092, background=linen #EDEAE0, cream #E9DBC9, surface #EDEDED, deep #162b29.
- Logo: simple tape-measure mark (`/brand/logo-*.svg`), recreated faithfully — original is login-walled.
- Secrets never in repo; Google OAuth client-only (no refresh token) → Drive not readable without owner consent.

# Standing Design Directives (CEO final polish — release gates)

**A. Introduce owners ONCE.** Single "Meet Taylor & Lanie" block on homepage + full story on /about. No repeated owner name-drops elsewhere; other sections speak as "Happy Place Carpentry." Brand feels larger than two people yet personal.

**B. Preserve original voice.** The old Google Site is source material — favorite phrases, tone, local refs, testimonials, project descriptions. Modernize *presentation*, never rewrite voice.

**C. Photography leads.** Layout order = Hero photo → Composition → Typography → Copy → CTA. Never fit photos into a pre-made grid.

**D. Every image is explicitly mapped** (`photo-intake/manifest.schema.json`): hero/cover/thumbnail/before[]/after[]/details[]/homeowner/galleryOrder. Deterministic + editable. No "first file in folder."

**E. Project-centric media.** `Project → Hero/Before/After/Details/Homeowner/Timeline/Materials`. Galleries, project pages, home features all derive from the project.

**F. Never crop craftsmanship.** Each image has a `focal:{x,y}` that survives desktop/tablet/mobile (joints, trim, railings, cabinetry).

**G. Image QA is a release gate.** Before every deploy run `npm run qa:images` — hero crops, no stretch, before/after aligned, mobile/desktop crops, retina sharp, lazy-load, alt text, blur placeholders, no broken images. Fails → block deploy.

**H. Simple V1 pipeline.** Owner drops photos in `photo-intake/<Folder>/` (flat names: `Decks`, `Fences`, `Pergolas`, `Kitchen Remodeling`, `Bathroom Remodeling`, `Built-Ins`, `Repairs`, `Outdoor Living`, `Misc`) → `npm run images` archives originals, generates AVIF/WebP/thumb/blur, writes `gallery.json`, commits. No AI/db/hidden automation.

**I. Folder = source of truth.** `photo-intake/Decks/`, `photo-intake/Kitchen Remodeling/`, etc. Folder name supplies category; `CATEGORY_MAP` in the pipeline maps it to the canonical category.

**J. Every commit refines visuals** (Directive #10): each near-end commit adds ≥1 polish (spacing/type/alignment/composition/mobile rhythm/hover/loading) — site gets visibly better each commit, not just more features.

**Priority rule:** When a feature conflicts with making the experience more trustworthy/beautiful/effortless, prioritize the experience. This is a premium marketing experience for craftsmanship, not a software project.

## Standing rule — Photography has authority over copy (Directive 033)

If a strong photo communicates what a paragraph says, shorten or remove the paragraph. Never keep explanatory text that exists only because photography was previously missing. Every commit from here should make the site feel more premium in under five seconds — larger photography, stronger hierarchy, better contrast, improved section rhythm, quieter copy — not more engineering. Owner portrait appears exactly once (homepage owner section + About, same source). Hero never uses the owner photo; hero = best transformation, else best exterior, else fence, else bathroom.
