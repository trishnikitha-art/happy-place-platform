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
