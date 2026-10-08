# Gallery batch, consumer navigation, and scrolling verification

Baseline: `f23e2a3eed45f836064c9fc13eab0625c8994797`. The persisted courtyard gallery and existing authenticated persistence path remain intact.

## Behavior

- Gallery sorting uses Pointer Events with a six-pixel threshold, pointer capture, cached card geometry, animation frames, a lifted photo, and a moving placeholder. One completed gesture sends one `SLOT_REORDER`; cancellation restores the accepted order. Library/Drive asset drops retain the existing HTML5 iframe bridge.
- Workbench holds separate project drafts. Multiple moves across projects remain local until **Save all gallery changes**. Existing gallery PUTs stage each project with its expected revision; one deploy request contains all verified transaction receipts. Partial failures retain failed drafts and successful receipts. An unconfirmed deployment cannot silently be requested twice.
- Complete-order messages retain hidden and unresolved media IDs and validate their starting order against the parent draft. Native photo clicks open the existing viewer; earlier/later controls remain available.
- Consumer navigation uses top links at 768px and wider, and a modal side panel below that width. Workbench navigation is separate.
- Our Work and Workbench previews scroll natively. Other consumer pages retain Lenis, with live reduced-motion handling and cleanup. Next owns route scroll/restoration. Nested dialogs prevent Lenis from intercepting their scroll.
- Project image placeholders request blur only when blur data exists, preventing a reproduced project-page crash.
- High-frequency VisualSlot/drag-bridge diagnostics require `NEXT_PUBLIC_WORKBENCH_DEBUG=true`.

## Verification

| Check | Result |
| --- | --- |
| Jest | 37 suites / 434 tests passed; 2 suites / 8 tests skipped by existing configuration |
| TypeScript | Passed |
| Production build | Passed in an isolated snapshot of the exact changed source |
| Image QA | Passed; existing stale-manifest and SVG-placeholder warnings remain |
| Pointer browser checks | Fast/slow, first/last/middle, touch, click, subthreshold movement, rejection, Escape, pointercancel, lost capture passed |
| Real Workbench parent + pointer | Exact complete/base order accepted; no writes during movement; one handoff on pointerup |
| Batch browser workflow | Multi-project drafts, preview reload, Cancel, partial failure/retry, original receipts, one deployment, exact saved order, subsequent saved revision passed |
| Consumer navigation | 320, 390, 768, 1024, 1280, 1440px; focus, Escape, backdrop, resize, scroll lock, theme, single-click navigation passed |
| Scrolling | Wheel reversal, mobile touch, history restoration, three live motion-preference cycles, modal panning and native preview passed |
| Public routes | Contact, Our Work, home, services, FAQ and fence detail passed; no consumer estimate links; anonymous estimate redirect/API gate preserved |

Browser checks use background Chromium. The Workbench persistence/deployment workflow uses explicitly isolated API fixtures; it does not establish live Redis, authenticated production saves, or a real gallery deployment. Actual hardware touchpad testing remains unverified. Production public checks and release status are recorded separately after pushing.

Existing generated graph/projection edits were excluded from the snapshot and commit and preserved byte-for-byte. Runtime authority, authorization, materialization, deployment routes and CAS implementation were not edited. Visibility-only saves use the existing runtime PATCH and require no Git deployment; order batches publish once.
