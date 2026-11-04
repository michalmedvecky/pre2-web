# HD animation audit 0.2.6

## Result

One confirmed pose regression was corrected: `evillady/20/1`, the alternate mounted attack pose, had a frontal chest and wide split legs instead of the original rear view. The targeted replacement retains source header/indexed hashes, pivot `[15,36]`, duration50 native35Hz ticks, and a single uniform registration. Its projected opaque silhouette is0.956× original width and1.000× height; this is geometry evidence, not a general aesthetic certificate. No attachment/simulation compensation was introduced.

The new painting is bound to exact material metadata in `dist/js/hd-material-annotations.js`. Default palette9 and original palette records42/44 were personally inspected beside native rendering on the AI-reachable chicken attack state, in both directions. All6 pairs used HD for rider and mount, preserved derived alpha exactly, and variants42/44 rejected stale art SHA. Recoloring is still explicitly approximate (`colorCoverageApproved=false`).

## Checks and actual visual review

- Source identity audit:580 painted frames have exact original header/indexed hashes, pivots and durations. The pre-correction full inventory also checked the1 preserved vector frame and581-key source set, with no missing/extra keys.
- Actual Chrome Renderer fixtures:580/580 painted frames, default source palettes,0 SD sprite fallback,0 page errors. All58 contact boards personally reviewed at sheet scale. This does not establish every animation's native temporal behavior.
- Render-only RAF loops:14 actor/mount banks,151 rendered frames over2.5s, original frame-duration ordering at35Hz; all listed walk/run frames observed. Source per-frame contacts and final composite personally reviewed. The saved WebM was not watched as a video.
- Archived normal-input world checkpoint replay:23 unchanged states covering maps1/2/3/4/6/7 plus late Duel map5. Four original/HD contact boards personally reviewed, including camps, mounted enemy, stage3 doors, stage4 bonus, rescue, knight and Death.0 SD sprite/glyph/map fallback. These states do not cover story maps5/8/9.
- Spell assembly:23 actual Simulation-triggered snapshots across all3 casters, original vs HD; all3 composite sheets personally reviewed. Tyris dragon/fire pieces, Axe explosions, and Gilius lightning/cloud show no obvious assembly seam. This checks painting assembly, not original damage/timing.
- Corrected rider:6/6 mounted palette/direction pairs; exact alpha delta0 using runtime-equivalent CPU OffscreenCanvas path; stale-SHA negative controls pass. Material unit tests8/8 pass.

All isolated browser instances were closed. Tests instantiate Renderer without app/audio. Own preview server5893 was stopped after QA.

## Remaining ranked observations

1. No additional confirmed semantic pose defect was found in this bounded pass. Hero/amazon mounted pairs were reviewed against their source and do not share the evillady frontal/rear substitution.
2. Green thief `3/2` bag silhouette is longer/wider than source (~1.34× width). It is a minor style/proportion discrepancy, not a proven gameplay defect; no speculative painting or collider change made.
3. Seven crops have high-alpha pixels at an atlas edge. Four are intentional title logo quadrants. The remaining amazon8/1, heninger3/2 and magic22/0/6 contact review did not establish actual visible clipping; heninger heel is close to its crop boundary. Do not blindly pad every frame.
4. Runtime-observed late Duel Death palette0 remains provisional; this pass supplies no new native DOS proof.

Large logo/spell source pieces exceed the bank fixture's sampling window, so clipped contact previews are not treated as clipping bugs. Fullworld/spell composites provide separate assembly evidence. Geometry ratios prioritize inspection and are not universal pass/fail limits.

## Evidence

Portable summary: `provenance/hd-animation-audit-026.json`.
Detailed local evidence: `golden-axe-research/evidence/hd-animation-026/` (`bank-checks.json`, `geometry{,-final}.json`, `world/`, `magic/`, `motion-checks.json`, `motion-loops.webm`, `targets/rear-variants-checks.json`, `targets/rear-variants.png`).

Conditional AI reachability fixture establishes that evillady can board chicken and naturally reach20/1 via ordinary `Simulation.step({},1)`. It does not establish that a complete unmodified stage spawn route reaches that combination in the original DOS program. No claim of complete native fidelity follows from these visual fixtures.

## Read-only late Duel HUD follow-up

The apparent enemy HP overflow at tick 5126 is present in both the320px original renderer and1280px HD renderer of the same state. Actor IDs, health, positions and camera match the immutable0.2.5 replay. Enemy HP is28+66+28=122; the shared HUD branch attempts31 cells at `64+i*24`, with its last origin at784 beyond the320-wide logical canvas. Both actual PNGs visibly clip at the right edge. This is not an HD-only width regression. No cap, enemy health or renderer code was changed; correct original HUD counting/scaling semantics require native source confirmation. Read-only receipt: `evidence/hd-animation-026/duel-hud-diagnosis.json`.

Resolution after the read-only diagnosis: exact native80-byte HUD count fragment was executed in12 cases, proving an enemy-only maximum9 cells. Root applied that limit in the shared renderer; three focused tests and actual final frozen SD/HD rendering at t5126 pass. Enemy HP stays122 and state JSON is unchanged. See `provenance/duel-hud-026.json` and research `evidence/audit-20261104/duel-hud-final/`.
