# Stage2 dragon versus potion thief

The reported ordinary dragon shot misses are reproducible, but the source evidence shows a variant limitation rather than a broken mounted hit path. Stage2's two original dragons (`0x3931`:696/272 and `0x3a1b`:880/288) are both type11/flag4 fireball dragons. Their ordinary projectile is too high to hit the low standing thief. **The same dragons can hit the thief with an established running body attack.** All three heroes successfully do so in the existing runtime. No simulation change, low-fireball substitution, enlarged hitbox or automatic potion drop was introduced.

## Source and causal distinction

Read-only native evidence is detailed independently in `mounted-thief-native-followup.md`. `4114` maps mount byte+4a=FF to `269d`/type16 fireball; the other variant uses `2666`/type17 flame. Both spawn44 units above the mount with VZ0 and the source X offsets; type16 retains its height. At equal ground depth, type16's source attack rectangle `[-8,-9,28,20]` ends33 units above the projectile's ground Y (34 above the mount after source Y−1), whereas a standing thief begins27–28 units above its ground Y. Their rectangles do not overlap. Flame's later source frames extend lower and can hit. The ordinary dragon attack frames themselves have width1 and do not constitute a second melee hit.

`40d6–40ea` handles an already running mount differently: state2 becomes state9 with VZ10, bypassing projectile creation. The native state9 dragon frame has attack rectangle `[-58,-51,29,54]`, and this body strike can contact the thief. The retained native flag5 experiment independently includes both a flame contact and a running body contact. Type11 frames/body-strike selection are shared by both variants. Native filtering permits a player-owned mount/projectile to hit a stocked active thief; there is no general mounted prohibition. Knockback states, expired native wait, source depth, facing and actual framebox overlap still gate hits.

## Reproduction

Before any proposed runtime edit, all four simulation dependency files were frozen under research `evidence/mounted-thief-stage2-20261112/before/`. The simulation SHA is `4e856a7b7d9c8994a25f8f88ee51f4553b63c809089014f589033c2f901f215b`. It remains byte-identical to the current runtime. This is a frozen comparison, not a claimed successful fix negative control: the behavior is source-correct before and after the audit.

Fixtures use the actual Stage2 map, the original mount spawn696/272 and thief spawn960/256 (`0x399b`, health12, three items), camera504/152 and original Life Meter5. Player starts beside the mount in walking state; real boarding, camera, AI, movement, attack and collision code then execute. The script queue is isolated at setup. No HP, position, timer, AI, ownership or hit state is patched afterward. Chicken10 and flame-flag5 substitutions are explicitly conditional comparisons: Stage2's source does not spawn those variants here.

Nine ordinary-attack cases (three heroes × chicken/fireball/flame) at controlled one-timer-tick cadence produce:

| Mount/ordinary attack | Axe Battler | Tyris | Gilius |
|---|---:|---:|---:|
| Conditional chicken10 |3 hits/drops|2|2|
| Original fireball11 flag4 |0; stock3|0; stock3|0; stock3|
| Conditional flame11 flag5 |3 hits/drops|2|2|

The same ordinary approach positions the original flag4 dragon near the moving thief. After releasing movement12 updates, double-tapping right establishes state2. Pressing right+attack then produces state9, one accepted body hit, one potion and **zero projectiles** for every hero. This full route passes both at controlled one-timer-tick cadence and at the default timer scheduler. Default-cadence approach length is74 updates for Axe Battler and77 for Tyris/Gilius; controlled cadence uses74/78. The complete ordinary input arrays are retained. These are conditional encounter integrations, not natural full-stage native runs.

A tooling distinction matters: explicit `step(input,1)` experiments must not be handed directly to a default-clock RAF run after many updates because the port retains its fractional clock accumulator. Actual-app browser QA uses the separately generated default-cadence prefix, without modifying the accumulator or gameplay state.

## Checks and scope

`node --test ga/tests/mechanics-stage2-mounted-thief.mjs`:3/3 PASS, covering exact source spawn/variant mapping, nine ordinary attack cases and six successful running strike cases (three heroes × two cadence modes). All accepted stocked contacts emit exactly one item. The frozen and current modules yield identical complete traces in the ordinary, controlled-running and default-running experiments. Existing source attack rectangles and native weapon/body branches remain intact.

Research evidence under `evidence/mounted-thief-stage2-20261112/`: `reproduce{,-current}.json`, `run-body{,-current}.json`, `run-body-default{,-current}.json`, scripts, frozen modules and `comparison.json`. Actual trusted-key browser validation is owned separately; this report does not claim those interactions were performed by this audit. No browser/server or audio was started here.

To hit a low thief while riding the Stage2 fireball dragon, align ground depth, double-tap a direction and keep moving until running, then attack. Grounded magic with available pots can dismount under the native rules; jumping alone is not a source-supported dismount command. Root updates the English controls help accordingly. No release or preview publication was performed by this agent.
