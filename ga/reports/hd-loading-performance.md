# HD preparation performance, 2026-11-03

CPU preparation now yields through `scheduler.yield()` or a browser MessageChannel
instead of repeatedly nesting zero-delay timers. Released 0.2.2 paid the browser's
4ms timer clamp thousands of times while preparing exact painted palette crops.
The interpolation keeps its original r/g/b summation order but no longer allocates
several short arrays for every painted pixel. RGB LUT keys exclude per-frame
paint-material geometry, which does not affect LUT values; full crop keys still
include that geometry and exact source crop. No palette verification was relaxed.

Measured in actual Chrome against an immutable `ga-v0.2.2` export on localhost;
only owned performance modules were overridden for the candidate browser. No
artwork/font changes or WebP metadata participated in this comparison:

| Preparation | 0.2.2 | Candidate |
| --- | ---: | ---: |
| Stage1 cold | 20.042 s | 2.490 s |
| Stage4 after Stage1 | 10.839 s | 1.276 s |
| Stage1 again, retained cache | 9 ms | 12 ms |
| Stage1 yield waiting, inclusive | 15.395 s | 33 ms |
| Stage1 RGB LUT compilations | 73 | 9 |

These are one-run local measurements, not a promise about public network time.
Function timing totals are inclusive and concurrent image work overlaps; do not
add them together. Source PNG/decode traffic remains relevant on slower networks.
WebP delivery support is separate: metadata must bind to the original atlas SHA;
invalid/unavailable encoding falls back to PNG inside the same pending load.
Source registration and material annotation identity remain the original PNG.

Validation: allocation-free interpolation was compared byte-for-byte with the
released reference over 65,536 varied RGBA pixels for LUT sizes9 and33, including
anchors, alpha and transparent hidden RGB. A cache regression test ensures only
RGB LUTs are shared while distinct geometry/crops retain separate outputs.
Delivery tests cover successful preference, PNG fallback, stale source authority,
path traversal and malformed metadata. Tests preserve the stage readiness and
cache bounds from0.2.2; no simulation/IRQ/audio timing code changed.

Working-tree integration with the new qualified UI filters and PNG delivery,
including an artificial450ms delay for every PNG, passed Stage1 and Stage4 with
zero gameplay loading samples and tick ratios1.0000 /0.9982. Measured preparation
was7.473s /3.799s under that artificial network delay. Source/derived caches had
zero evictions in these two scenes. Browser was closed and audio disposed.
A subsequent198-atlas WebP integration also passed with450ms applied to both
PNG and WebP:50/72 successful delivery loads, no fallback during normal Stage1/4,
no gameplay waits and tick ratios1.0011 /.9980. A cold Stage3 with all WebP
requests forcibly aborted fell back to18PNG loads with0failed atlases. This was
before the final fire artwork delta; it is not a full-game/native proof.
The reproducible script is `tests/hd-delivery-browser.mjs`.

Profiling: `tests/hd-profile-browser.mjs`. Set GA_TEST_URL to a server you own,
GA_PLAYWRIGHT_MODULE/GA_CHROME_PATH as needed, GA_PERF_OUT for its JSON output.
GA_PERF_CANDIDATE=1 overrides only hd-assets/hd-palette/hd-materials/hd-image/hd-task
from this checkout in the browser; use an immutable baseline URL for a controlled
comparison. The test disposes audio and closes its isolated browser. Authoritative
research evidence is under `golden-axe-research/evidence/hd-perf-20261103/`, with
baseline-isolated.json, candidate-isolated.json and source-identities.json.


## Incremental optimization prepared for ga-v0.2.5

RGB LUT application now precomputes each byte-channel interpolation coordinate
and unrolls the eight contributions in the released arithmetic order. Async
application uses one owned output buffer instead of allocating/copying an extra
buffer for each chunk. Transparent pixels, hidden RGB, exact anchors and rounding
are unchanged. Small coordinate tables are weakly associated with LUT storage;
eviction does not retain LUT arrays (5,120 extra bytes per retained LUT table).
Image delivery/decode concurrency is bounded at six instead of four. This does
not alter stage completeness, pinning, required palette work or cache limits;
transient decode memory can be somewhat higher and is not a browser RSS bound.

A Node numerical oracle test independently compares the released trilinear math;
65,536 varied RGBA pixels at LUT sizes9 and33 remain byte-identical. Async chunk
sizes1,31,2048,32768 also match that independent oracle, preserve the input and
retain exactly the expected yields. One1,048,576-pixel microbenchmark after warmup
improved about50ms→39ms (~21%); this is transform CPU only, not game load time.

An immutable baseline was verified against all584 runtime hashes of ga-v0.2.4.
The actual Chrome comparison uses that same app, font and asset data for both
runs; only the performance modules are overridden. With80ms artificial delay on
every PNG/WebP request, Stage1 preparation was2711→2285ms (15.7% faster), Stage4
1392→1156ms (17.0% faster), retained-cache Stage1 remained5ms. Requested resources
and transfer bytes were identical:46,280,439B cumulative at Stage1 and75,945,207B
at Stage4. These are one local measured pair, not a universal network guarantee.
Both browsers closed/audio disposed; neither sample had settled fallback.

Authoritative research receipts: `evidence/hd-perf-025/source-identities.json`,
`comparison.json`, `baseline-release-80ms.json`, `candidate-release-80ms.json`.
Earlier80ms files are explicitly exploratory: the first immutable copy contained
three concurrently edited app/index/style files, corrected before the release-
named authoritative repetitions. They are not used for the figures above.

`tests/hd-profile-browser.mjs` now accepts GA_PERF_DELAY_MS and asserts gameplay
readiness/no settled SD fallback. GA_PERF_CANDIDATE routes only performance files
from the checkout; baseline artifacts must remain immutable for comparison.

Current-checkout integration passed desktop and emulated-mobile2P Stage1/4
continuous real keyboard movement/attack/jump with450ms added perPNG/WebP:
zero loading-wait samples or cache evictions, tick ratios0.9983/1.0005 desktop
and1.0020/1.0009 mobile2P. ForcedWebPfailure Stage3 used18PNG fallbacks with
zero failed atlases in both. All test browsers closed/audio disposed. This is
a pre-final-freeze integration check while other app/font/input work continues,
not a physical mobile or fullgame/native proof. Research `hd-perf-025/integrated-summary.json`.
