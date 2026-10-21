# HD terrain repair20 / release1.2.4

The19 palette-only surface repaint treated the same green ink as either giant foliage or the turf on a narrow platform. Cropping a large leaf texture through those small native shapes fractured the platform edges. Background bark also covered horizontal beams in4. In9 the generic green-stone material overwrote carved architectural blocks around the gate. E still drew independently painted16px cave pieces.

## Final changes

- Stages2/3 use the existing whole HD root strip (`v8-roots`) for authored brown root families and their attached turf. Standalone bushes retain their painted animated frames. Stage3 keeps its cyan foliage palette. No arbitrary giant foliage fragments are sampled into these ground edges.
- Stage4 separates support families using recovered floor classes. Mixed rooted ground receives the matching strip; plain wooden supports use horizontal grain with a lit upper edge. Background trunks keep vertical grain and a darker tone. Multirow ground adds a turf lip only at the exposed first row.
- Stage9 preserves the actual carved masonry instead of classifying it as a generic boulder material. The gate and its immediate frame were redrawn together from the original decoded crop at native origin0,1632, width128,height144. The complete stage6 arena still has precedence over the older tree-only asset.
- StageE uses a continuous warm flowstone material for its native brown cave ink. Native foliage, gray rock, broad shadows/openings and collision data remain independent. Connected native silhouette/alpha still defines the cave outline. The surface uses world coordinates with a64px edge overlap for repeat continuity.

The first cave generation was rejected by the user because it retained pixel-art styling. The consumed second drawing replaces stepped contours with smooth painted shading, fine mineral detail and warm highlights. These are artistic HD redraws; their surface detail is not recovered DOS artwork. Authored architectural blocks and original map silhouettes are intentionally retained, so this does not claim removal of every rectangular shape anywhere in the game.

## Sources and reproduction

Built-in ImageGen produced the two consumed drawings. Exact prompts are in `prompts/`; unmodified model outputs, including the rejected first cave, are in `raw/`. Decoded source views and the compact native tile/collision inventory are in `references/`. `packing.json` records raw/consumed SHA256 and bounds. `node scripts/build-hd-v20.mjs` reproduces packed files without a model call; `v8-roots` and `v19-forest-bark` are reused as documented above. No original DOS file was written or executed.

## Verification

-319 Node tests pass, including all saved16-stage and secret-branch replays. Added checks cover root-family ownership, multirow grass lips, floor-vs-background timber, preservation of carved9 masonry, E ownership, asset hashes and stage6 arena precedence.
- `review/browser.json`:11 detailed scene views per engine in Chromium/WebKit. Captures cover2/3/4,9,E and6 regression; exact worker/synchronous pixel parity, original raster parity and unchanged simulation state. Diagnostic players are posed on actual authored supports when one is visible in the crop.
- `scroll/scroll-seams.json`:90 synthetic fractional-camera cases plus50 samples in each of2/3/4/9/E. Stationary comparisons have zero mismatch. No production input, physics, timing or save code changed.
-54 original-file hashes remain unchanged; the verification record stays under the parent workspace `analysis/evidence/hd-v20-20261021/` outside this game repository.

## Checklist

- [x] Reproduce reported surface-mixing defects.
- [x] Preserve first rejected generation and replace pixel-art cave styling.
- [x] Separate rooted ground, horizontal beams, trunks and carved masonry.
- [x] Inspect whole browser scenes and the previous stage6 fix.
- [x] Verify all tests, worker/native parity, scrolling and originals.
- [ ] Publish multiarch image and pin its verified digest.
