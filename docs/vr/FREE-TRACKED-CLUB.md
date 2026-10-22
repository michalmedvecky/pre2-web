# Free tracked club: remove environmental constraints

The rigid environmental weapon experiment is removed. The player reported repeated vibration and stalls at cave mouths and stairs on Quest. The old solver kept a last permitted world pose, searched the swept route back to the desired hand pose and, when embedded, tried up to300 translated candidates. Each candidate tested21 shaft samples against scenery boxes. Its work grew with the gap between the proxy and hand. A displaced proxy could also change the rig-relative swing sample during locomotion. These are source-observed mechanisms consistent with the reported symptoms; no physical Quest trace was captured.

The production club now follows the controller grip directly, including while inside terrain, arch pillars, rails or moving platforms. Static scenery never blocks the club, sends collision rumble or plays contact sounds. The old solver module, scenery collision-proxy collection, contact history and rail collider generation are removed, rather than left as a disabled runtime feature. Body collision, side confinement, floor support and cave transitions remain unchanged.

Existing gameplay strike detection still receives the tracked tip/shaft and requires a qualified physical swing. Enemy damage and secret reveals retain native cooldowns/rewards and their single hit cue. Head impacts, damage, falls, checkpoints, cheats and completion keep their existing haptics. The detailed wooden model, sculpted bears and omission of rails along enclosing walls remain. A deliberate tradeoff is that the club can visually pass through scenery; the hand is never held back by an invisible weapon constraint.

## Regression / resume record

- [x] Actual mock XR grip crosses and remains inside a level-one rail: rendered model origin equals tracked grip; no contact/attack rumble, frames keep advancing.
- [x] Club held inside a cave arch while joystick enters gate14 and returns through gate13; tracked pose remains exact.
- [x] Club held low in terrain while right-A jump and left-stick movement climb the source rock at X18; no fabricated strikes/environment rumble.
- [x] Both head-hit event and tracked-head contact still send both controller pulses.
- [x] All283 game/unit tests pass. The three deleted tests described the abandoned rigid solver.
- [ ] Physical Quest: repeat cave entry/exit and stair jumps with hands low; verify smooth frame time and absence of environmental buzzing.

[New browser evidence](free-club-validation.json). Earlier [rigid-contact evidence](club-contact-validation.json) remains preserved as historical evidence and does not describe current behavior. All seven browser scenarios, workflow checks and image smoke tests are required before release. No DOS executable/emulator was run.

Local release verification: all283 tests and all seven browser scenarios passed. Cave entry/return and the stair jump produced zero pulses in their fixtures, with zero rendered-vs-tracked grip error. Controller combat still defeated the bear with the500-point award; secret reveals, head haptics, underground traversal and bear presentation passed. Workflow lint and whitespace checks passed. All54 original file hashes are unchanged.
