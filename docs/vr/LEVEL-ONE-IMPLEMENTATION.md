# First-level VR implementation and resumable checklist

Follow-up: [HD/performance/passage/cheat corrections](HD-PERFORMANCE-CHEATS.md) supersede the original presentation details below.

2026-10-21. Branch `vr/quest-360`. This replaces the practice course as the default `/vr/` game. The older pilot remains a regression fixture only.

## Source-to-runtime chain

Read [LEVEL-ONE-SOURCE-AUDIT.md](LEVEL-ONE-SOURCE-AUDIT.md) for the exact source records, native addresses and retained REA/Ghidra evidence references. [BEAR-REFERENCE.md](BEAR-REFERENCE.md) records the upright silhouette and emergence reference frames. No fresh DOS execution/emulator observation was needed or performed.

- `level-one.js`: source `World` instance plus90Hz spatial player, physical combat, near-feet passages, collision, checkpoint/fall lifecycle and level completion. Shared `dist/js/` engine files are unchanged. All native data remains immutable; secret substitutions apply to an instance map copy.
- `level-one-view.js`: native tile atlas, merged source-colour geometry, animated foliage, complete terrain chunks, original item/enemy poses, forest/cave depth, stone cave mouths and source platforms. Upper packed bonus maps are hidden from the outdoor zone; the original camera never drives the XR viewer.
- `bear-model.js`: editable upright two-leg/two-arm model, source colours/face proportions, eight material batches, walking gait, ground clipping for emergence/retreat, hit flash and defeat. Ground bear seed381 is distinct from the normal type9 patrol and non-bear seed386.
- `native-art.js`: closed indexed-pixel extrusions. Equal-colour horizontal runs merge front/back triangles without changing pixels, silhouette holes or source anchors. Map atlas uses the correct local/shared lookup banks. Items/enemies face along the travel axis for legibility; they retain physical thickness and back/edge surfaces.
- `main.js` / `xr-input.js`: retained neutral-armed joystick, A jump, grip-driven club and snap turns; B passage/restart, source-derived wrist objective and transition fade. Relocation events clear club history before sampling the next world sweep.
- `/vr/native`→`../js`, `/vr/assets`→`../assets`: isolated URLs for the existing split 2D/VR ingress. No shared root imports are added.

## Recovered observations versus authored choices

Observed source content:256×49 map,65 item/marker records,48 valid hidden cells,8 passages,3 platforms,13 normal enemy definitions,2 checkpoints, key99, locked/open exit278/279, no boss. The13 definitions include repeated hanging anchors/hazards; this is not13 distinct monster species. The source engine handles activation, animations, byte counters, item effects, inventory, score×10, conditional bones, secret connectivity and platform motion.

Authored3D: depth3.6m, closed terrain and prop thickness, forest backs, cave enclosures/lighting, arch mouths, smooth skeletal bear motion, physical reach, near-feet interaction tolerance, one105cm collision body with a separately tracked head, fixed-ballistic jump and rebound impulses. Map width is4096px/32=128m. Upper-zone threshold256 is a packing interpretation, not an original room label. Source outdoor secret71(row18) stays outdoors. Actors/platforms/effects retain origin-zone tags when rising above the packed-map boundary; otherwise the late elevator or high-secret food could disappear.

The complete first-level content is loaded and playable. This does not mean every optional reward has been collected in one ordinary-input headset run. There are no original3D models to recover; sculpting/rigging non-bear enemies and pickups remains an art milestone. The current original-art extrusions are deliberately documented prototype assets.

## Acceptance evidence

- `tests/vr-level-one.test.mjs`: full source counts/extents, all8 gate destinations, all3 paired room returns with fresh interaction, two-hit opening connected secret, locked exit/key/unlocked completion, emergence/walk/retreat, actual contact versus untouched bones, health recovery, all3 platforms carrying riders, high outdoor/platform area boundary, cave pit rescue with room-scale offset, game-over/completion B restart, held-jump safety, bear model poses, native indexed mesh bounds and all13 enemy definitions activated by source dispatch.
- Whole outdoor route: ordinary90Hz movement/jump inputs from(42,672), climbs central terrain, separately jumps the late platform chain, collects key and enters exit. Invulnerability is enabled; no gates, position teleports or pit rescues occur. It verifies traversal access, not damage-free combat skill. It does not use the native202-tick secret-gate shortcut as proof of the long route.
- `scripts/verify-vr-level-one-browser.mjs`: default full-level WebGL load, real source-spawned upright bear, rendered bonus cave keyboard entry/return through14/13, full-level stereo rendering and actual mapped Quest B entry/return, no failed requests/page errors, source counts and draw-call guard. Gate placement uses direct QA fixtures and is labelled accordingly.
- `scripts/verify-vr-xr-browser.mjs`: real Three stereo/grip code with a deterministic test WebXR session; idle stability, joystick stop/start, A jump, tracking loss/recenter, physical grip sweep hit and vibration request. Uses the old practice fixture to keep hardware-control regression independent of new source AI timing.
- Existing native-engine, asset, HD, replay, platform and gate tests continue unchanged.

All249 tests pass. Original-file integrity:54/54 SHA-256 values unchanged, verified read-only. Summary: `level-one-validation-summary.json`.

Saved browser evidence: `level-one-validation.json`, `level-one-bear.png`, `level-one-cave.png`, `level-one-opening.png`, `level-one-stereo.png`; XR evidence: `level-one-xr-validation.json`. Software-rendered counts are diagnostic only. There is no physical Quest frame-time/haptics claim.

## Checklist for continuation

- [x] Whole source map replaces practice gap/camp/finish.
- [x] Upright bear and native ground-emergence/walk/retreat families.
- [x] All normal enemy definitions, original pose streams and head bounces.
- [x] Physical club, strict underflow damage, harmful-contact bones, six-bone heart recovery.
- [x] All item records, original bob cadence, score/health/lives, key, checkpoints and real exit.
- [x] All48 valid secret cells and connected reveals; original cooldown/durability.
- [x] All8 passages, fresh-press returns, cave separation and fade.
- [x] All3 platforms and player carry; preserve origin zone on elevator ascent.
- [x] Original tile banks/palette, native bush triplets, closed terrain and prop geometry.
- [x] Long outdoor route input completion with no shortcut/fall; separate source-object tests.
- [x] Browser graphics/room regression and mocked stereo/controller regression.
- [ ] In-headset walkthrough: discover every optional secret, life and branch with normal controller inputs; record unreachable cases before claiming full optional-content acceptance.
- [ ] Profile actual target Quest: stereo GPU/CPU time, memory, thermals, load time, dropped frames and platform travel comfort.
- [ ] Test standing/seated height, tight cave ceilings, all360 viewing angles, controller reconnect and pause/recenter on hardware.
- [ ] Replace pixel extrusions with production sculpted/rigged GLB enemies/items and terrain LODs while keeping source IDs/anchors.
- [ ] Integrate original music/SFX rather than current synthetic spatial tones; add headset-native settings/pause menu.
- [ ] Implement VR level2/campaign progression after first-level hardware acceptance. Current first exit finishes the prototype.

Deployment remains the existing GHCR branch workflow; building/publishing an image does not roll out a cluster. Do not modify the independent2D worktree or native analysis files. Verify original-file hashes read-only before closing a source-data task.
