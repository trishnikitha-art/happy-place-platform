# Gallery handoff verification — 2026-10-08

The Workbench preview now uses React for both image and project drop boundaries. Native ancestor listeners previously stopped the event before the image's delegated React handler could run. Gallery photographs also have explicit geometry, so the draggable surface matches the visible photograph.

Accepted reorder requests are serialized against the latest complete gallery array and revision. The parent validates exact project/slot/media identity and iframe generation, then sends the accepted order back to the preview. Moving to another project cannot replace an unsaved draft. Cancel restores the original resolved photographs. Earlier/later controls use the same parent queue for keyboard and touch access.

Saving stays locked through persistence, deployment and readback. Every save, including development and already-applied responses, verifies the stored order and revision before clearing the draft. Conflicts retain the draft. An accepted write with mismatched readback displays recovery pending instead of success.

Related repairs keep project scoping behind the existing Workbench session, send public calls to action to Contact, restore legacy gallery/project-index destinations, and give the photo viewer native modal focus management. Drive inventory uses the existing authorized-corpus inventory; folder access retains corpus verification. Drive thumbnails use private, no-store caching.

## Checks

- TypeScript: `tsc --noEmit` passes.
- Canonical Jest suite: 420 tests pass in 35 suites; eight tests in two suites remain skipped by the existing configuration. This is not a claim that real Redis integration tests ran.
- Production build passes in an isolated source snapshot, excluding the four graph/projection files that were already dirty before this pass.
- `npm run qa:images` passes. It reports an existing stale manifest and SVG placeholders; this pass does not fabricate replacement media or rewrite their evidence.
- A real native browser drag between actual preview cards posts exactly one reorder message after the repair. The earlier probe posted none.
- The actual parent Workbench and actual preview pass native drag, accepted preview order, earlier/later controls, cross-project draft protection, cancel, 409 conflict retention, complete order/revision submission, reload using the new revision, and mismatched-readback recovery checks.
- Those parent flow checks use explicitly isolated authentication and persistence API fixtures. They do **not** establish live Workbench authentication, Redis persistence, Google consent, OAuth or deployment recovery.
- Anonymous production-build checks pass at 390, 768, 1280 and 1440 pixels: no horizontal overflow in Contact/Our Work, one primary heading, public photo viewer navigation/zoom/Escape/focus restoration, no public estimate links, canonical redirects, anonymous scoping redirect and anonymous API rejection.

The locally configured Workbench password returned HTTP 401 against the live site before this pass. A live authenticated save/reload remains unverified until a valid production session is available. No authentication bypass was introduced.
