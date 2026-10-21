# Level one: source audit for a 360° reconstruction

2026-10-21. Read-only examination of recovered game data, existing web rules and retained native REA/Ghidra evidence. No DOS executable or emulator was run. This document does not assert original-runtime parity or invent recovered depth geometry.

## Evidence hierarchy

- Observed recovered data: `dist/assets/game.json`, level index0/id1; `level-1.map` (256×49 one-byte map indices), `tiles-1.idx`, `union.idx`, `footer-1.bin`, `tables.bin`, `sprites.idx` and the first level palette.
- Current source: `dist/js/engine.js`, `platforms.js`, `tile-animation.js`, `render.js`. The browser engine is a tested interpretation, not independent evidence for every detail.
- Retained native evidence is outside this repository under `../analysis/`: `ENEMIES-AND-GATES-AUDIT.md`, `ENEMY-COMBAT-AND-SECRETS-AUDIT.md`, `BOUNCE-BUSH-FOREGROUND-AUDIT.md`, `BONE-CONTACT-AND-IDDQD.md`, `PLAYTHROUGH-AND-SECRET-HINTS.md`, `SHAKE-RAIN-CAVES-AUDIT.md` and referenced assembly/evidence bundles. Later corrections explicitly supersede older notes.
- Relevant native entries: 140b7 footer copy, 1408e secret concealment, 1550e passage dispatch, 17fa1..18253 spawn, 17896 buried bear, 1796e patrol bear, 18279/18289 animation segment traversal, 184c6 contact, 18e4b weapon damage, 18e9c defeat, 18804 bone collection, 18bc8/18c84/18d98 hidden terrain, 14afb platforms, 14490/13849 tile animation, 13902 foreground.

## Extent, geography and required route

The complete source is **4096×784 pixels**, not the pilot's first64 columns/32 metres. Start feet(42,672); useful default conversion is X=x/32, Y=(672-y)/32, tile0.5m, full width128m. The 2D data provides no Z. Z depths, cave thickness, backs of objects, room connections into depth and traversal comfort aids must be explicitly authored adaptations.

The level stores separately accessible upper rooms and mountain/low routes in one packed map. A full-map native tile reconstruction was inspected statically (lookup→local/shared indexed tile bank→level0 palette). The native map is rocky brown/grey terrain with narrow green grass caps, repeated rounded stone formations, rising rock mountain, floating grass platforms, column-supported ledges, cave mouths, animated low foliage and a long late chasm. Black transparent areas are background; do not turn every nonzero decorative tile into a solid wall.

| Area | Source ranges / anchors | Required treatment |
|---|---|---|
| Opening lower path | x0..1104, ground y672; first raised block x224..256,y544..576 | Broad traversable grass path, source rocky silhouettes, early secret steps and life, both underground bear trigger regions |
| First lower bowl | x1072..1344, drops toward ground y736 | Preserve drop, return geometry and gate12 branch; avoid the pilot's fabricated x25..27m gap |
| Central mountain | x1312..2464, floor from y736 up toward y448 and down | Continuous climb and authored hidden platforms; upper floating chain; grounded player head clearance |
| Late path/chasm | x2448..3520, y736 down to y576 ledges and tall columns | Preserve actual gaps, moving/falling platforms and optional alternate paths; cannot be replaced by a continuous flat floor if fidelity is claimed |
| Final plateau | x3520..4096, around y576 | Cave gate14 entrance, key at4006,571, locked exit4068,570, checkpoint3124,570 on approach |
| Packed upper-left chamber | around x432..1104,y0..160 | Gate15/16 pair; hanging enemies and food rather than visible outdoor sky |
| Packed upper-middle area | around x1632..1952,y0..224 | Gate17/18 pair, upper platform13, life/heart/food cluster |
| Packed upper-right chamber | around x2752..3200,y64..224 plus platforms to x3760 | Gate13/14 pair, jumping enemy and hanging enemy cluster; life at3392..3408,y40..56 in upper route |
| Bottom-right stash | x3552..4096,y704..784 | Authored food, letters and extra lives; preserve lower room floor; do not confuse with normal exit area |

The table labels are geographic descriptions inferred from static map/gate placement, not recovered native room names. Packed upper areas should be represented as separate true 3D cave rooms linked by their authored entrances. A huge solid mountain extrusion should not occlude these caves or overwrite their topology.

The recorded web main route `tests/fixtures/playthroughs.json` stage0 completes in202 ticks via hidden gate19, naturally finds key and exits. This is a genuine shortcut but is **not proof of traversing the entire main path**. Its level0 branch fixture `native-gate-release-rooms-1.json` visits all8 passage records. Future VR tests must separately cover continuous long route, each cave pair, the shortcut, native pickups and exit unlock.

## All eight active passages

Trigger match is the player's FEET tile, packed `(row<<8)|column`, followed by a fresh Down interaction. Gates do not require a key. Native camera bytes affect 2D view only; do not translate fixed-camera flag into locked VR head motion. Preserve fresh-press consumption so an entry cannot immediately trigger its return gate.

| Index | Feet trigger(px) | Destination feet(px) | Interpretation / relationship |
|---|---|---|---|
|12|592,624|1216,736|One-way lower-route transfer; no exact inverse authored record|
|13|3664,112|3648,512|Return from upper-right room to final plateau cave|
|14|3648,528|3664,112|Enter upper-right room from plateau; paired13|
|15|864,128|2016,704|Return upper-left room to lower route|
|16|2016,736|864,96|Enter upper-left room from lower mountain/bowl; paired15|
|17|1760,112|3344,544|Return upper-middle room to late path|
|18|3344,576|1760,80|Enter upper-middle room from late path; paired17|
|19|240,544|3648,496|Hidden opening steps lead to one-way shortcut near final cave/exit|

Entry vs return naming is an inference from start/main-path geography. Destination often lies one/two tiles ABOVE the paired trigger and falls into it; do not require exact destination===return trigger. Gate12 is an authored one-way transfer, not a missing inverse to fabricate.

```json
[
  {
    "index": 12,
    "triggerTileXY": [
      37,
      39
    ],
    "destinationTileXY": [
      76,
      46
    ],
    "triggerPixels": [
      592,
      624
    ],
    "destinationPixels": [
      1216,
      736
    ],
    "fixedCamera": false
  },
  {
    "index": 13,
    "triggerTileXY": [
      229,
      7
    ],
    "destinationTileXY": [
      228,
      32
    ],
    "triggerPixels": [
      3664,
      112
    ],
    "destinationPixels": [
      3648,
      512
    ],
    "fixedCamera": false
  },
  {
    "index": 14,
    "triggerTileXY": [
      228,
      33
    ],
    "destinationTileXY": [
      229,
      7
    ],
    "triggerPixels": [
      3648,
      528
    ],
    "destinationPixels": [
      3664,
      112
    ],
    "fixedCamera": true
  },
  {
    "index": 15,
    "triggerTileXY": [
      54,
      8
    ],
    "destinationTileXY": [
      126,
      44
    ],
    "triggerPixels": [
      864,
      128
    ],
    "destinationPixels": [
      2016,
      704
    ],
    "fixedCamera": false
  },
  {
    "index": 16,
    "triggerTileXY": [
      126,
      46
    ],
    "destinationTileXY": [
      54,
      6
    ],
    "triggerPixels": [
      2016,
      736
    ],
    "destinationPixels": [
      864,
      96
    ],
    "fixedCamera": false
  },
  {
    "index": 17,
    "triggerTileXY": [
      110,
      7
    ],
    "destinationTileXY": [
      209,
      34
    ],
    "triggerPixels": [
      1760,
      112
    ],
    "destinationPixels": [
      3344,
      544
    ],
    "fixedCamera": false
  },
  {
    "index": 18,
    "triggerTileXY": [
      209,
      36
    ],
    "destinationTileXY": [
      110,
      5
    ],
    "triggerPixels": [
      3344,
      576
    ],
    "destinationPixels": [
      1760,
      80
    ],
    "fixedCamera": true
  },
  {
    "index": 19,
    "triggerTileXY": [
      15,
      34
    ],
    "destinationTileXY": [
      228,
      31
    ],
    "triggerPixels": [
      240,
      544
    ],
    "destinationPixels": [
      3648,
      496
    ],
    "fixedCamera": false
  }
]
```

## Secrets, pickups, exit and checkpoints

-56 secret records have the coarse metadata `active`, but8 (indices4..11) have positionFFFF and are sentinels. **48 valid concealed map records** remain. Preserve original map tile as replacement, and conceal with raw byte0. It is not a sprite/pickup number.
- Opening secret records76..79 are tiles(14..15,34..35), concealed126, replacement148/151/168/171. Counter41h: two accepted club hits (six native ticks between accepted hits) reveal the connected four-cell group. Life sprite227 at456,536 is independently authored and visible before discovery. Gate19 feet tile15,34 becomes reachable through this route.
- Other connected hidden groups:44..47 tiles57..58,29..30;48..51 tiles54..55,33..34;52..55 tiles137..138,33..34;56..59 tiles135..136,37..38;61..66 tiles95..97,25..26;67..70 tiles92..93,23..24. Single secret steps72..75 are tiles210,4;208,6;206,8;204,10. Plus isolated destructible records12..19,40..43,60,71. Native connectivity is eight-neighbor flood fill, not only orthogonal adjacency.
-65 active authored item records. Not all are collectible: some are checkpoint/exit/decoration markers. Keep sprite flags and classes, and dispatch as engine pickup does. Do not infer collectible semantics from art alone.
- Key: item64 sprite99/class46, feet position4006,571. Collecting it changes all locked exits sprite278→279. Open exit279/class226 at4068,570 completes to level index1. Locked sprite278 must never complete. No mandatory food percentage or bear-kill requirement is present in this normal exit path.
- Checkpoints: item65(3124,570) and item66(1885,682), sprite281/class228. On contact, activate current marker, restore previous activated marker to idle and set checkpoint to current player feet. They persist as markers rather than disappearing like food.
- Lives: item50(3408,40),51(3392,56),57(4068,713),58(456,536): sprite227/class174, +1 life. Heart226/class173 at(1789,94),(1789,107): +1 health if below3.
- Sprites92..96 are the five collectible letter classes39..43, completion generates native reward. Here visible letters include93 at1809,106;92 at4072,744;95 at4072,728. Do not require a full set to exit.
- Food/art score sprites128..219 use original AWARDS and tables; six collected bones/dust classes0..20 increment one health unit below cap3. Native score bookkeeping is ×10 at display. Bears only drop six recovery bones after harmful contact clears their eligibility bit; undamaged killed bears launch with no recovery bones.
- Weapon pickup103 is class50, part of power collection, **not a replacement club**. Actual weapon map classes13,182,44,224 corresponds sprites66,235,97,277. No active authored first-level static item is one of those weapon pickups. Keep controller club motion already working.
- Sprite284 is a frame of checkpoint/marker animation, not automatically an exit. Source pickup dispatch/animation determines runtime identity.

Full active item inventory (class=sprite−53):

```json
[{"index":4,"x":1809,"y":106,"sprite":93,"class":40},{"index":5,"x":4072,"y":744,"sprite":92,"class":39},{"index":6,"x":3808,"y":704,"sprite":270,"class":217},{"index":7,"x":3794,"y":704,"sprite":245,"class":192},{"index":8,"x":3780,"y":704,"sprite":254,"class":201},{"index":9,"x":3766,"y":704,"sprite":255,"class":202},{"index":10,"x":3752,"y":704,"sprite":244,"class":191},{"index":11,"x":3721,"y":704,"sprite":252,"class":199},{"index":12,"x":3708,"y":704,"sprite":252,"class":199},{"index":13,"x":3694,"y":704,"sprite":245,"class":192},{"index":14,"x":3680,"y":704,"sprite":263,"class":210},{"index":16,"x":3912,"y":744,"sprite":204,"class":151},{"index":17,"x":3880,"y":744,"sprite":203,"class":150},{"index":18,"x":944,"y":536,"sprite":103,"class":50},{"index":19,"x":3808,"y":744,"sprite":198,"class":145},{"index":20,"x":3776,"y":744,"sprite":197,"class":144},{"index":21,"x":3736,"y":744,"sprite":196,"class":143},{"index":22,"x":3696,"y":744,"sprite":195,"class":142},{"index":23,"x":3664,"y":744,"sprite":194,"class":141},{"index":24,"x":3744,"y":72,"sprite":112,"class":59},{"index":25,"x":3600,"y":73,"sprite":113,"class":60},{"index":26,"x":1678,"y":107,"sprite":176,"class":123},{"index":27,"x":1696,"y":76,"sprite":172,"class":119},{"index":28,"x":1722,"y":62,"sprite":170,"class":117},{"index":29,"x":536,"y":56,"sprite":182,"class":129},{"index":30,"x":560,"y":75,"sprite":184,"class":131},{"index":31,"x":587,"y":104,"sprite":185,"class":132},{"index":32,"x":616,"y":120,"sprite":186,"class":133},{"index":33,"x":640,"y":120,"sprite":187,"class":134},{"index":34,"x":688,"y":120,"sprite":189,"class":136},{"index":35,"x":664,"y":120,"sprite":188,"class":135},{"index":36,"x":1768,"y":41,"sprite":153,"class":100},{"index":37,"x":1906,"y":94,"sprite":146,"class":93},{"index":38,"x":1816,"y":56,"sprite":136,"class":83},{"index":39,"x":1856,"y":75,"sprite":139,"class":86},{"index":40,"x":2784,"y":184,"sprite":212,"class":159},{"index":41,"x":2801,"y":178,"sprite":191,"class":138},{"index":42,"x":2816,"y":188,"sprite":190,"class":137},{"index":43,"x":2788,"y":184,"sprite":189,"class":136},{"index":44,"x":2896,"y":185,"sprite":135,"class":82},{"index":45,"x":2939,"y":185,"sprite":136,"class":83},{"index":46,"x":2982,"y":185,"sprite":137,"class":84},{"index":47,"x":3019,"y":185,"sprite":138,"class":85},{"index":48,"x":3057,"y":185,"sprite":139,"class":86},{"index":49,"x":3088,"y":185,"sprite":140,"class":87},{"index":50,"x":3408,"y":40,"sprite":227,"class":174},{"index":51,"x":3392,"y":56,"sprite":227,"class":174},{"index":52,"x":3370,"y":403,"sprite":182,"class":129},{"index":53,"x":3338,"y":403,"sprite":182,"class":129},{"index":54,"x":3354,"y":388,"sprite":182,"class":129},{"index":55,"x":4072,"y":728,"sprite":95,"class":42},{"index":56,"x":3840,"y":744,"sprite":218,"class":165},{"index":57,"x":4068,"y":713,"sprite":227,"class":174},{"index":58,"x":456,"y":536,"sprite":227,"class":174},{"index":59,"x":2896,"y":544,"sprite":284,"class":231},{"index":60,"x":2880,"y":544,"sprite":283,"class":230},{"index":61,"x":2864,"y":544,"sprite":283,"class":230},{"index":62,"x":2808,"y":544,"sprite":282,"class":229},{"index":63,"x":2848,"y":544,"sprite":283,"class":230},{"index":64,"x":4006,"y":571,"sprite":99,"class":46},{"index":65,"x":3124,"y":570,"sprite":281,"class":228},{"index":66,"x":1885,"y":682,"sprite":281,"class":228},{"index":67,"x":1789,"y":94,"sprite":226,"class":173},{"index":68,"x":1789,"y":107,"sprite":226,"class":173},{"index":69,"x":4068,"y":570,"sprite":278,"class":225}]
```

## Enemies and bear grounding

There are16 authored enemy definitions;13 normal and3 expert-only. Types1/2/4 are hanging hazards/rope enemies,8 jump-trigger enemies,9 patrol,10 rectangular-region emergent ground enemies. At least the type9 seed313 patrol at1534,528 and the three ordinary seed381 regions must be rendered as original upright bears.

| Footer record offset | Type / seed | Source interpretation |
|---|---|---|
|18467|9 /313|Patrol starts1534,528; bounds1534..1616 from extra words; acceleration3/16px per tick, cap48/16px per tick|
|18503|10 /381|Rectangle tile origin9,35, inclusive extents24,8; delay10, target speed16/16px per tick|
|18517|10 /381|Origin15,37, extents18,6; delay20, speed32/16px per tick|
|18531|10 /381|Origin39,38, extents65,6; delay13, speed32/16px per tick|
|18545|10 /381 expert only|Origin55,38, extents74,8; delay20, speed48/16px per tick|
|18559|10 /386|Origin129,44, extents20,2; delay15, speed32/16px per tick; this is a different ground enemy sprite family, not a bear|

**Type10 x_raw/y_raw are NOT pixel positions.** x_raw contains rectangle origin tileX,tileY, and y_raw extents tileWidth,tileHeight. Activation waits `(timer>>2)>=pause`, inclusive rectangle membership, then cycles signed source X offsets120,100,−90,110,−120,40,80,60 (cursor increments before reading, so first100). Search upward at player tileY+4 through ten rows for support with two empty rows above. Ground spawn is feet location. Do not hard-code fixed bears at raw positions8969,2072 outside the map.

Type10 native17896: settle/buried state0→1, then advance segment/state2, timer30. Animation marker enables upright running at authored speed. Every fourth update decrements timer; after roughly120 updates (~4.94s) switches state3/retreat segment, then removes/recycles on marker. Preserve dirt mound, partial emergence and burrowing retreat, with body below the ground during emergence rather than spawning the full body abruptly. Original art heights make the intended phases clear: seed381 is24×5px,38024×11,37924×18, while live312..315 are24/32×24..30px and death31648×40. These sizes are evidence for emergence proportions, not recovered 3D skeleton dimensions.

The bear should stand/walk on its two rear legs, with brown fur, rounded ears, cream/light muzzle/belly, dark nose and large expressive face taken from the source references. A four-footed realistic bear silhouette diverges materially. Its face should turn toward the player without changing controller locomotion semantics. 3D back/side appearance remains authored.

Normal head stomp preserves HP; VY−64 or−224 if jump held, resets fall counter only (not jump lock). Native-derived isolated rise10px or105px. Convert jump/stomp for comfortable3D deliberately and label tuned values; do not claim old pilot jump6.8m/s was native. Club damage25 vs seed381 HP20 means one normal club hit defeats (strict underflow rule hp<0). Patrol HP15 similarly one hit. Side contact health loss authorizes six bones once. Six recovered bones heal one heart, cap3.

## Terrain, platforms, animation and graphics

- Collision: only tilePropertiesX/Y are authoritative. In this level Y-class0=empty,1/2=support/callback,6=lethal(tile28). There are no Y-class5 drop-through floors in level1. `tileSlopes` bytes152=3,154=1,223=2,225=2 are constant pixel offsets under `slopeOffset`, not sloping ramps. Native climbing bit interpretation must not be inferred from decorative tiles.
- Three platforms:13 at1888,127, sprite232, direction2 horizontal, target speed10px/update, turnaround duration50;14 at3487,591 direction0 vertical, speed4, duration87;15 at3217,591 type8 falling, authored delay1, accelerates/waits/recovers as `platforms.js`. Flat meshes must carry player physically, and delayed fall must reset after leaving.
- No moving-block table regions active; no boss in first level.
- Foliage animation: tile groups80,100,120,180,183,200,203,208,212, each three adjacent poses, advance every4 normal updates (~6.07Hz). Use these as native shape/color references for animated3D low bushes. Collision must stay unchanged by presentation animation.
- No map tile in level1 has native foreground bit40. Overlay table entries on unflagged tiles41 at33,34 and36,35 are junk for this use; never render them as fragments. True3D vegetation depth/occlusion is authored separately.
- Use `level.lookup[mapValue]`: <256→local tiles1, >=256→union index−256; lookup256 andFFFF are empty. There are29 local tiles and544 shared union tiles total. Sprite index313 does not mean map lookup313.
- Existing original references: `art/hd-v1/references/bears.png`, `art/ai-upscale-v1/bear-original-native.png`; indexed sprites+game.json contain all460 exact poses/origins. Existing enhanced bear sheet `dist/assets/hd/bears.png` with UV rects `hd/manifest.json.sprites` is a style reference/2D decal source, not a360 model.
- Environment HD: `dist/assets/hd/v2-local.png`, `v2-union-0/1/2.png`, background atlases and manifest `tiles` keys `1:local:N` / `1:union:N` with original-sized masks. `art/hd-v2/references/` gives pre-enhancement contact sheets. `art/hd-v3/` and connected terrain compositor encode seam correction; do not create one separate rectangle texture per visible tile with hard borders.
- Other recovered banks `background-BACK0.idx`, `front.idx`, `hud.idx` provide palette/style references. Background art is a2D sky concept, not depth data. `dist/vr/textures/{grass,earth,stone,bark,foliage}.png` are existing authored repeatable3D materials.

## Proposed reconstruction contract and minimum acceptance

Keep nativeXY labels and source record indices on every3D object. Use separate area IDs for packed chambers; assign authored Z corridors/widths, physically rounded rocks and walkable depth, consistent cave darkness, decorative far terrain and distant sky. Ensure room transforms apply equally to geometry, enemies, pickups, triggers and checkpoint coordinates. Terrain visuals can be smooth merged meshes; maintain collision/reveal source indices separately. Avoid simply extruding a narrow collision strip with flat sprites everywhere: trees/rocks/caves/bears and key gameplay props must be spatially readable from all directions.

Minimum for “complete first level”: full256 columns, long route to authored locked exit, naturally collectible key,2 checkpoints, all8 gate records/room destinations and returns, opening two-hit secret plus life, all48 valid hidden records,65 authored item roles, all13 normal enemy definitions with native activation family,3 platform behaviors, source foliage/color/material matching, damage/bone recovery, pit rescue and restart, clear completion without requiring a bear kill. Preserve controller stick motion/button jump/swing club behavior. Add3D breadth/clearance where headset scale demands it, documenting authored accommodations.

Tests should separately cover source table counts, no sentinel secret construction, type10 region coordinate decoding, emergence→upright walk→retreat→recycle, every gate/return, no held-interact pingpong, key-before-exit and no-key rejection, all major long-route areas, platform carrying/fall recovery, checkpoint rescue in cave/world, connected secret reveal and item collection. Record which tests are true ordinary-input navigation versus direct source-trigger unit checks. Headset stereo/performance/haptics/comfort remain pending a physical Quest test unless actually observed.

### Bounded browser-rule trajectory check

A separate read-only source-data probe executed the reconstructed JavaScript World (not DOS) against the two accepted level0 fixtures. The202-update completion uses gate19 at update119, lands at3648,496 and completes at4052,576. The792-update room fixture visits all eight records but includes an actual IDDQD rescue back to start; it is not a single continuous long-route traversal. Its central climb waypoints before the upper-left cave are feet1275,736→1323,672→1381,640→1431,592→1484,576→1643,528→1783,637→1870,688→1978,736, then gate16 at update781 and gate15 at790. Those are observed fixture snapshots, not a universal optimal path.

An isolated flat-map World probe with ordinary Up input and all enemy/item/secret/platform objects disabled measured rises15px/0.469m with one update held,48px/1.5m with3 updates,64px/2m with5 or9 updates, and60px/1.875m with40 updates held. These integer/two-gravity-path results explain why fixed-ballistic VR jump6.9m/s under14m/s² (~1.70m) does not reproduce the maximum native rise. A comfortable button-driven VR adaptation should allow the recovered2m access requirement (or explicitly alter platform geometry). Native continuous jump hold is not equivalent to one fixed launch impulse.

Y-class2 lands with speedShift1, halving acceleration/friction; it is not a higher collision step. Constant surface offsets1..3px correspond0.031..0.094m and should fit the existing VR0.16m step tolerance. Native hero heights around30..36px at the chosen32px/m scale correspond0.94..1.125m. A1.45m VR body or real headset height may require authored cave ceiling clearance to keep native routes physically navigable; record that as adaptation rather than source geometry.
