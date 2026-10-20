# Transparent level-one environment objects

Reported defects: bushes had flat cropped leaf tips and stone-colored gaps, the LEVEL inscription ended at LEVE, and stakes/carved columns retained opaque black tile corners. v8 isolated green pixels per cell, but could not recover leaves already clipped in those cells. The final L is on local tile 3, outside the two native font exceptions.

The HD renderer now draws complete alpha objects independently of native tile crops. Built-in `image_gen` created one continuous carved column, one three-stake hazard and six complete bush poses (tall/low × three breeze phases). Raw RGBA and exact prompts are retained: [prompts.json](prompts.json), [column](raw/column.png), [spikes](raw/spikes.png), [plants](raw/plants.png). Packing preserves source alpha with premultiplied resampling, including transparent corners and leaf gaps; it does not turn all black pixels transparent. The LEVEL plaque is a crisp Canvas path/text object with rounded transparent surroundings.

Placement is inferred from original map data, not hard-coded screen positions: two validated 3×4 column patterns, two spike cells, the complete 3×2 LEVEL pattern, and leaf clusters across tile boundaries. Adjacent native leaf clusters can be separated into whole bushes; 56 presentation plant anchors result. Three authored poses follow the existing tile animation phase. Roots continue behind the embedded column base instead of leaving another rectangular stone patch. Map fingerprints invalidate both object detection and chunk signatures when secrets/map cells change. No game state is mutated.

Legacy brown special tiles also receive an edge-connected dark-matte mask, composited over the continuous wall. It removes connected dark background patches while retaining enclosed black shadows and a one-HD-pixel ink border. This reduces black corners on root/platform edge tiles; it does not guarantee a clean authored silhouette for every old tile.

Reproduce: `node scripts/prepare-hd-v9.mjs` then `node scripts/build-hd-v9.mjs`. Native reference hashes: [source-hashes.json](source-hashes.json); raw hashes and extraction bounds: [packing.json](packing.json). Run v9 after the preceding pack builders. Raw images are not overwritten by packing.

Scope/limits: this updates level-one HD decoration. Native indexed rendering, physical geometry, hazard collisions, game rules, and Original graphics remain unchanged. The new bushes and column reinterpret original decorative drawing; they are not pixel-exact restorations. Some stepped rock silhouettes, incompatible legacy root/rock motifs and material repetition remain visible. Other levels' terrain is not remastered here.

Verification: **242 passing tests**, real fullscreen before/after captures of all three reported object types, three plant phases, all 16-stage native raster/state parity, foreground ordering, secret/cache mutations, Original/HD toggles, mobile/failure fallback. All 54 original DOS files hash unchanged. Fullscreen cached render p95 about 1.8 ms on the test machine (not a frame-rate guarantee). See [browser.json](review/browser.json), [all-stages.json](review/all-stages.json), [fullscreen.json](review/fullscreen.json).

Visual comparisons: [opening after](review/start-after.png), [opening before](review/start-before.png), [column after](review/column-after.png), [spikes after](review/spikes-after.png). These full screenshots were manually inspected in addition to automated checks.

- [x] Identify clipping, black-matte and missing-letter causes.
- [x] Generate and retain complete transparent assets and animation poses.
- [x] Preserve collision/raster/state, map mutations and interior dark ink.
- [x] Inspect fullscreen captures and run all checks.
- [ ] Publish verified amd64/arm64 image and update Kubernetes pin.
