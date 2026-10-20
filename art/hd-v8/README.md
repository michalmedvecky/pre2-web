# Continuous level-one HD materials

v7 was a visual regression: separately painted 16×16 cells disagreed about boulder contours, and matching their edge tones produced rectangular blur bands. Passing raster/state tests did not establish visual quality.

v8 replaces common level-one rock and grass/root decoration with two continuous authored materials. Sampling is anchored in world coordinates across every tile/cache chunk. Repetition uses minimum-error overlap cuts through crevices, selecting source pixels without mirrored repetition or broad color-matching bands. Generated roots are composited over the same wall; only their bottom cutout alpha tapers. Animated foliage is isolated from the existing painted frames, including immediate dark outlines. The rock foreground occluder samples the same world material while retaining its native coverage and draw order.

This is an HD reinterpretation of decorative stones/root placement, **not exact restoration of every native boulder**. The root strip continues over native mixed root/rock tile variants; individual decorative root/stone patches can differ. Native indexed coverage, level silhouette, collision, simulation, secret blocks and Original mode remain independent. Text/flat tiles and brown special objects retain their prior presentation. Other stages' terrain remains original art. Output is still 1280×800; larger displays enlarge it.

Artwork generated with built-in `image_gen`, using decoded original wall/roots and the established HD hero as references. Exact requests: [prompts.json](prompts.json). Unchanged generated sources: [raw/wall.png](raw/wall.png), [raw/roots.png](raw/roots.png). Native reference coordinates and SHA-256: [sources.json](sources.json). Packing hashes, source dimensions and minimum-error seam paths: [packing.json](packing.json).

Rebuild: `node scripts/prepare-hd-v8.mjs`, then `node scripts/build-hd-v8.mjs`. For a complete HD pack rebuild, run v8 after existing v1/v2/v5/v6/v7 builders. Raw generation output is retained separately. No original DOS file is modified or executed.

Comparison at 2048 CSS pixels in true fullscreen: [before](review/reported-view-before.png), [after](review/reported-view-after.png), frozen native raster and simulation identical. These are manually inspected images, not just test outputs. The rejected mirrored and mixed-mask experiments are not shipped.

Verification: **238 passing tests**, all 16-stage HD/native parity checks, all three bush phases, foreground order, secrets/cache mutation, MAP return, mobile and fullscreen mode toggles. Fullscreen cached render p95 approximately 0.6 ms on the test machine; this is not a frame-rate guarantee. See [all-stages.json](review/all-stages.json), [browser.json](review/browser.json), [continuous-browser.json](review/continuous-browser.json). All 54 original files hash unchanged.

- [x] Inspect user-reported regression and reject blur/mirrored variants.
- [x] Retain raw images, prompts, hashes and deterministic packer.
- [x] Inspect comparable fullscreen screenshot and check original simulation/coverage.
- [x] Run tests and all-stage/fullscreen integration checks.
- [ ] Publish verified amd64/arm64 image and update Kubernetes pin.
