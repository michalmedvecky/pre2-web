# Continuous stages2–5 and stageG ice support — release1.2.3

The v16 terrain inventory covered the assets but did not make independently painted cells visually continuous. The v17 repair did not include stages2–4; its stage5 whole-cell bark rule also mixed old and new drawings and painted empty tile corners as wood. The supplied screenshots demonstrate those unresolved defects. This repair does not classify that earlier asset inventory as proof of visual fidelity.

## Terrain

Six continuous color plates cover gray rock2, sage rock3, blue rock4, bark4/5, green foliage2–4 and autumn foliage5. Material UVs belong to world coordinates. Packing overlaps64px at the image edges and uses wrapped UVs, avoiding both hard wrap cuts and mirrored artificial stone/leaf faces.

`terrain-materials.js` derives separate fields from original palette indices. Index11 is a dark stone shade in2/3, and index7 is a bark highlight in4/5; omitting these shades leaves old tile colors over the new drawing. Mixed trunk/leaf cells keep separate ownership, and broad native shadows remain dark. Thin material cracks receive the adjacent material. No new alpha or collision geometry is invented. The original nonzero source mask owns coverage. LEVEL lettering/number tiles775–783 remain literal.

Foreground masks use the same materials and world coordinates as the background terrain. Their small rendered images are cached; this prevents the old pale rectangular foreground pieces being placed back over the continuous wall. Stage3 foliage retains its cyan palette through a renderer color transform. Original graphics and level data files are unchanged.

Built-in ImageGen generated six independent material plates using the original decoded views as palette/style references. Unmodified outputs are in `raw/`; exact prompts in `prompts/`; source views in `references/`; raw and packed hashes/overlap settings in `packing.json`. `node scripts/build-hd-v19.mjs` deterministically repacks the saved art without a model call. The consumed assets are `dist/assets/hd/v19-*.png`. This is an artistic HD interpretation, not pixel equivalence to the DOS drawing.

## G collision defect

Reproducer: from the start, walk right toward the first burger, then reverse left. A second case jumps before moving right/returning. Both run without game-state edits. The old collision path checked the tile containing the feet and the next row below. At an uphill return, the supporting ice tile can belong to the preceding row; slope offsets can also extend beyond a16px row. The old code lost support and fell through the visible tunnel into the bottomless void.

`resolveIceSupport` runs only inG, only when the regular collision path found no support and the player is descending/grounded. It sweeps nearby authored walkable surfaces, accepts a crossed landing surface or the existing short walking step range, and restores the authored floor speed class. Jumping upward is unaffected; actual empty space still has no floor. This is a scoped browser collision repair using the recovered surface formulas, not a claim that runtime DOS behavior was observed.

The old524-tick G completion route depended on the missing-floor behavior to reach the lower exit. The replacement625-tick ordinary-input route reaches the other authored exit without any checkpoint rescue. `tests/fixtures/playthroughs.json` records it, and the G replay explicitly rejects rescue events. All other saved routes remain unchanged except stage6: with corrected tree-boss support, the same input sequence completes one tick sooner (1636). The former route is retained in `review/6-legacy-route.json`.

## Evidence / checks

- `review/G-reverse-before.json` / `G-reverse-after.json`:22 initial right/left and jumping scenarios; old falls versus corrected support.
- `tests/ice-support.test.mjs`: additional normal-play and IDDQD cases, upper/jumping approaches, authored slope columns acrossG and empty-space/scope checks.
- `review/G-legacy-route.json`, `G-new-route.json`: preserved old route and replacement; the search driver `scripts/plan-G-route.mjs` uses ordinary inputs and rejects checkpoint rescues.
- `tests/early-materials.test.mjs`: material shades, literal text, mixed-cell ownership, global coordinate/chunk invariance, native alpha parity and all asset hashes.
- Browser captures, foreground/worker parity, movement/input replays and frame-pacing results are saved under `review/`.

No DOS executable or emulator was run. Original-file hash verification remains outside this web repository. Remaining native repeated motifs and architectural silhouettes are intentionally retained; these checks do not establish that every HD pixel or every possible G route matches the original game.

Measured initial pans (this Mac): p95 render2=1.6ms,3=1.7ms,4=1.6ms,5=1.5ms; preparation0.51–0.60s. Stage2 had one43.7ms cold-cache frame (3 synchronous chunk builds); other measured stages had none. This is not a claim of zero stalls or guaranteed mobile rates. The raw RAF-gap data is retained in `review/performance/performance.json`.

Browser regression: eight detailed scenes per engine, native indexed-frame/simulation parity, exact worker/synchronous parity, normal G return/jump-return and625-tick completion with zero rescues in both Chromium and WebKit. Actual arrow-key holds in the in-app browser independently reproduced both returns to x8/9,y656 without cheats or lost hearts/lives (`review/G-live-keyboard.json`).312 Node tests pass, including all saved stage/branch completions.54 original file hashes remain unchanged.


## Stage5 and6 follow-up

See [platform/doorway evidence](STAGE5-SURFACES.md) and [tree-boss jump findings](review/boss-jump-findings.md). Stage5 keeps its native cut-face family bright instead of replacing it with vertical bark. The first hut opening receives a rounded lintel within its original cell.

Stage6 hazard tiles that include bark now reconstruct the trunk behind their spike gaps, while exposed hazards keep transparent gaps. The complete tree arena owns its generated RGBA coverage instead of being cropped by the unrelated native tile silhouette. Native data, collisions and the Original raster remain unchanged by these visual repairs.

`review/boss-jump-browser.json` records actual ArrowUp input during repeated hand slams in Chromium and WebKit, with and without IDDQD. `review/boss-jump-tests.txt` covers32 attack phases, void/airborne exclusions and the failing pre-repair baseline. The collision reconciliation is limited to the active multipart tree boss.

Mobile regression passed after moving the test clock installation before page load, so it captures the initial animation-frame registration. The old harness registered the fake clock after HD startup and froze the test's frame counter at0; touch pointers were present. No production touch controls were changed. Results are in `mobile/browser.json`.

Stage6 graphics regression captures3 locations and12 boss hand/body combinations per engine (`review/stage6-final/stage6-composite-browser.json`), including exact worker/synchronous and native raster/state parity. The compositor uses the saved v18 artwork; no new model output was required for this follow-up.
