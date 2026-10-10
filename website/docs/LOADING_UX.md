# Loading UX — October 10, 2026

## Changes and boundaries

- `src/components/loading-ui.tsx` supplies route-shaped public fallbacks, the editor shell, and photo grids/list rows. Decorative blocks are hidden from assistive technology; each region has one polite status and `aria-busy`. The editor fallback has no preview, source records, or enabled editing controls before access checks succeed.
- `src/app/{our-work,reviews,projects/[slug],services/[slug]}/loading.tsx` replaces identical generic rectangles with layouts based on each route's hero and content. `workbench/media/loading.tsx`, its page's initial data state, and `WorkbenchShell` reuse the editor scaffold.
- Media refresh preserves existing assets, labels the refresh action, and prevents repeated clicks. Drive folder loading has a local grid/list fallback, distinct from completed empty/error states. The standalone Drive explorer has accessible error feedback and contextual retry.
- `src/components/workbench/media-thumbnail.tsx` presents the caller's selected image URL with native lazy loading and asynchronous decoding. Loading, loaded, cached, and failed images retain the caller's fixed box. Changing the selected URL remounts the component via its key. Failed images show “Photo unavailable”; they do not silently select another source.
- Reviews receive completed records from their server page rather than starting empty and rereading server authority in a client effect. The filter remains interactive and the established empty state remains intact.
- Homepage hero and featured cards reuse available blur data. Below-fold cards no longer preload alongside the hero. Homepage cards, project grids, and project hero have layout-aware `sizes`. Existing archive AVIF/WebP `<picture>` sources remain intact.
- CSS uses at most three quiet opacity cycles, only under `prefers-reduced-motion: no-preference`; reduced motion explicitly disables them. No new motion or data dependency was added.
- ESLint now parses and checks the touched loading paths instead of silently ignoring them. Existing authority/mutation gates were not relaxed.

`loading.tsx` creates real route-segment Suspense boundaries. The Workbench's effect-driven client fetches use explicit state; putting those effects inside Suspense would not make them suspend. Additional boundaries were not added around synchronous content for appearance alone. Skeletons approximate known geometry; variable copy, published images, and optional sections can still change page height.

## Primary sources

- [Next 15 loading UI and streaming](https://nextjs.org/docs/15/app/api-reference/file-conventions/loading): stable App Router convention; preserves shared layouts during segment navigation.
- [React Suspense](https://react.dev/reference/react/Suspense): supported streaming/suspending data paths; ordinary effect fetching does not trigger a fallback.
- [Next 15 Image](https://nextjs.org/docs/15/app/api-reference/components/image): fill sizing, responsive candidates, blur placeholders, and above-fold priority. The repository uses Next 15.5.24; Next 16 APIs were not assumed.
- [Google CLS guidance](https://web.dev/articles/optimize-cls/): reserve image/content geometry.
- [Google LCP guidance](https://web.dev/articles/optimize-lcp/): make the likely LCP resource discoverable early and avoid unnecessary competing work.
- [W3C status messages](https://www.w3.org/WAI/WCAG21/Understanding/status-messages) and [status technique](https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA22): polite feedback without moving focus.
- [MDN reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion): established browser media preference.
- [MDN picture](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/picture): established responsive source selection and format fallback.

Established APIs were preferred. Experimental React ViewTransition/canary APIs are not part of this release. Content-aware skeletons are a design pattern, not a browser capability or a performance guarantee.

## Verification

The full default Jest suite passed 1,083 tests (26 skipped), including seven loading boundary/SSR checks. Typecheck, actual scoped lint, repository lint, production build, image QA, and three image-reference checks passed. Browser review used the actual components with compiled CSS in an isolated localhost presentation fixture, plus the compiled authorized local Workbench with test-only credentials.

Editor checks at 1440, 1280, 768, and 390 pixels showed two desktop panes and stacked smaller layouts without horizontal overflow. All public fallback variants and square file placeholders were reviewed on mobile. A thumbnail retained 256×192 dimensions through loading, success, and 404 states. The real local Workbench moved from access checking to the editor, retained media on refresh, showed an empty search result, restored 25 source tiles on clearing search, and surfaced the test environment's Drive corpus failure as an alert. No Production content was changed for these checks.

The compiled stylesheet includes both the bounded motion rule and explicit `animation: none !important` for reduced motion. The test browser's preference was `no-preference`; a preference override was not available through its supported API. This is CSS-rule verification, not a claim of manually testing a reduced-motion browser session.

Image QA's existing stale-manifest and SVG-placeholder warnings remain. No LCP, CLS, INP, or bandwidth improvement is claimed without representative before/after browser/field measurements. The Workbench local fixture is not a new Google OAuth or production materialization proof.

## Research execution

Three bounded `gpt-6-luna` researchers completed: platform/loading sources, responsive/progressive images, and a code audit. The collaboration API exposes four concurrent slots including the coordinator; dispatch stayed within that limit and delivered final results successfully. Earlier “Stopped with error” diagnostics were not exposed by the current live-agent inventory or recent thread summaries, so their underlying cause remains unknown and their research is not counted as complete. No forty-agent batch was relaunched.
