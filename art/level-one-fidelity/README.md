# Level-one fidelity corrections

This increment corrects three confirmed differences in the playable game. Full static REA/Ghidra evidence remains in the separate analysis workspace; no decompiled sources or DOS executables are included here.

- **Enemy-head bounce:** reset the falling-frame counter after contact, retaining the descending jump lock and jump impulse index. The previous reset restarted jump handling or applied an extra gravity increment. With a descending lock, isolated native-derived trajectories rise10px normally and105px with jump held, relative to the enemy-head contact surface. This corrects bear jumps and the shared generic-enemy contact path.
- **Animated bushes/scenery:** restore the original three-ID tile rotations in every stage, in both Original and HD. Visible animation advances every four normal game updates. These are original pose images, not a generated swaying effect. Collision maps remain unchanged. HD phase variants are cached and reused.
- **Stray foreground fragments:** require the original bit40 foreground flag before reading the overlay binding. Unflagged entries previously added unrelated FRONT artwork, including green fragments near the early raised rock. Genuine foreground occlusion remains enabled.

HD terrain now keeps up to96 cropped256×256 cached region canvases (24MiB RGBA before browser overhead), instead of retaining neighbor halos in every canvas. Multiple variants are kept only for regions containing animated cells. The connected-contour seam correction and the HD HUD remain active.

## Verification / resume checklist

- [x] Compare original binary instructions through the configured REA/Ghidra provider; retain evidence separately and verify54 original files unchanged. No DOS game or emulator execution.
- [x] Run187 Node tests, including native-derived bounce trajectories, all16 input-only campaign completions, selected secret branches and bosses.
- [x] Re-record stage9 including gates19/17 and its boss, plus the bonus-C branch using the moving platform and bird bridge, after the physics correction invalidated their old inputs. Expected completion/gate assertions were retained. Both new routes use ordinary input masks with IDDQD.
- [x] Browser-check all16 stages for Original/HD indexed-raster parity and unchanged simulation, all three visible bush poses, HUD/foreground order, cached phase reuse, map mutation/restoration, graphics switching, mobile control, persistence and load-failure fallback. [Results](review/browser.json).
- [x] Save visual comparisons of the three bush phases and the raised-rock area before any attack, in both graphics modes.
- [x] Sample5.5 seconds of IDDQD/IDKFA scrolling in local headless Chromium: render-call p95 about1.4ms, max17.8ms, sampled camera delta at most2 native pixels per display frame. [Raw measurement](review/performance.json). This includes new animated-region cache generation; it is not a headset/GPU performance guarantee.
- [ ] Publish and verify the new amd64/arm64 image, then pin its digest for Kubernetes.

`npm test` runs the input routes and regression checks. With `npm start` serving the game, `scripts/verify-hd-browser.mjs` runs optional browser verification through an available Playwright package.

## Visual review

Bushes: [Original0](review/bush-original-0.png), [1](review/bush-original-1.png), [2](review/bush-original-2.png) · [HD0](review/bush-hd-0.png), [1](review/bush-hd-1.png), [2](review/bush-hd-2.png).

Raised-rock scenery before any attack: [Original](review/rock-original.png) · [HD](review/rock-hd.png).

Static derivation and web regression tests do not prove frame-perfect original-runtime parity. The original VGA cache's dirty-row/offscreen timing and weather scheduling remain outside this increment. The player's exact reported screen was not captured; the foreground bug was independently reproduced from the authored map and native draw condition. Authentic EXTRA!/star effects during secret revelation were retained.
