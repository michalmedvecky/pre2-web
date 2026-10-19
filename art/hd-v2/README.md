# HD environment and collectibles — batch v2

This batch extends the existing opt-in **HD / Original** switch (or **H**). All original indexed banks and simulation rules remain unchanged.

## Delivered scope

- **51 additional sprite frames**: all 31 score-pickup images used by level 1 (food and treasure), four bone orientations, five BONUS cubes, tools/equipment pickups, passage signs and numeric markers. Shared sprite IDs use the new art wherever they occur in other stages. The combined hero/bear/collectible manifest now has143 HD sprite frames.
- **Level1 environment**: 27 local tiles,170 shared-bank tiles and one foreground tile referenced by the initial map. These 198 bindings include 195 enhanced textures; one flat dark fill and two LEVEL lettering tiles retain their original pixels. Revealed terrain whose IDs are not in this set uses the existing original-art fallback.
- **Level1 BACK0** mountain/sky background at 1280×800. Background and tile overrides are scoped to level ID1 so other stages' palettes and scenery are not silently replaced.
- Terrain alpha masks are exactly the original masks enlarged4×. The outermost HD edge pixel retains the original RGB; a seven-pixel feather blends into the new material detail. This preserves registration across adjoining tiles and avoids a broad four-pixel native-color grid. It cannot guarantee that separately generated interior textures are artistically seamless in every arrangement.
- World sprite 282 (the PASS text fragment) deliberately keeps original art because the AI drawing substituted letters. The raw attempt remains saved; it is not used by the game. BONUS lettering and numeric marker references were visually reviewed. HUD, menus, remaining stages' terrain and other monsters are outside this batch.

## Sources and reproducibility

The creative drawing uses the built-in **image_gen** edit tool. `prompts.json` contains all eight full prompts. `references/` are direct native pixel exports. `raw/` preserves the untouched AI outputs, including unused lettering. `inventory.json` records native IDs, dimensions, pivots, referenced tile banks and original source SHA-256 hashes. `packing.json` records generated cell bounds and native registration; production outputs are in `../../dist/assets/hd/` and referenced by its manifest.

Rebuild all HD outputs from saved raw PNGs, with Node 20+ and no external dependencies:

```sh
node scripts/prepare-hd.mjs
node scripts/build-hd.mjs
node scripts/prepare-hd-v2.mjs
node scripts/build-hd-v2.mjs
npm test
```

The v1 builder resets the runtime manifest to the base characters; always run the v2 builder afterward to include this extension. The v2 builder is idempotent and checks source hashes before packing. It supports the RGB background returned by imagegen and the RGBA sprite/texture atlases. Creative regeneration is separate and not required to run or deploy a checkout.

Normal play loads HD textures only when HD is selected. The complete HD set now has 15 atlases and about 46.4 MiB of decoded RGBA texture data before canvas/cache/browser overhead. PNG payloads are smaller. A production 3D/Quest renderer should build its own compressed texture/material set rather than upload all raw sources. These are 2D color references, not recovered depth or PBR materials. Like the character HD art, RGBA textures use fixed authored colors; native palette substitutions do not fully recolor them.

## Verification and progress

- [x] Export and hash original references; generate and preserve eight imagegen outputs and prompts.
- [x] Pack and register 51 additional sprites, 198 terrain bindings and one background.
- [x] Keep flat fill, original LEVEL lettering and the original PASS fragment where AI output is unsuitable.
- [x] Verify every terrain alpha pixel and every adjoining outer edge pixel against the original source.
- [x] Preserve the original indexed raster hash and exact HUD pixels in all 16 worlds with IDKFA enabled.
- [x] Browser-check all 143 HD sprites, mirrored hit flashes, foreground order, original/HD switching, saved preference, mobile control, lazy downloads and failed-load fallback.
- [x] Run 179 Node tests, including campaign/secret input replays and new environment tests.
- [x] Save side-by-side original/HD review images and machine-readable browser/performance results under `review/`.
- [x] Sample scrolling with IDDQD/IDKFA in local headless Chromium: 657 frames over 5.5s, render-call p95 about 1.2 ms, max 1.5 ms; sampled camera delta at most 2 native pixels per display frame. These CPU-side desktop measurements are not headset/GPU latency guarantees.
- [x] Publish and verify amd64/arm64 image from successful Actions build39275924158; pin its digest in the Kubernetes manifest.
- [ ] Future batches: other environments, other enemies/bosses, HUD/menu graphics, and artist refinement of interior tile continuity. These are outside this delivered increment.

## Visual review

[Original level 1](review/environment-original.png) · [HD level 1](review/environment-hd.png) · [HD sky](review/sky-hd.png)

The frame inspector at `/hd-preview.html` now includes the new collectible sets. For actual terrain, select HD in the main game and start level 1. All exported art remains available as a reference for the [future full 360° Quest project](../../docs/VR-ROADMAP.md); depth geometry and 3D meshes still require authoring.
