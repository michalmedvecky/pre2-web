# Connected terrain and high-resolution HUD

This correction replaces the level-one terrain color composition and adds a complete HD HUD. Use **H** or **Original / HD**. The original mode and all recovered indexed assets are unchanged.

## Why the previous scenery showed squares

The v2 AI texture sheets illustrated tiles independently. Their silhouettes, lighting and stone shapes did not match neighboring tiles. Restoring one physical edge pixel to the original palette and feathering the next seven pixels preserved registration but did not make those independently drawn interiors continuous. The saved [previous screenshot](../hd-v2/review/environment-hd.png) demonstrates the artifact.

`dist/js/terrain.js` now enlarges the assembled native indexed terrain with two neighbor-aware Scale2x passes. This reconstructs continuous native contours across tile boundaries. `HDCompositor.terrain()` draws world-aligned, cached 64×64 native-pixel regions, each built with a 16-pixel neighbor halo. It extracts only a subtle high-frequency luminance residual from the saved AI tile textures, limited to ±16%, and fades that residual at atlas cuts. The base terrain colors, outlines and topology come from the connected native map instead of the incompatible AI tile drawings. This deliberately favors faithful continuous shapes over the former independently painted rocks. It is not a newly AI-painted whole-level image.

- Transparent terrain stays transparent; contour interpolation can move visual contour coverage by less than one native pixel. Gameplay collisions continue to use the original map.
- Neighboring cache regions produce the same pixels as one uninterrupted upscale; their halos prevent cache-boundary seams.
- Region signatures include neighboring tile lookup values. Revealing steps, breaking walls and opening routes invalidates the affected regions and their neighbors without retaining stale scenery.
- The cache keeps up to 48 regions (about27 MiB of RGBA storage before browser overhead); it is cleared on palette changes and uses world coordinates, independent of camera smoothing. Texture-detail arrays are cached separately.
- The foreground layer still composites after actors. Existing background art, characters and pickups remain in use. Connected terrain is scoped to level1; the new HUD covers all16 worlds.

## HD HUD

`dist/js/hd-hud.js` draws a stone panel, the existing HD protagonist's face, outlined serif labels/digits, shaded Bézier full/empty hearts and the five BONUS badges directly at the1280×800 presentation resolution. This is resolution-independent Canvas UI, not an enlarged320×23 bitmap. No new image generation or model call is needed; the portrait uses the already saved v1 art. The original HUD continues to be computed in the native indexed frame for exact parity and Original mode.

Lives retain the existing display clamp0–9, score retains the seven-digit `(score >>> 0) * 10` display, health controls three full/empty hearts, and inventory bits/collection flashing follow the original five slot coordinates decoded from `tables.bin`. The HUD owns no simulation state. It resets the complete panel each frame so lost hearts or disappearing BONUS badges leave no stale pixels.

## Verification and resume checklist

- [x] Compare initial scenery before/after; save Original/HD/sky screenshots in `review/`.
- [x] Unit-test connected region output against a single whole image, including diagonals, transparency, color changes and boundaries.
- [x] Unit-test solid surfaces, source immutability, HUD score/lives/health and all authored inventory positions/flashing.
- [x] Run182 Node tests, including the existing campaign, secret-room and boss replays.
- [x] Browser-test all16 worlds for identical native raster and unchanged simulation in HD/Original modes.
- [x] Check actual HD subpixel detail in the HUD and distinct rendered outputs for health0–3, lives0/2/9, scores, and BONUS flashing.
- [x] Browser-test visible map mutation/restoration, cache invalidation, camera reuse, foreground ordering, lazy loading, both mode switches, persistence, mobile control and failed-load fallback. Results: [browser.json](review/browser.json).
- [x] Measure a5.5-second IDDQD/IDKFA scrolling pass in local headless Chromium; save [performance.json](review/performance.json). This is CPU render-call timing on the development machine, not headset or GPU latency validation.
- [ ] Publish the tested game image, verify both architectures, and update the Kubernetes digest.

Run from the repository root:

```sh
npm test
npm start
# Separate terminal; point this at an available Playwright package if not installed locally:
PRE2_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/verify-hd-browser.mjs
```

No asset rebuild is required for this correction. Existing `build-hd.mjs` then `build-hd-v2.mjs` still reproduce the retained texture sheets; connected terrain and the HUD are runtime presentation code. See [v1 source prompts](../hd-v1/), [v2 source prompts](../hd-v2/prompts.json), and the [VR roadmap](../../docs/VR-ROADMAP.md).

[Original](review/environment-original.png) · [Updated HD scenery and HUD](review/environment-hd.png) · [Sky/transparent terrain](review/sky-hd.png)
