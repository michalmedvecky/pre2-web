# HD seams, cave masks and complete bosses — release1.2.1

The v16 inventory proved asset coverage, but did not prove coherent drawing. The user's screenshots showed separately painted contours ending at16px cell boundaries, index6 cavity fills painted as rock, and a final-boss redraw covering only its top112px. These are presentation defects, not missing recovered sprite IDs.

## Repairs

-6: continuous orange-brown bark in world coordinates, including its smaller edge fragments; a whole96×144 native-coordinate tree backdrop at960,1872 replaces the independently painted face/body fragments. Existing animated boss parts retain their native positions and animation. Root joins blend into the adjacent recovered artwork.
-8: the empty dark index6 fill is transparent in HD, exposing the existing painted cavern background. It is not an opaque near-black rectangle. Rock indices and simulation/collision data remain unchanged.
-9/A/F: continuous purple rock and gray-green stone replace cell-local material colors, including compatible foreground overlays. Columns and other architectural pieces retain their separate identities. Broad dark cavities remain opaque black; they must not reveal unrelated crystals from the parallax layer. A small spatial mask distinguishes these cavities from thin decorative cracks.
-A: each pose covers the complete96×176 native region. Its lower64px are identical in all six records, preserving the original static base; a short transition band joins the moving upper part. This fixes the112px cutoff and mismatched independently painted lower body.
-5: continuous tan bark covers the recovered shared trunk core795–800 and connected trunk edges. Separate branches retain their own art; filling their dark exterior with bark would create rectangular protrusions.
-F: light lettering and its outlines are isolated from the previous purple atlas-cell background and placed over the continuous wall. Glyphs keep their existing positions and painted shapes.

## Sources and inspection

Six assets were generated with the built-in ImageGen tool, one call per asset. `raw/` retains unmodified outputs, `prompts/` the exact prompt set, `references/` recovered source views, and `packing.json` source/output hashes. The tree output contains an unwanted backdrop; it is used strictly as a color plate inside recovered connected geometry rather than as an opaque rectangle. No DOS game/emulator was run, and54 original file hashes remain unchanged.

`node scripts/prepare-hd-v17.mjs` recreates native references. `node scripts/build-hd-v17.mjs` packs existing raw artwork and updates the runtime manifest. These commands do not call a model. Runtime sources are `world-paint.js`, `painted-terrain.js` and `hd.js`.

Open `/terrain-review.html` on the local server for deterministic visible browser inspection: stage and scene selectors, camera position, native/HD comparison, pose selection, fractional scrolling and simulation stepping. The main game uses the same World and Renderer. Live browser inspection covered the reported6/8/9/A scenes, multiple boss poses and scrolling; rendered contact sheets cover six views of each of the16 stages. This is visual/rendering inspection, not a new complete gameplay playthrough.

- `review/6-boss.png`, `6-wood.png`, `8-cavities.png`, `9-diagonal.png`, `A-pose-0.png` through `A-pose-5.png`, `5-wood.png`, `F-glyphs.png`: detailed browser captures.
- `review/stage-*.png` and `browser.json`:96 views with equal native raster and simulation hashes between Original and HD.
- `review/world-paint-browser.json`:12 targeted scenes, cache rebuild parity, transparent cavity8 and opaque-black cavity9 pixel assertions.
- `review/scroll-seams.json`:90 synthetic fractional-scroll comparisons with zero mismatches and50 camera positions in each of16 stages.
- `mobile/`: Chromium touch and WebKit/mobile-fullscreen regression results.
-288 Node tests pass, including material selection, chunk-independent coordinates, cavity semantics, stable boss base, isolated lettering and image hashes.

Native repeated motifs and intentional architectural joints are retained where they are part of the design. This release does not claim every artistically interpreted pixel matches the DOS game. Original mode remains available and uses the same unchanged indexed resources and game rules.
