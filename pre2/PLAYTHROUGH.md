# Completion and secret-hint coverage

The checked-in [input fixtures](tests/fixtures/playthroughs.json) complete every recovered world using ordinary movement, jump, attack and Down inputs after enabling IDDQD. They start each stage independently in practice mode. No replay teleports the player, adds inventory, directly invokes pickups, injects projectiles or changes boss HP. IDDQD's documented out-of-map rescue remains enabled.

Run all regressions with `npm test`. The playthrough tests reproduce all 16 completions and eight additional branch recordings, check boss defeat and natural keys, and load the exact next world. Fixture runs use the real game assets and controllers.

| World | Verified completion destination |
| --- | --- |
| 1 | 2 |
| 2 | 3; additional bonus route to D |
| 3 | E; additional bonus route to C |
| 4 | 5; additional glider route to B |
| 5 | 6 |
| 6 | 7, including all 19 multipart boss hits |
| 7 | G |
| 8 | 9 |
| 9 | A, including tower and boss |
| A | F, after defeating the final boss |
| B | 5 |
| C | 4 |
| D | 3 |
| E | 4 |
| F | Ending after the final descent |
| G | 8 |

Additional recordings visit all eight passage records in world 1, all seven in E, both rooms and their returns in 8, the 19-block hidden arch and upper room in 3, and the B/C/D bonus entries. C's long sky gap uses repeated enemy-head bounces; B's entrance requires returning with the glider.

All 44 active gate records also have isolated tests that place the player at the authored trigger and press Down to verify destination and camera. This is interaction coverage, not evidence that every record is naturally reachable from the spawn. Every retained authored secret-block record has a bounded hit-resolution and reward-art test; that is separate from physically visiting every secret.

The final candidate was also replayed in headless Chromium using the actual app, renderer and original assets. IDDQD/IDKFA were typed through keyboard events; fixed simulation ticks were then driven through the QA API with animation-frame scheduling paused. Stage and bonus transitions exercised the actual **Keep going** button. Browser evidence/screenshots and the native investigation are maintained outside this web repository in the analysis workspace.

## Corrections found during the audit

- Platform records are 15-byte motion controllers, not min/max coordinate pairs. Direction, signed target speed, acceleration, turnaround duration, rider activation and falling/recovery states now drive their movement.
- Rider contact retains the original rising-platform top-plus-one/velocity-one branch and transfers vertical velocity in the other contact branch. Rising elevators continue carrying their rider instead of dropping them during acceleration.
- IDDQD makes spikes safe to cross instead of repeatedly rescuing the player to the checkpoint.
- Final-boss exit now loads F; the ending follows F's descent.

## IDKFA

Type **IDKFA** during play to toggle hints. The overlay outlines concealed block groups, marks passages with **DOWN**, marks bonus exits and displays up to three arrows toward nearby offscreen hints. Discovered blocks disappear from the overlay. It leaves collision, rewards, keys and discovery unchanged. Like IDDQD, it persists through stage loads in the current run and resets on a new adventure or reload.

Arrows indicate direction, not a walkable route. Some targets need a later return, an enemy bounce or the glider.

## Limits

These are automated, deterministic web-game routes with IDDQD. They do not establish a no-cheat continuous human campaign, 100% collection, a natural route through every alternative gate record, every optional upper-forest branch in world 5, or exact equivalence to a running DOS original. No original executable or emulator was run. Failed route searches were not treated as proof of a game defect; gameplay rules were changed only where code/data or a reproducible controller defect supported the correction.
