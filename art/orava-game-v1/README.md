# ORAVA adventure — release 1.6.0

Type **ORAVA** during play, or choose **Orava adventure** in the pause menu (also usable on touch screens). The mode selects the existing seventeen vocal songs together with the approved shepherd hero, faithful cream dog, bell weapon, stars and Slovak food. Repeat ORAVA, choose Leave Orava, or select MUSIC to restore the native character and weapons. Every reload defaults to the original music and character. Sound on/off remains separate.

## Gameplay

The shepherd uses the original player physics and collision body. Running, jumping, crouching, hurt, defeat and attack use the prepared poses. Original weapons can still be collected/equipped; bells override their attack while ORAVA is active, and the stored weapon is available again on leaving the mode. Hang-gliding retains the original kite and controls with the new body. H's movement and the original level maps remain unchanged.

A seven-tick bell attack releases a real star on tick three, with a synchronized spatial bell event. Stars travel five game units per tick, last at most 52 ticks and are capped at four active shots. They use a 12×10 hit box and defeat vulnerable ordinary enemies through the native scoring/death path, including high-health bears. They also hit hidden blocks. Bosses retain their multi-hit rules; a final-boss hit consumes the star so one projectile cannot drain repeated health. Hit stars produce an eight-tick sparkle burst. Switching out removes stars, bursts and pending attack poses.

The dog is a non-colliding companion. A bounded 128-point trail records the player's actual path and jump height, with a target about 27 units behind. It follows turns and jumps, waits/sits, and resets after level loads, respawns and teleports. It neither attacks nor changes enemy targeting, score or RNG. It can follow a jump in the air as a companion animation; it is not a second physics-controlled player.

## Art and food

`dist/assets/orava/` contains 43 measured sprite records across four alpha PNG atlases. The generation source and standalone animation preview are retained in [orava-sprites-v1](../orava-sprites-v1/README.md). Exact frame rectangles, uniform per-atlas scale, pivots and hashes are in the shipped manifest. Art loads only on first ORAVA selection. Failure leaves the current native mode available; failed loads can be retried.

Native sprite IDs and pickup behavior stay intact:

| Original ID | Original object | ORAVA appearance |
| --- | --- | --- |
| 311 | M bonus/exit marker | Plate of bryndzové halušky |
| 117 | Collectible burger | Bryndzové pirohy |
| 115 | Donut | Orava smoked bacon |

Food keeps its aspect ratio, source scoring and bonus routing. The bonus plate is drawn 42 units wide while retaining the original marker's trigger body. Both HD and original graphics support the replacements, hero and effects; in original graphics the new art is rasterized onto the 320×200 view. Foreground overlays still occlude the new art. The HUD portrait and tally player also use the shepherd.

## Sound

`bells.wav` is the prepared 2.4-second mono synthesized pair of metal bells. It is not a field recording. A dedicated Web Audio HRTF panner places each strike relative to the camera, with a quiet 0.48-second stereo room response and distance attenuation. Stereo headphones give the clearest direction. The game uses the unmodified mono source for positioning rather than a permanently baked stereo pan. At most eight voices remain live; oldest voices are released. Muting affects the bell bus, and leaving ORAVA stops pending/active bells. Standard sound effects and optional music remain independently routed through their existing players.

## Verification

- 374 passing automated tests, including opt-in/reversal, all four stored weapons, exact bell release, one-hit bear defeat/scoring, projectile lifetime/cap, dog trail/reset, pose selection, all asset hashes and single-hit-per-projectile final-boss behavior.
- Chromium and WebKit: real keyboard ORAVA/MUSIC toggles; a live projectile defeating a high-health bear; spatial bell playback; all seventeen stage starts and mixed movement/jump/attack; HD and original graphics; original default with no Orava asset requests after reload; no page errors.
- Chromium mobile: a real touch tap in fullscreen releases the bell/star attack. See `review/browser.json` and raw canvas captures, plus the mobile screenshot.
- The seventeen-song browser regression also passes; original/orchestral tracks and fallback remain covered by their existing tests.
- All 54 protected original files verified unchanged.

Browser automation checks routing and playback state, not a subjective listening evaluation on every speaker/headphone combination. The approved generated animation poses can be refined further without changing the collision rules.
