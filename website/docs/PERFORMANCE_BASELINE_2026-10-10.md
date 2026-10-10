# Production performance baseline — October 10, 2026

Release: `ef64922d45e09145f2addb007a9b6b295dae8bc1` at https://happy-place-platform.vercel.app.
All 60 navigation runs checked the rendered commit marker. No runtime errors or Lighthouse warnings occurred. Six separate scripted interaction recordings completed against the same release.

## Method and practical limits

Chrome Chrome/155.0.8059.39, Lighthouse 13.5.0, Node v24.19.0, Windows, 12th Gen Intel(R) Core(TM) i7-12850HX, 24 logical CPUs. Started 2026-10-10T19:49:42.753Z. Three repeated measurements per device/route/cache group; route order rotated across repetitions. Runs used isolated, anonymous Chrome profiles. No authenticated browsing or user cookies entered the audit harness.

Mobile: 412 × 823, DPR 1.75; Lighthouse simulated 150 ms RTT, 1638.4 Kbps throughput, 4× CPU. Desktop: 1350 × 940, DPR 1; simulated 40 ms RTT, 10240 Kbps throughput, 1× CPU. Full settings and benchmark indices are in each JSON report.

Cold resets browser storage and HTTP cache. Warm preserves the same profile immediately after the corresponding cold run. DevTools cache events and reduced transfer bytes confirm warm resource reuse. Server/CDN state is uncontrolled; “cold” does not mean a cold Vercel deployment or CDN. Project-detail runs include one cached response; inspect cachedUrls in summary.json rather than assuming every subresource is a network miss.

Lighthouse's navigation LCP/TBT below are **modeled**. Raw Chrome observed LCP uses the unthrottled navigation trace. They are separate measurements, not interchangeable; in particular, the modeled desktop homepage result is much shorter than its observed server wait. Navigation TBT is not INP. Scores and these small lab samples do not establish field Core Web Vitals or visitor percentiles.

Values are medians; parentheses are min–max across three repeats. LCP/TBT in milliseconds, transferred bytes in KiB.

## Mobile navigation

| Route | Cache | Modeled LCP | Raw observed LCP | CLS | Modeled TBT | Transfer KiB |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| / | cold | 2395 (1998–4292) | 2632 (2517–2968) | 0.0000 | 130 | 792 |
| / | warm | 1492 (1194–1774) | 2767 (2496–2941) | 0.0000 | 187 | 25 |
| /our-work | cold | 4026 (4005–4236) | 1145 (1032–1229) | 0.0000 | 311 | 772 |
| /our-work | warm | 1351 (1318–1502) | 1075 (966–1117) | 0.0011 | 208 | 21 |
| /projects/custom-pergola-corvallis | cold | 4151 (4147–4290) | 1183 (1167–1258) | 0.0011 | 231 | 704 |
| /projects/custom-pergola-corvallis | warm | 1733 (1447–1757) | 1153 (1035–1324) | 0.0011 | 523 | 16 |
| /services | cold | 2416 (2397–2900) | 1586 (1579–1830) | 0.0000 | 406 | 766 |
| /services | warm | 1212 (1099–1363) | 1591 (1539–1663) | 0.0000 | 309 | 21 |
| /contact | cold | 1549 (1545–1551) | 429 (422–471) | 0.0011 | 197 | 575 |
| /contact | warm | 830 (804–883) | 352 (349–391) | 0.0011 | 172 | 10 |

## Desktop navigation

| Route | Cache | Modeled LCP | Raw observed LCP | CLS | Modeled TBT | Transfer KiB |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| / | cold | 615 (571–871) | 2675 (2569–2945) | 0.0087 | 7 | 838 |
| / | warm | 353 (327–422) | 2721 (2609–2950) | 0.0009 | 0 | 27 |
| /our-work | cold | 856 (839–868) | 1105 (1080–1344) | 0.0009 | 22 | 739 |
| /our-work | warm | 392 (376–451) | 1040 (973–1185) | 0.0009 | 4 | 24 |
| /projects/custom-pergola-corvallis | cold | 866 (845–912) | 1330 (1121–1337) | 0.0009 | 11 | 724 |
| /projects/custom-pergola-corvallis | warm | 358 (355–447) | 1275 (1030–1379) | 0.0009 | 0 | 20 |
| /services | cold | 641 (566–643) | 1641 (1617–1879) | 0.0009 | 12 | 728 |
| /services | warm | 403 (328–445) | 1659 (1542–1691) | 0.0009 | 10 | 30 |
| /contact | cold | 451 (409–456) | 463 (449–709) | 0.0009 | 9 | 578 |
| /contact | warm | 241 (229–246) | 370 (364–383) | 0.0009 | 0 | 14 |

## Interaction recordings

Actual DevTools throttling (not navigation simulation) was applied to three mobile and three desktop flows. web-vitals 6.2.3 attribution measured Event Timing. Flows opened/escaped the menu, navigated to the archive, opened/zoomed/escaped a photo, checked focus restoration, used back/forward, and navigated to services/contact. No contact form or message was submitted. Action verification wall times include automation/network waiting and must not be reported as INP. LCP is document-level; no per-route SPA LCP claim is made.

| Flow | Final measured lab INP ms | Worst interaction | Processing ms | Presentation ms |
| --- | ---: | --- | ---: | ---: |
| mobile-interactions-1 | 368 | Open gallery photo | 288 | 79 |
| mobile-interactions-2 | 376 | Open gallery photo | 298 | 76 |
| mobile-interactions-3 | 320 | Open gallery photo | 281 | 38 |
| desktop-interactions-1 | 128 | Open gallery photo | 47 | 81 |
| desktop-interactions-2 | 64 | Open gallery photo | 31 | 33 |
| desktop-interactions-3 | 80 | Open gallery photo | 32 | 48 |

Mobile lab INP ranged 320–376 ms (median 368), primarily gallery-opening processing. Desktop ranged 64–128 ms (median 80). These are scripted session measurements, not field INP. Focus restored to the triggering archive card in all six recordings. The exact selectors, marks, Event Timing, shifts (including recent-input flags), long tasks, and trace files are retained.

## Evidence and next controlled change

The homepage's raw Chrome response headers completed at a median 2454 ms mobile cold (2319–2464); raw observed LCP was 2632 ms. Services headers completed at 1389 ms mobile cold. The homepage hero candidate is already small (about 23.5 KiB at width 750 on mobile) and preloaded/eager. On the archive the LCP node is the hero paragraph; on the detail page it is the pergola image. Candidate URLs, sizes, DPR, image bounds, request bytes, LCP nodes/subparts, and priority events are retained in the artifacts.

Source inspection shows the homepage awaiting unrelated review/stats/portrait/project/hero reads in sequence, followed by five serial service assignment resolutions. Overlapping independent reads is a narrow hypothesis to test against the measured HTML wait. It changes concurrency, not the number of reads, authorization, assignment freshness, or public-media validation. The helper must preserve rejected-assignment null behavior and existing fallback/retry semantics. A repeated deployed comparison is required before claiming improvement.

Archive/detail cold mobile modeled LCP and mobile gallery-opening processing remain investigation targets. A delayed transform in archive ScrollReveal is not evidence that it causes the measured hero-paragraph LCP. Do not make a broad animation rewrite based on this baseline alone.

Physical Safari and real touch-device verification remain open. Reduced-motion emulation must be identified as emulation. Fresh production OAuth/session/ingestion evidence is tracked separately; anonymous route audits cannot prove it. The temporary r2.dev origin does not satisfy the custom-domain production finish condition.

Raw artifacts on this workstation: task outputs/performance-ef64922 — summary.json, aggregate.json, interaction-summary.json, 60 navigation HTML/JSON reports + Chrome traces/DevTools logs, and six interaction HTML/JSON reports + traces/logs. Reproduction scripts and locked audit dependencies are in task work/performance-tools; run baseline.mjs from the task root, with no other CPU-heavy work running. Browser HTTP-cache behavior and all settings are recorded in the harness.

## Primary measurement references

- [Lighthouse throttling modes](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md)
- [Lighthouse user flows](https://github.com/GoogleChrome/lighthouse/blob/main/docs/user-flows.md)
- [INP measurement and lab/field limitations](https://web.dev/articles/inp)
- [Total Blocking Time](https://web.dev/articles/tbt)
- [Chrome interaction trace reference](https://developer.chrome.com/docs/devtools/performance/reference#view-interactions)
