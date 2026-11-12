# Potion-thief native behavior audit — 2026-11-12

## Result

Corrected the thief AI port at AXE `5456/54d5`. The source intentionally gives thieves fast, short movement bursts separated by long stationary opportunities. We preserved its speed and finite loot. The separate contextual-attack correction is covered by `mechanics-thief-hits.mjs`; that omission explains accepted attacks failing to reach some thieves, rather than a need to enlarge their hit rectangles.

| Native rule | Previous port | Correction |
| --- | --- | --- |
| `5456`: hurt/down returns early only when decision counter `actor+30` is positive | Always returned in states13/14 | Zero-counter actors can choose a new state, matching the branch order |
| `54d5`: direction thresholds use signed previous projected `actor+4b/+4d` | Used current world position minus current camera; ignored Z | Uses cached screen position, including projection height |
| `54df`: entering the flee branch clears inventory `actor+9` immediately | Expiry could leave inventory until the next update | Clears inventory on that decision |
| `298c`: offscreen cleanup follows actor control/movement | Handler could delete before its update | Existing later cleanup remains authoritative |
| `3e8e`: clears the run input before thief dispatch | Flee handler supplied run input | Leaves run input false; native state2 is still selected |
| `64a7`: refresh after RNG, direction and counter assignment | Refreshed before choosing direction | Refreshes the final animation slot |

## Original evidence and limits

Read-only retained disassembly `golden-axe-research/evidence/mechanics/static/all-instructions.txt`, functions `1000_5456.c` and `1000_54d5.c`, and the original unpacked module were examined using the reverse-engineer-anything workflow. Module SHA256: `5f607b28bb4cb2580ecaa627665d17d20775d02f28f75c146d89aad27386ea90`. No original assets or binaries were changed. This audit reuses native evidence; it does **not** claim a new DOS runtime capture or exact wall-clock replay equivalence.

`5456` decrements the wait word on dispatch as well as the IRQ countdown. Its separate decision counter is decremented by the main handler, not IRQ. A movement decision gets `2 + (new RNG & 3)` updates, followed by54 idle decisions while wait remains positive. Types12/13 use the original ±12 movement tables. RNG is sampled for vertical choice **before** the new RNG draw that supplies the decision duration. No new randomness or speed reduction was introduced.

The retained native stage6 empty-thief corner in `golden-axe-research/reports/native-empty-thief55.md` is a real original behavior: both axis probes can fail and the fallback can select direction8. The correction preserves that formula; it does not force perpetual movement or loot.

## Loot

`36a0–36d4` creates type12/13 inventory as floor(script health /4). Beginner health reduction skips these types. Native health byte `actor+2c` is distinct from inventory word `actor+9`. `26d4/271f` emits one potion(type18)/food(type19) per eligible accepted hit and decrements inventory; exhaustion sets wait to0. Item helper `276a/27e6` initializes the spawned item's inventory to0. Existing `dropPickup` already reproduces these rules and was left unchanged.

Thus original thieves do not supply infinite potions. Source stage1 blue thieves have health8,4,8 and inventories2,1,2. A miss, airborne hurt target, invalid depth/facing or exhausted inventory must not invent a drop.

## Checks

`node --test ga/tests/mechanics-thief-ai.mjs ga/tests/mechanics-thief-hits.mjs`: **14/14 PASS**. AI tests cover counter branch order, signed projected cache, expiry, deferred cleanup, finite inventory and preserved native cadence/speed. Attack tests cover all three heroes, blue/green loot, distance bands and native miss conditions.

As a negative control, preloading the exact saved pre-edit `thiefControl` into the same class makes **4/6 AI tests fail** (hurt branch, projected cache, expiry and normal-input recovery); unchanged cadence and loot tests still pass. The working source was not reverted or modified for this check.

Bounded normal-input evidence lives in `golden-axe-research/evidence/thief-native-20261112/normal-input-trace.json`; `replay.mjs` reproduces100 main updates with declared1 IRQ tick per step. Both variants start with hero(100,174), blue thief(112,174), script health8/aux3; attack is pressed at steps0,30,60,90, with no actor mutations after start. Both accept the initial hit and drop exactly one potion. At update4 the old port remains hurt(state13), counter0; the corrected handler selects walk(state1), counter2. The preceding method is retained in `thief-control-before.txt`. The portable test isolates the erroneous unconditional hurt return and asserts the same before/after failure boundary.

No browser, audio process, server or emulator was started by this audit. Full-mode ending replay checks are coordinated by the parent after the shared runtime lock; old exact replay fixtures are not weakened here.
