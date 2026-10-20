# Fullscreen and continuous HD terrain

The reported level-one scenery issue was reproduced and investigated using the actual Fullscreen API. The original v3 compositor produced exactly the same1280×800 pixels in a window and fullscreen, including after toggling H twice. Fullscreen itself did not disable terrain or background textures. The scene looked coarse because v3 retained an indexed Scale2x×2 base and only a weak luminance residual from the painted tiles, while characters used complete HD artwork.

This update reconstructs continuous color from the connected terrain contours, rather than enlarging hard DOS palette steps. It applies one Scale2x contour pass followed by a small separable reconstruction kernel (sigma0.8 at2×). Color and alpha are premultiplied through reconstruction, then alpha coverage is sharpened to retain readable silhouettes. Fine detail from existing painted tile sheets is retained at up to±32% luminance. Detail at atlas borders is sampled from both neighboring interiors across a16-HD-pixel band instead of fading each tile to its native-colored rim. Both the contour kernel and detail sampling have sufficient neighbor halo to produce identical pixels across cached world regions.

This is a presentation correction using existing art. It does **not** replace the first world with a newly painted continuous panorama. Original silhouettes, recovered palettes/materials and level layout still determine the scene; two protected glyph/sign tiles retain their source artwork. Original mode, collision geometry and the native indexed raster are unchanged. Other stages still have the previously documented partial HD coverage. No asset generation or source-bank edits occurred.

## Verification

- 220 Node tests pass, including material/detail/alpha checks, whole-image-versus-region seam parity, all16 campaign routes and existing graphics regressions.
- [Fullscreen check](review/browser.json): actual fullscreen entry, H to HD, return to window, re-enter fullscreen, Original/HD toggles. All three HD canvas hashes are identical; native raster and simulation hashes are identical to Original. Canvas remains1280×800, CSS image renderingauto and connected terrain cache populated.
- [Broader browser check](review/hd-browser.json): all16 worlds, unchanged native raster/simulation, HUD, three bush poses, cache reuse, visible map mutation/restoration, foreground order, switching/persistence/mobile and failed-load fallback.
- Warm render timing in local headless Chromium: p50≈0.6ms, p95≈1.5ms; warming all three terrain phases≈240ms, with56 cached regions after short scrolling. This is local CPU render-call timing, not a guarantee for every device.

[Original](review/original.png) · [HD fullscreen](review/fullscreen-hd.png) · [HD window](review/window-hd.png)

Run the local server, then:

```sh
PRE2_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/verify-fullscreen-browser.mjs
```

Set `PRE2_QA_OUTPUT` to save screenshots and JSON, and `PRE2_QA_URL` to override localhost5775. No fullscreen mock or CSS-only imitation is used.
