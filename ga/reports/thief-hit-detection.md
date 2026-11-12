# Potion/food thief hit detection — 2026-11-12

## Finding and change

The port omitted native `AXE3fea–4050`, called on a fresh attack by both player controllers (`3edc` and `3f71`) before the ordinary combo selector. This omission is a concrete cause of character-dependent missed thief attacks. Restored `Simulation.nearGoodsAttack()` and its call in `playerControl()`. No rectangles, collision tolerances, attack damage, item count, movement speed or animation timing were enlarged or changed here.

The native helper scans actors in pointer-array order, not nearest-distance order. Candidate types are 12/13/18/19, and native WORD actor+9 must be nonzero. Floor-adjusted absolute depth must be unsigned `<=10`. Absolute horizontal WORD distance selects combo offset 5 below32, offset2 below64, offset0 below96; at96 or beyond scanning continues. It does not filter facing or airborne Z. Signed16 subtraction/NEG and signed horizontal comparisons are retained, including overflow behavior. The actual hit resolver still independently applies facing, frame rectangles, height, immunity and its tighter depth gate. A selected attack does not imply guaranteed contact.

WORD+9 is **inventory (`magicPots`)**, not the separate health byte+2c. `36ca` initializes thief inventory to floor(script health/4). `276a:27e6` initializes dropped item inventory to zero. Ordinary dropped pots/food therefore do not qualify for this selector despite their port `health=1`. Type12 drops potion18; type13 drops food19. Each accepted hit with positive inventory emits one item/decrements one; empty inventory does not yield another item. This agrees with the independent native AI/drop audit.

## Before/after proof

Actual controlled port simulation, single fresh attack, Stage1 source floor, same positions and source rectangles, active type12 thief with three items:

| Hero | Initial horizontal gap | Previous selection | Native selection | Accepted hit / item |
|---|---:|---:|---:|---|
| Axe Battler |20,30|state5|state10|previous0/0; fixed1/1|
| Tyris |40,60|state5|state7|previous0/0; fixed1/1|
| All three |20|source helper|source helper|1/1 for potion and food variants|

The retained before/fix probe was recorded before editing the runtime. New tests also execute the exact previous combo expression as an explicitly labelled counterfactual, so this comparison remains reproducible after the fix.

## Attack and miss audit

`AXE4051` priorities remain intact: attack+jump special state12; running attack9; airborne attack8; mounted attack delegated to mount5/9. The near-goods combo only affects the ordinary idle/walking attack path. Both players call the same restored selector. Eight focused tests cover distance boundaries32/64/96, depth10/11, floor compensation, behind-target selection, Z independence, inventory-vs-health, first matching actor, removed actors, signed WORD edge cases, preserved branch priorities, P2 selection, magic priority and actual hit/drop regressions.

A broader conditional-input matrix executed126 on-foot cases: all three heroes, ordinary/combo1/combo2/run/air10/air30/special attacks at six gaps. Fifty cases accepted a hit. Every accepted hit yielded exactly one item; every miss yielded zero. These are controlled positional fixtures, not126 independently witnessed original-game situations.

Twenty-four mounted cases exercised all three heroes with chicken10, flag5 flame17 dragon and flag4 fireball16 dragon. Chicken at45 and flame at80 hit/drop once for every hero. Flame at closer35–60 gaps missed the moving thief in this fixture; no artificial drop was added. Fixed-height fireball16 at80 missed the short ground thief, consistent with the retained source-height evidence and existing native projectile regression. Existing tests separately verify flag5 flame contact/drop and ordinary enemy damage using source rectangles.

Unchanged native miss conditions include a thief in knockback/hurt states13/14/17, expired native wait, an attack facing away, depth beyond the actual resolver's gate, or no framebox overlap. The near selector's depth10 window is broader than the ordinary resolver7 window; a candidate at depth8 may select an attack and legitimately miss. When the inventory is exhausted, no additional pot should appear. Original behavior does **not** support emitting pots for every attack button press regardless of contact.

## Browser review

Actual local Chrome, actual `Simulation` and `Renderer`, original and HD assets: captured each hero at its first accepted hit. All six SD/HD screenshots were personally inspected. Actor locations, attack states, pivots and item positions remain shared across graphics modes; switching/rendering leaves the complete simulation state JSON unchanged. Each HD frame renders all three gameplay sprites with zero original-sprite fallback. The thief/item overlaps at contact are present in the source SD image as well. HUD was hidden deliberately to isolate gameplay asset alignment; the first exploratory run exposed an unrelated original HUD portrait and is not claimed as full HUD coverage.

This is conditional browser rendering and port simulation, **not a fresh DOS/native replay** and not a full-game visual review. The previously used temporary DOSBox-X binary is no longer present; no replacement was installed or downloaded. Native conclusions come from exact retained disassembly/decompilation checked against the untouched unpacked module bytes.

## Validation and integration

- `node --test ga/tests/mechanics-thief-hits.mjs`:8/8 PASS.
- Existing source thief/pickup/mount regressions selected from `mechanics-core.mjs`:10/10 PASS.
- Browser:3 hero cases ×2 graphics modes, no page errors, unchanged physics, HD actor coverage PASS.
- Attack matrix:126 on-foot and24 mounted cases, accepted-hit/item conservation PASS.
- The four historical Arcade/Beginner streams diverged after the faithful native fixes. Fresh legal ending streams replaced them; both historical Duel input streams were independently revalidated against the current core. All6 current fixture tests PASS. Prior fixture+SHA were archived; ending statuses and stage expectations remain strict. See `thief-fixture-consolidation.md`.
- Browser was muted and closed; own QA server on5965 stopped. No audio subsystem was instantiated. No preview/deployment/release or original asset mutation.

## Evidence

Research evidence directory: `golden-axe-research/evidence/thief-hit-detection-20261112/` (outside the web Git repository):

- `native-bytes.json`: raw helper/caller/clone initializer slices and SHA256.
- `probe.mjs`, `probe.json`: originally captured before/after near-goods decision and hit outcomes. The original `probe.json` is retained; rerunning the original probe script against the patched runtime would no longer reproduce its old baseline without the explicit counterfactual used by the focused test.
- `attack-matrix.mjs`, `attack-matrix.json`: actual finite legal-input attack sweep; misses retained.
- `browser.mjs`, `browser.json`, `{hero,amazon,dwarf}-{original,hd}.png`: browser capture/proof and reviewed images.

Native unpacked module SHA256: `5f607b28bb4cb2580ecaa627665d17d20775d02f28f75c146d89aad27386ea90`.
Retained all-instructions SHA256: `8a5ca648d5c52b43c4461fa77c9f2c1a3d426b66fb6eadde9adbe8e82a2b4993`.
Relevant retained functions: `1000_3fea.c`, `1000_3e8e.c`, `1000_48cf.c`, `1000_4051.c`, `1000_2ee2.c`, `1000_276a.c`, `1000_26d4.c` under `evidence/mechanics/static/`.

Known out-of-scope difference: ordinary far combo fallback in original P2 differs from P1 (offset4 vs5). This change restores the shared near-goods override only and does not alter ordinary combat combos. No evidence from this audit justifies inflating hitboxes or automatic potion creation.
