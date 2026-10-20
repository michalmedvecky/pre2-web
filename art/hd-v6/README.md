# HD sprite completion, v6

The previous pack covered 298 unique native IDs (painted art plus exact Canvas feedback). Dinosaur frames 349–354, web 317, spiders, other enemy species and bosses still used nearest-neighbour native fallback. This increment replaces all 162 remaining native sprite IDs with newly drawn transparent cartoon art. Combined coverage is all 460 native bank IDs: 385 painted, 77 procedural, with IDs 283/284 in both sets. This is sprite-bank coverage, not a claim that terrain and all backgrounds are newly painted HD.

## Sources and reproducibility

- `references/`: decoded native poses, 4 columns, 256 px cells, row-major. Original indexed pixels and game metadata remain unchanged.
- `inventory.json`: each frame's native dimensions, origin, ink bounds, source hashes and cell mapping.
- `prompts.json`: exact prompts and reference roles for built-in `image_gen`; second input is the established HD hero style reference.
- `raw/`: unmodified generated transparent sheets, retained for later art/VR work.
- `packing.json`: raw hashes, extraction bounds, final cell sizes and placement.
- Final runtime atlases: `dist/assets/hd/v6-actors-*.png`, registered in the HD manifest.

Run `node scripts/prepare-hd-v6.mjs`, then `node scripts/build-hd-v6.mjs` with the saved raw sheets present. Full pack rebuild order: build-hd, build-hd-v2, build-hd-v5, build-hd-v6. Packing retains the native anchors, extents, pose order, animation streams, collision geometry and timing. No original DOS code is executed. HD mode stays optional; Original mode uses the untouched native banks.

HD preview has species animation sets for web, spiders, dinosaurs, snakes, eagles, turtles, cats, pterodactyls, moles and owls. Boss parts remain separate component textures so existing articulation continues.

## Verification checklist

- [x] Inspect raw sheets and packed frames; check transparent edges and missing cells.
- [x] All native IDs have HD coverage; dinosaur/web have subpixel drawn detail.
- [x] Browser checks: new frames, mirroring, white hit flashes, anchors, native raster and simulation parity.
- [x] Fullscreen and all-stage browser regression.
- [x] Original file hashes verified unchanged.
- [x] Publish dual architecture image and update Kubernetes digest after successful build.

AI redrawing preserves poses and proportions through explicit references and native ink fitting, but does not prove exact original artistic identity. Terrain remains the separate connected contour/texture reconstruction described in v5.

Final verification: **228 tests pass**. Browser checks exercise all 162 added painted frames plus 77 feedback IDs, mirrored and white-hit versions; the full HD integration check exercises all 385 painted IDs and all 16 levels. Fullscreen output is pixel-identical to windowed HD; original raster and simulation hashes remain unchanged. See `review/browser.json`, `review/all-stages.json`, `review/fullscreen/browser.json` and screenshots. Native source hashes: all 54 original files unchanged.

Packing uses actual transparent row gaps to avoid cross-row misassignment of small objects; a regression covers the affected collectible/log pair. Tight row/column packing with transparent gutters adds 15.7 MiB of decoded textures for all 162 frames without reducing their fourfold resolution.

Release: code `e27a5f7e246527ba61593bcc65371da734b57a13`, [successful build 39391059075](https://github.com/michalmedvecky/pre2-web/actions/runs/39391059075), independently verified amd64/arm64 GHCR index `sha256:8ecbd0c48a5635bce0a8b2d8853bd8eb2e93720c3a1e78b5ff858d84da159f5c`; both platform configurations identify the tested commit. Kubernetes manifest and README pins updated. No cluster rollout was performed.
