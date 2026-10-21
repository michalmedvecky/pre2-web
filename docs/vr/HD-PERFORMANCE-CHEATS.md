# VR fixes: secrets, readable scores, walking passages, HD art and test cheats

2026-10-21. Applies to `vr/quest-360` only. No DOS executable or emulator was run; all 54 original file SHA-256 values remain unchanged.

## Secret-hit stalls

Previously any increment of `brokenBlocks` caused every terrain/decor chunk to be destroyed and regenerated, including an unchanged map after finishing a reward block. A newly encountered reward also built its per-pixel coloured extrusion during gameplay.

The view now keeps32 cached area/chunk groups, compares the12,544-byte map only after a revision, and rebuilds only chunk keys containing actual changed cells. Both cave and outdoor chunks are prepared before play. All407 object poses, all tile geometries, reward depths, source platforms and score labels are prepared up front. HD atlas textures upload during loading; shader variants are compiled before controls become active.

The source opening secret76 requires two accepted hits and changes four cells in one chunk. The secret14 under the late signal finishes in seven accepted hits; its replacement tile is identical, so it needs no terrain rebuild. In the saved desktop/software-WebGL regression, these sequences took approximately 3.6ms and 1.4ms respectively, reused all unrelated chunk objects and built zero new art geometries. These are local CPU observations, not Quest frame-time measurements.

The opening scene dropped from roughly 379k triangles to 56–60k by replacing per-pixel front/back polygons with HD textured faces plus merged silhouette side walls. Gameplay collision and native reward dispatch are unchanged.

## Readable points

Awards74..90 use crisp512×128 canvas labels with the source AWARDS value multiplied by10. EXIT OPEN and1UP are also prepared before play. The labels follow the current viewer quaternion, ignore native sprite mirror flags and appear in a small floating stack1.8m in front of the viewer, with no depth occlusion. This is presentation UI; it does not relocate the reward or affect collection. Desktop pose comes from the normal camera; XR pose is composed from the current viewer quaternion and rig yaw, avoiding renderer-owned camera feedback into motion.

## Walking through caves

WASD and arrow keys now move relative to look direction. ArrowDown is backward movement, rather than a direct passage action. Walk into the mouth using whichever direction matches the current facing. Controller left-stick movement uses the same world-space direction check. Outdoor mouths face toward−Z, cave return mouths toward+Z, so continuing the same movement after entry leads away from the return gate.

A near-feet source trigger plus movement into the mouth activates the passage. Rearming requires a neutral approach or walking away from the arrival mouth; held movement cannot ping-pong. Right B / desktop G remain explicit alternatives. All paired return mouths are visibly represented. The prompt no longer shows a misleading down arrow.

## HD art and provenance

`build-vr-hd-art.mjs` reproducibly creates `objects-hd.png/json` and `tiles-hd.png` under `/vr/textures/`:

- 407 non-hero poses, all at4× source dimensions with source anchors preserved.
- 90 poses copy the approved web HD RGBA pixels exactly, including their source atlas hashes.
- 317 uncovered poses use the existing connected/edge-aware4× scaler. They are improved raster enlargements, **not newly AI-painted assets**. They do not claim unseen3D detail or production sculpt quality.
- 198 mapped tile IDs use approved HD luminance detail over connected native contour colours, following the web compositor's approach. Padding and inward UVs avoid atlas bleed and stray rectangles. Independently painted RGB tile edges are not allowed to replace the source palette boundaries.

The shapes retain front, rear and silhouette side surfaces. Bears, controller club, forest and terrain depth remain procedural3D meshes. The sprite atlas is2048×4096; the padded tile atlas is1152×1152, with mipmaps and at most4× anisotropy. Actual Quest memory/thermal/GPU acceptance remains pending.

## IDDQD and IDKFA

Desktop: type **IDDQD** or **IDKFA** during play. Physical-key recognition consumes partial cheat sequences, so D/A do not move, Q does not turn and F does not swing while typing. Repeating a complete code toggles it. **F2** or the visible Testování button opens a paused menu with buttons; A/B are also shortcuts inside it.

Quest primary controls require no keyboard: **hold both index triggers** until the short arming vibration (about0.7s), keep holding, then **tap right A three times for IDDQD** or **right B three times for IDKFA**. Release both triggers afterward. Repeat the combination to disable the cheat. Simulation and club attacks pause while entering the code; held movement/A/B must be released before gameplay resumes. The code confirms with another vibration and a visible ZAP/VYP message.

Alternatively, press **Y on the left controller** to open a high-resolution panel in front of the head. While it is open:

- Right **A** toggles **IDDQD**, restores hearts and prevents health loss. Pit rescue still fades and returns to the checkpoint, without spending a spare life.
- Right **B** toggles **IDKFA**: cyan wire volumes mark unrevealed secret blocks; gold beacons mark passages within22m in the current area. It does not break blocks, award items, unlock exits, alter collision or change score/health.
- Left **Y** closes the menu. Release sticks/buttons before resuming. Menu presses are edge-triggered, and held controls on close cannot cause a jump, cave entry, swing or unintended locomotion.

Game time, enemy movement, physics and club hits stop while the menu is open; head tracking and rendering continue. Both settings are shown in the UI and persist across R/B restart for repeatable testing. No browser localStorage or account-wide preference is changed.

## Saved evidence and continuation

- `tests/vr-hd-art.test.mjs`: atlas hashes, all 407 poses at 4× dimensions, exact90-sprite copies of web HD, closed-depth geometry and padded UV bounds.
- `tests/vr-level-one.test.mjs`: direction-independent passage movement, no held-motion ping-pong, invulnerability/pit rescue and reversible non-destructive hints, alongside full source-level traversal/combat tests.
- `tests/vr-magic-input.test.mjs`: trigger arming, triple A/B codes, held-input safety, timeout and release resets.
- `tests/vr-input.test.mjs`: left-Y menu arming/edge behavior independent of right B.
- `scripts/verify-vr-hd-browser.mjs`: both reported secret stalls, unchanged chunk identities, no lazy reward generation, readable labels for four orientations, ordinary arrow-key entry/return, typed codes, desktop menu pause and real Three mocked-XR trigger/triple-A/B codes and Y/A/B menu controls with held-input safety.
- `hd-fixes-validation.json`, `hd-fixes-opening.png`, `hd-readable-score.png`, `quest-test-menu.png`: retained local browser evidence.

All 260 tests pass. Existing full-level WebGL/stereo/B-gate and idle/joystick/jump/physical-club regressions also run before GHCR promotion. Hardware walkthrough, perceived resolution, memory, thermals and comfort must still be checked on an actual Quest.
