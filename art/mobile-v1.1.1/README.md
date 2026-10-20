# Default HD and full-width mobile play

Fresh browsers now start in HD. An explicitly saved Original preference is respected, as is saved HD; failed HD loading retains Original and its usable toggle. Music preference/playback is unchanged.

Touch fullscreen/viewport mode in landscape now fills the entire phone viewport: no side gutters, no cropping of the game or health HUD. The full320×200 frame stretches to the display aspect ratio. This deliberately changes its displayed proportions on a wide phone. Movement controls float over the scene with reduced opacity above the bottom12% health HUD; utility controls remain top-right, at least44CSSpx. The landscape gesture hint is hidden to reduce obstruction. Portrait keeps its fitted playfield and rotation guidance; desktop retains its existing aspect handling.

[Browser results](review/browser.json) assert fresh HD startup, native fullscreen and WebKit fallback viewport bounds, gesture/cheat behavior, MAP click consumption, Original/HD switching and small-phone/tablet layouts. [Landscape](review/chromium-landscape-hd.png). Physical-device acceptance remains unverified; these are desktop Chromium/WebKit mobile emulations. Original/HD art coverage limits are documented in the [all-stage audit](../hd-audit-v15/README.md).

277 Node tests pass; all16 native raster/state/HD checks and desktop fullscreen toggles pass. Fresh-default HD, saved Original/HD across reloads, broken-load fallback, phone/tablet viewport coverage and both ten-tap cheats are verified. Original54 DOS hashes remain unchanged. No emulator or DOS game execution occurred.

- [x] Default HD with saved-choice preservation and usable failed-load fallback.
- [x] Full-width landscape touchscreen presentation and transparent controls.
- [x] Repair D whole-cherry recognition; preserve original raster and collision behavior.
- [x] All-stage gap inventory, diagnostic scenes and music preparation.
- [x] Publish verified amd64/arm64 image and update Kubernetes pin.

Published code `425c71a115b7bcb6d1e8a4aa09bfdb3c6c39b41f`; [successful build 39443374986](https://github.com/michalmedvecky/pre2-web/actions/runs/39443374986); GHCR index `sha256:f623fa6df7b6693fe89c692714e5f4fe83f0ca100188c0a5bc33bc2ab9cdd712`. Both architecture revision labels independently verified. Kubernetes pin updated; no cluster rollout. Source tag `v1.1.1` includes the verified pin. [Publication evidence](review/release.json).
