# Gameplay scene artwork, cherries and smooth banquet traversal

The reported pig in stage B is part of BACK4, not an enemy sprite. A manifest covering all460 sprite IDs therefore did not imply that this visible object was HD. The background audit found six gameplay background types with twelve distinct decoded palette variants. Only stage1 previously selected a painted background.

## Authored assets

Built-in `image_gen` redraws the eleven remaining background variants at high resolution, preserving each original composition and palette. Their records cover every one of the16 stages; shared identical B/C/D and7/G sources share their runtime atlas. Scene1 retains its existing HD art. The pig platter, forests, crystal caves, snow and skeletal valley are now painted backgrounds rather than enlarged DOS pixels. Sprite136 cherries already had a v2 HD drawing; this pass replaces it with a sharper dedicated transparent drawing while retaining its native24×21 anchor/extent. All other sprite IDs were audited against the painted/vector records: no uncovered native sprite IDs were found.

B–D sandwich platforms use one continuous bread/lettuce drawing. The packer removes outer dark padding, chooses a minimum-error horizontal repeat seam, and retains raw art separately. The renderer maps material vertically along complete original opaque runs across tile boundaries, with native connected coverage owning platform shapes. Collision and slope tables are not changed. This reinterprets decorative bread/lettuce details; it is not exact restoration of the original small food pixels.

Sources: [native variant inventory and hashes](inventory.json), [exact generation requests](prompts.json), [raw generated images](raw/), [packing dimensions, raw hashes and seam traces](packing.json). Rebuild with `node scripts/prepare-hd-v10.mjs`, then `node scripts/build-hd-v10.mjs`, after previous pack builders. Run `node scripts/audit-hd-coverage.mjs` for [current coverage](coverage.json).

## Traversal diagnosis

Saved Ghidra assembly0x16821 explicitly computes integer `(x &15)/3`, then adds/subtracts it from the encoded slope offset. This observation explains an authentic quantized support height; it does not by itself prove every perceived traversal defect has the same cause. Physics retain that integer operation. `slopeDisplayY` reconstructs the fractional third-pixel height only for grounded presentation, excludes moving-platform grips, and interpolates through takeoff/landing. The native gameplay clock, support collision, jump impulse, speed changes and RNG are untouched.

A second source of visible stepping was re-rounding the already-filtered camera to one original pixel. Presentation now supplies its fractional camera separately. HD world rendering applies that subpixel translation while restoring the transform before HUD drawing. The indexed renderer retains its previous rounded camera. Tests assert that a1/8-native-pixel camera change alters actual HD world pixels while preserving native raster and HUD pixels, not just metadata.

## Verification and limits

**246 tests pass.** Real-browser checks cover all16 backgrounds, original raster/state parity, all sprite poses, lazy load/fallback, foreground and secret mutation paths, fullscreen toggles, and a complete input-only stageB replay. The B replay reaches the same next stage after558 ticks, with2,232 presentation samples and identical simulation state `ab0d73b1`; hundreds of grounded display samples are fractional. Screenshots of every stage and cherries are in [review/](review/), with [scene/replay/camera results](review/browser.json) and [full regression](review/all-stages.json). The replay clock is paused for reproducibility; its runtime is not an FPS benchmark. Separate fullscreen measurements are in [review/fullscreen.json](review/fullscreen.json). All54 original DOS files remain hash-identical; no original game execution or emulator run occurred.

This is **not a complete terrain remaster**. Native tile artwork remains in stages2–9,A,E,F,G, including some scenery objects embedded in those banks. Menu/world-map/end/gameover bitmap art also remains native. Those gaps are explicitly listed per stage in `coverage.json`; painted background and sprite coverage must not be mistaken for their completion. Static fixture tests do not establish exact original-runtime equivalence of every slope boundary callback. HD remains optional at1280×800.

- [x] Audit sprites separately from whole-scene bitmap objects.
- [x] Complete all gameplay background/palette variants and refresh cherries.
- [x] Paint connected B–D platform material without modifying physics.
- [x] Smooth displayed slope height and HD camera; verify actual pixels and full B route.
- [x] Record remaining native terrain/UI coverage rather than claiming total recovery.
- [ ] Publish verified amd64/arm64 image and update Kubernetes pin.
