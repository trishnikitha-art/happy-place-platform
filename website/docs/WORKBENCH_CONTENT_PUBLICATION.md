# Workbench content publication

`/workbench/content` manages services and projects using the existing authenticated staging → deployment transaction → pinned Git → non-force main update → Vercel publication flow. Project stories are part of the project object; hiding a project also hides its story route.

## Compatibility and authority

- Existing catalog items without `publicationState` remain published. An item is public only when it is neither hidden nor archived and its publication state is absent or `published`.
- `hidden` is reversible. It does not delete media, story, provenance, assignments, or existing R2 objects. `draft` is distinct; these controls cannot promote drafts or restore archived items.
- Optional catalog `editorialRevision` defaults to zero. A mutation contains the complete previous and proposed ID/visibility/order snapshots. The server validates membership, stable IDs, unchanged publication states, and exact revision/snapshot CAS both before staging and against pinned Git after claim.
- Only `hidden` and `order` are written. All other fields come from the pinned canonical catalog. No media materialization/assignment proof is bypassed.
- Staging uses the existing immutable Redis transaction mechanism. Receipts bind one catalog to one Workbench principal. Cancellation is atomic and permitted only before the claim/Git boundary. Retained claimed/committed failures require investigation; automatic duplicate commits are prohibited.
- Changes are labeled pending until the served HTML and authenticated catalog response match the exact Vercel commit/deployment identity and proposed deployed snapshot. Failed or incomplete verification never reports publication success.
- Undo stages a fresh reviewed inverse change with current CAS authority; it rejects a collection that changed after the verified publication.

## Public surfaces

Public project and service readers filter centrally before listings, detail lookup, homepage selections, galleries, related projects, and sitemap generation. Hidden/draft detail lookups return not found. Hidden service galleries cannot fall back to raw project collections.

The public media gate additionally rejects placements owned exclusively by hidden/draft/archived projects, including runtime records with project ownership. Shared assets with a visible project owner remain eligible, subject to the unchanged materialization/provenance/R2 integrity contract. Generated public projections filter a derived graph and remove dangling edges; immutable source evidence remains untouched. Catalog visibility is included in projection input provenance.

The deployment is the public cache boundary: catalog state is bundled in the new release and no public runtime visibility overlay is introduced. Administrative API responses use `no-store`. Intentionally public media object URLs can still be anonymously fetched directly; hiding controls application placements rather than bucket access.

## Scrolling and controls

Workbench, `/our-work`, `/services` and service details, `/projects` and project stories use native scrolling. Query-only Workbench-mode transitions synchronize the shared Lenis lifecycle. Every disposal destroys the instance, cancels its animation frame, and removes the registered listeners. Other public routes retain the existing Lenis policy.

The document owns Workbench scrolling. Media library panels and the preview iframe retain independently bounded native scroll containers. Preview navigation remains in the authenticated preview namespace. A collapsed mobile navigation rail preserves content width; expanded navigation overlays rather than compressing the editor.

Right-click and a 44px overflow control expose hide/show and beginning/end actions. Menus support arrows, Home/End, Escape, focus restoration, outside click, and viewport bounds. Direct position controls avoid repeated one-step moves. Gallery photos retain the existing pointer/touch drag authority and gain a direct position selector. Search, publication filters, stable-ID counts, and before/after publication review use the canonical catalog.

## Verification limits

Automated coverage includes legacy visibility, draft/archived exclusion, stable ordering, invalid positions, full snapshot CAS, preserved metadata, inverse mutations, authenticated API failures, exact coordinator approval, pinned-Git conflicts, public readers/projections, and real Redis cancellation/claim races. Local browser tests must use isolated Redis and a local test credential. Production hide/show acceptance requires a legitimate production Workbench session and restoration of the test item; unit or local tests do not establish that production claim.
