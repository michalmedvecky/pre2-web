# Complete hero and bear HD animation set v1

The opt-in **Original / HD** toolbar button (or **H**) uses these AI remasters in the game. Original is the default. The preference is stored under `prehistorik2-graphics-v1`; it is independent of progress and survives reloads. All original indexed banks remain untouched and selectable. HD download/decoding is lazy; a load failure leaves the original renderer operational.

Later [environment/collectible batch v2](../hd-v2/README.md) extends the combined runtime manifest. This document records the original 92-frame character set. When rebuilding the full current release, also run the v2 builder after the base builder.

## Coverage and provenance

| Set | Native sprite IDs | Frames |
| --- | --- | ---: |
| Hero poses, including rare states | 0–38 | 39 |
| Hero partial-body and glide poses | 39–52 | 14 |
| Separate glider/upper-body attachments | 119–127 | 9 |
| Club, hammer, thrown weapons and tethered axe | 58–69, 235–240, 274–277 | 22 |
| Bear crouch/walk/defeat and emerging/retreating heads | 312–316, 379–381 | 8 |
| **Total** | | **92** |

Native animation streams choose frames and hold durations exactly as before; no extra AI in-between poses affect the rules. Horizontal mirroring reuses the same textures. Body/equipment remain separate layers at original native attachment offsets. Partial body/head sprites are deliberately partial, matching the original multipart forms. Bear food transformations use the original food artwork, not a bear pose.

- `inventory.json`: every frame's original extent, pivot, ink bounds, role and animation streams, plus native source hashes. Bear frame scope follows DS:aac3..aad9 and ab23..ab77; other species that share controller9/10 are not relabeled as bears.
- `references/`: direct exports of unmodified original indexed pixels, grouped in fixed cells. Original source metadata stays authoritative.
- `raw/`: unmodified output of the built-in **image_gen** edit tool. First style study is in `../ai-upscale-v1/`. Original atlas prompts are in `prompts.json`; targeted background/club corrections are in `correction-prompts.json`.
- `packing.json`: exact raw cell/alpha bounds and selected corrections. The cleaned weapons atlas is the base; only sprite58/64 use the corrected wooden-club cells from `club-grips.png`. The earlier raw versions remain preserved.
- `../../dist/assets/hd/`: seven production RGBA atlases and `manifest.json`. Each source rectangle is 4× the original sprite extent and uses the original pivot. Deterministic premultiplied bilinear resampling avoids dark fringes around transparent edges. Runtime images total about 2.6MiB compressed / 25MiB decoded, before renderer caches.

AI redraws are interpretations: small facial, costume, outline and shading details may vary between frames. Normalizing each frame to its original ink bounds preserves foot placement and occupied extents, but does not prove pixel-exact anatomy or perfect temporal consistency. The original renderer remains the fidelity reference. HD colors use authored RGBA art; native palette substitutions still recolor indexed scenery/effects, and do not fully recolor HD textures.

## Rebuild without image generation

From the repository root, with Node20+ and no dependency installation:

```sh
node scripts/prepare-hd.mjs
node scripts/build-hd.mjs
npm test
```

Preparation re-exports original pixels and inventory. Packing requires the saved raw AI PNGs; it performs transparent atlas packing/resampling, not new creative drawing. It fails on missing frames or art in empty cells. It does not replace original banks. Regenerating AI drawings requires the built-in image tool with the saved reference/style inputs and prompts; prompt execution is not needed for a normal checkout or Docker build.

Start `npm start` and open `/hd-preview.html` for side-by-side frame inspection, mirroring and hit-flash checks. The viewer cycles frames for inspection; it is not a gameplay timing demo.

Optional browser integration check (requires an existing Playwright installation and Chromium):

```sh
node scripts/verify-hd-browser.mjs
```

`PRE2_PLAYWRIGHT_MODULE` may point to that installation's `index.mjs`; `PLAYWRIGHT_BROWSERS_PATH` and `PRE2_QA_URL` can select an existing browser bundle and local server. These are optional test dependencies, not runtime or Docker dependencies.

## Verification and resumable checklist

- [x] Generate and retain all seven atlas groups with image_gen, preserving original references and prompts.
- [x] Correct club grip frames58/64 so exposed wood reads as a club; preserve earlier raw attempts separately.
- [x] Pack all92 nonempty frames at native extents/pivots; verify source and output hashes.
- [x] Implement reversible original/HD renderer selection, saved preference, mobile-visible button and failed-load fallback.
- [x] Preserve native raster hashes and HUD pixels in all16 stages with IDKFA enabled.
- [x] Browser-check every HD frame, mirroring, white hit flashes and foreground layering.
- [x] Visually compare raised club and assembled glider against their original-layer counterparts.
- [x] Run all177 Node tests, including existing campaign/secret replay hashes and new asset/scene contracts.
- [x] Browser-check lazy downloads, paused-state preservation, switching, reload persistence and failed-network recovery.
- [x] Measure warm HD rendering in local headless Chromium: 657 samples during a 5.5s level1 run with IDDQD/IDKFA, p95 about1.4ms, max6ms, camera steps at most2 native pixels/frame in the sampled scrolling section. These desktop results are not Quest performance claims.
- [x] Prepare [3D/Quest source contracts](../../docs/VR-ROADMAP.md) and the [missing 3D asset catalog](../vr/asset-catalog.json).
- [x] Publish verified amd64/arm64 image from successful Actions build39272085849; pin its digest in the Kubernetes manifest.
- [ ] Future: actual 360° meshes, rigs, depth geometry, stereo XR renderer and real headset validation; see the roadmap.

No original DOS executable is executed by the art pipeline or browser checks. The web reconstruction is the only running game.
