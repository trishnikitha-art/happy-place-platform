# Deployed homepage comparison — October 10, 2026

Before: ef64922d45e09145f2addb007a9b6b295dae8bc1, 60 baseline navigation runs. After: 93febdc4f9aeb2808e4e50a5ccf94ec786886232, 24 target/control navigation runs. Each group has three repeats. Exact rendered SHA was checked on every run. Same Lighthouse 13.5.0, Chrome 155.0.8059.39, machine, viewport and simulated mobile/desktop settings. No other builds/test suites ran during either navigation audit batch. Server/CDN state is uncontrolled. Each warm run immediately followed its corresponding cold browser-cache run.

The shipped change overlaps independent homepage authority reads and service media resolutions. It keeps existing public-media gates, assignment fallback branches and registry order. Increased burst concurrency is the operational tradeoff; read count is unchanged.

All timing values in ms: median [minimum–maximum]. Modeled Lighthouse LCP and raw unthrottled Chrome LCP/complete-response-header time are explicitly separate.

| Device | Route | Cache | Modeled LCP before → after | Raw LCP before → after | Raw headers complete before → after |
| --- | --- | --- | --- | --- | --- |
| mobile | / | cold | 2395 [1998–4292] → 2008 [1744–3960] | 2632 [2517–2968] → 1455 [1216–2513] | 2454 [2319–2464] → 1153 [1025–2024] |
| mobile | / | warm | 1492 [1194–1774] → 1261 [1218–1268] | 2767 [2496–2941] → 1348 [1189–1403] | 2483 [2325–2591] → 1108 [969–1230] |
| mobile | /contact | cold | 1549 [1545–1551] → 1555 [1548–2148] | 429 [422–471] → 441 [424–484] | 286 [284–320] → 276 [253–283] |
| mobile | /contact | warm | 830 [804–883] → 815 [762–825] | 352 [349–391] → 384 [342–396] | 264 [258–265] → 280 [276–343] |
| desktop | / | cold | 615 [571–871] → 612 [547–859] | 2675 [2569–2945] → 1335 [1101–1488] | 2460 [2379–2472] → 1074 [920–1125] |
| desktop | / | warm | 353 [327–422] → 345 [332–413] | 2721 [2609–2950] → 1237 [1151–1361] | 2468 [2367–2742] → 1001 [944–1191] |
| desktop | /contact | cold | 451 [409–456] → 407 [406–410] | 463 [449–709] → 441 [434–467] | 301 [297–480] → 313 [280–317] |
| desktop | /contact | warm | 241 [229–246] → 225 [224–227] | 370 [364–383] → 339 [322–355] | 289 [278–291] → 260 [257–262] |

Mobile cold homepage response-header completion improved from 2454 to 1153 ms (about 53%), with raw observed LCP from 2632 to 1455 ms (about 45%). Its modeled Lighthouse LCP improved from 2395 to 2008 ms (about 16%). Contact, the control route, stayed near 1.55 seconds modeled mobile cold LCP (1549 → 1555 ms); raw headers were 286 → 276 ms. Desktop raw homepage LCP was 2675 → 1335 ms, while modeled desktop LCP was essentially unchanged (615 → 612 ms). The modeled desktop result should not hide the measured HTML/server wait.

The new cold-mobile homepage range is wide (1744–3960 ms modeled LCP); the first post-deploy sample had a slower HTML response than subsequent repeats. Three repetitions support a useful lab signal, not a visitor percentile, statistical significance claim, or guaranteed per-device speed. Homepage CLS remained 0 on mobile. Other routes and gallery INP were not optimized or re-certified by this change. TBT is not INP.

Artifacts: outputs/performance-93febdc contains 24 HTML/JSON reports, raw Chrome traces, DevTools network logs, image candidates/bounds, cache events, and aggregate.json. The initial 60-run baseline and six interaction recordings are in outputs/performance-ef64922. Audit harness and locked audit packages are in work/performance-tools. Reproduce from the task root: node work/performance-tools/baseline.mjs <exact-deployed-SHA> --target, then node work/performance-tools/aggregate.mjs outputs/performance-<short-SHA>.

Existing image QA passed with pre-existing placeholder/manifest warnings. Local TypeScript, lint, production build, and all 1094 Jest tests passed. GitHub Actions 38082978505 passed both build and OAuth jobs, including Redis-backed and HTTP security integration phases. Vercel reported commit status success, and public route responses served the exact after SHA.

Next measured experiment: precompute the archive lightbox descriptor list and index map outside the click handler. The measured mobile gallery click had 320–376 ms lab INP; source confirms two full-gallery maps and a linear search inside that handler. Whether the page rerender or thumbnail strip dominates requires trace/call-stack evidence. No broad animation or image-loader rewrite is justified by this result alone.
