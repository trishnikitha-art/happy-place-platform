# One website editor

Open /workbench/media. The left panel renders the actual authenticated website preview. The right panel offers Photos & slots, Text, and Services & projects. Switching tools retains the existing editor's draft/receipt state.

Text mode highlights the four currently authorized homepage fields: headline, introduction, and the two hero button labels. Click a highlighted field, or focus it and press Enter/Space, to select it. Typing changes only the adjacent preview. Save stages the existing revision-checked server transaction; the same iframe then loads its authenticated staged rendition. Approval, cancellation, retained-receipt reconciliation and exact deployed-release verification use the existing text APIs. No other copy or protected business metadata is made editable by the preview bridge.

The bridge accepts messages only from the same-origin parent/preview pair, uses the parent's current iframe generation, restricts field keys and lengths, and writes plain text into preview elements. It restores text and focus attributes when disabled or unmounted. It never writes canonical records or public DOM.

The old /workbench/text URL redirects to /workbench/media?tool=text. There is no separate text-editor navigation item.

Services & projects exposes the existing authenticated visibility/order manager in the same right panel. Opening a service/story uses the left preview instead of leaving the editor. Existing standalone /workbench/content remains a compatibility entry.

Services are one ordered, continuous grid at both /services and the homepage. The layout uses one column below 480px, two columns at Workbench preview widths, and three columns on desktop. No per-category grid restarts leave singleton rows.

About uses a shorter tan service-area section. Missing media does not reserve an empty public image section; the Workbench retains a compact drop slot. Existing assigned images still resolve through the public media gate.
