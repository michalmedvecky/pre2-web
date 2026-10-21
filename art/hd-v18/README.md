# Spike masks, tree arena and smooth camera pans — release 1.2.2

The supplied screenshots identified opaque mattes around stage6 spikes and independently painted root/foliage fragments near the tree boss. Real-time browser measurements also reproduced long main-thread stalls while stage6 and the F credits uncovered new HD chunks.

## Drawing repairs

Native stage6 local tiles169–172 contain the spike strip. Their index6 matte is removed from the HD geometry only; native bark shadows, torch tiles, original indexed banks and all collision properties remain unchanged. `terrain-chunk.js` contains the narrow classification. The first spike row is at native x32..127, y336.

The boss approach now samples one connected384×208 native-coordinate color plate at world704,1840, covering foliage, roots and the static tree together. This replaces independently painted fragments and their black rectangular backgrounds. Native connected geometry still masks the plate. Existing arms, weak points, animations and combat retain their original positions/rules. A16px native feather joins the plate to the surrounding scene. This is an artistic HD interpretation; Original mode is retained for exact recovered pixels.

Built-in ImageGen produced one edit from `references/boss-arena.png` (recovered layout) and the previous tree drawing (style). The unmodified result is `raw/boss-arena.png`, exact prompt `prompts/boss-arena.txt`; `packing.json` records input/output hashes. Generated alpha is preserved and combined with the existing native geometry. The model was not used to alter gameplay. Reproduce deterministic preparation/packing with:

```sh
node scripts/prepare-hd-v18.mjs
node scripts/build-hd-v18.mjs
```

The consumed asset is `dist/assets/hd/v18-boss-arena.png`. The arena is not baked together with moving boss arms.

## Scrolling repair

Previously each newly visible64px chunk synchronously reconstructed a96px halo region into384×384 RGBA. Static chunks also used three separate animation-phase cache keys. Stage6 and F introductions traverse many rows immediately after loading; per-chunk computations repeatedly blocked the browser's animation frames. The first animated bushes could similarly stall on their second/third phase.

`terrain-chunk.js` is a shared pure rasterizer. `terrain-worker.js` computes those same pixels away from the main thread. Before play, the renderer prepares the first view and a small surrounding region. During play it prepares the next128 native pixels vertically and64 horizontally; visible animated chunks also warm their other phases. Static chunks share one key across phases. Cache validity includes all36 physical tile values, including the halo, so map edits and animation still invalidate the affected images. Recent views refresh the LRU order, including when reversing direction. The cache is bounded at128 cropped256×256 canvases (32MiB of RGBA backing, excluding canvas/browser overhead, source textures and worker buffers).

A short preparation overlay precedes the camera pan. Game rules do not advance during that preparation, and the frame accumulator restarts afterward; loading cannot turn into a burst of catch-up simulation steps. Switching stages cancels the old worker work. Switching graphics disposes the old worker. Missing/unavailable workers use the synchronous rasterizer and preserve playability, with the former performance limitation. Stage1 and B–D warm their existing renderer's initial phases before play.

## Verification

- `review/chromium-6-spikes.png` / `webkit-6-spikes.png`: transparent spike gaps in actual browser output.
- `review/chromium-6-boss.png` / `webkit-6-boss.png`: continuous foliage and roots, with independently animated parts.
- `review/streaming-browser.json`: worker vs synchronous pixels are byte-identical, Original indexed raster and simulation hashes unchanged, stage changes during preparation, and a no-worker fallback.
- `review/before-full/performance.json` and `review/after-final/performance.json`: real browser render cost, RAF gaps, startup preparation and complete pan/credits sampling. These are measurements on this Mac, not guaranteed mobile frame rates.
- `review/world-paint-browser.json`: material/cavity and complete final-boss regressions.
- `review/scroll-seams.json`: fractional chunk joins, native raster and simulation parity.
- `mobile/`: touch/fullscreen checks in Chromium and WebKit.

This task performs browser rendering/performance inspection, not a new full-game playthrough. No original DOS executable or emulator was run. The54 original file hashes remain unchanged; verification evidence is maintained outside this web repository.

Complete-route measurements after repair: stage6 p95 render1.3ms, F introduction1.3ms, F credits down-scroll1.4ms; all three have zero main-thread chunk builds and zero RAF gaps over34ms in this run. Initial preparation is approximately0.45–0.49s on this Mac. The credits strip was also traversed in the opposite direction to catch cache eviction/reversal defects. Stage1 initial animation phases are prepared before play; its measured max in-play render is4.7ms.

Final regression results:294 Node tests pass; both Chromium and WebKit start all16 stages successfully, including switching stages and graphics during preparation. Mobile touch/fullscreen regression passes in both engines. Fractional-scroll checks cover90 synthetic samples (zero mismatches) and50 positions in each of stages1,6,8,9,A,F. Targeted material checks cover12 scenes/poses with unchanged native raster/simulation hashes.

Diagnostic history is retained: `review/before/` used mocked performance clocks and is invalid as timing evidence; `review/after/` is an early partial-route measurement; `review/after-full/` exposed the cache-reversal and first-bush-phase stalls that were subsequently fixed. Use only `before-full` versus `after-final` for the final full-route comparison. These are rendering benchmarks; the downward credits traversal explicitly controls the presentation camera without claiming a gameplay replay.

Published game code `001ad8b34cc4ec0402ff6171d8b57712639d059e`; [successful amd64/arm64 build 39544572295](https://github.com/michalmedvecky/pre2-web/actions/runs/39544572295). Both OCI revision labels verified. Kubernetes pin: `ghcr.io/michalmedvecky/pre2-web@sha256:6d8f5fff105c0bc187c426ac9688e42c0e67560a108dd9a3d446c139b2152bb8`.
