# Full-color painted level-one terrain

The reported fullscreen screenshot showed a real rendering gap: the connected terrain renderer reconstructed DOS palette colors and used AI-painted artwork only as a small luminance residual. Characters were genuinely painted, while world surfaces remained enlarged indexed graphics. Fullscreen also magnified this difference.

The renderer now uses full RGB color from the painted terrain, with the original connected world coverage as the independent mask. This preserves holes, slopes, revealed secret blocks and animated map geometry. Tile edge tones are joined while retaining interior gradients rather than stretching fixed pixel columns into blurry bands. Text-bearing LEVEL tiles and flat-color records remain intentional native exceptions.

The old source sheets also required corrected extraction: mathematical row boundaries clipped some cells and captured the beginning of the following row. Packing now finds actual gaps, ignores colored guide artifacts and fits the principal drawn components. Transparent cracks are composited over the dark stone shadow rather than extruding colors into streaks. The old rim-preserving atlases are retained separately for provenance and compatibility; the new paint atlases contain full color without the original-colored rim.

Twelve previously absent lookup tiles (including leaf animation members) are newly painted through built-in `image_gen`. See `references/missing-tiles.png`, `missing-tiles.json`, exact `prompts.json` and unchanged generated `raw/missing-tiles.png`. Existing painted sources are retained under `art/hd-v2/raw/`. `sources.json` records all source hashes and new frame extraction bounds. Final assets are `dist/assets/hd/v7-*.png`; the manifest has **206** painted material records, covering all level-one lookup entries except the intentional text/flat records. All 460 sprite IDs remain covered by v6 and procedural feedback.

Reproduce with `node scripts/prepare-hd-v7.mjs` then `node scripts/build-hd-v7.mjs`, using retained raw art. Full pack rebuild order: build-hd, build-hd-v2, build-hd-v5, build-hd-v6, build-hd-v7. No original source files or collision tables are modified. No DOS game execution is performed.

Verification: unit tests require full RGB rather than a luma modulation, identical connected alpha, exact shared painted edge values and cache-region independence, and coverage of every animation phase. Browser checks compare the reported type of scene at 2048 CSS pixels in actual fullscreen against the previous luma-only rendering, require native indexed-frame and simulation parity, check all 16 levels and three bush phases, and exercise MAP in HD/fullscreen/mobile. `review/reported-view-before.png` and `reported-view-after.png` are comparable frozen views; `painted-browser.json`, `browser.json` and `all-stages.json` retain results.

Scope: level-one surfaces are improved. Other stages' terrain still uses original art; this does not claim a complete environment remaster. Presentation remains a 1280×800 HD canvas, so displays larger than that still enlarge the image. The correction replaces the visibly low-resolution terrain content; it is not a claim of unlimited-resolution textures.

- [x] Inspect full-color terrain and source extraction.
- [x] Complete every level-one terrain animation member.
- [x] Test native coverage/state parity, map/secret mutations and fullscreen.
- [x] Publish a verified amd64/arm64 image and update Kubernetes pin.

Final checks: **234 tests pass**, both complete-map and all-stage HD browser suites pass, and the 2048-pixel fullscreen before/after comparison preserves the native raster and simulation hash. All 54 original files remain unchanged.

Release: code `0d568b47ed8891bdf422d452f275806e6d893191`, [successful build 39395892823](https://github.com/michalmedvecky/pre2-web/actions/runs/39395892823), GHCR index `sha256:a778c47831c9b0c73e368c2273e53d9a213131c54259a14a8080971b3870d345`, with both amd64/arm64 platform revision labels independently verified. Kubernetes manifest and README pins updated; no cluster rollout performed.
