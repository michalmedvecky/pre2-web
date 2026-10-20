# HD v12: remove scrolling terrain seams

While the HD camera moved between native pixels, independently filtered 256×256 terrain chunks produced transient lines at their joins. At integer positions the lines disappeared. A reproducible level-one cave view at camera (800.125, 0.125) isolated the error; the strongest pixel differences lay on chunk boundaries. This was a compositor defect, not a change to cave tiles or the game rules.

`TerrainLayer` now assembles cached chunks at integer coordinates on a transparent offscreen canvas, then filters that single layer under the fractional world transform. A one-native-pixel margin includes neighboring chunks across viewport boundaries in both directions. This applies to level1 and the B/C/D banquet material. Existing chunk generation, cave semantics, decorations and camera smoothing are retained. No new art is generated.

Evidence:

- [Moving cave before](review/cave-moving-before.png), [after](review/cave-moving-after.png): identical fractional camera positions, with the old direct-chunk compositor reconstructed for comparison.
- [Pixel regression results](review/scroll-seams.json):90 fractional/integer samples of opaque and translucent continuous imagery exactly match a monolithic reference;200 real scene samples compare old/new output. Integer-position differences are zero. HUD, original raster and simulation hashes match for each comparison. C's selected region contains no affected joins; it is not evidence of a previously visible C seam.
- [All16-stage checks](review/all-stages.json), [fullscreen checks and measured rendering](review/fullscreen/browser.json).252 source tests pass.54 originals hash unchanged; no DOS execution.

Run the dedicated browser regression with an available Playwright installation:

```sh
PRE2_PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node scripts/verify-scroll-seams-browser.mjs
```

Start the server on5775 first. `PRE2_QA_OUTPUT` changes the evidence destination. This test uses a separate browser and pauses its own clock; its samples are rendering checks, not FPS measurements. The independent fullscreen check measures real elapsed rendering time (recorded cached p501.7ms/p956.5ms under parallel test load; timings vary).

- [x] Reproduce subpixel-only cave stripe.
- [x] Assemble terrain before resampling; include viewport margins.
- [x] Check transparent pixels, horizontal/vertical camera boundaries, stationary parity and all-stage regressions.
- [ ] Publish verified amd64/arm64 image and update Kubernetes pin.
