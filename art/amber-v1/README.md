# Amber Kingdom — original stage H, release 1.3.0

An original browser-authored adventure based on the approved **Jantarové království** concept: roots → amber hive → tree crown, with bees and a queen. Enter directly from the title screen or the stage picker; the original ending also offers it. The sixteen recovered level definitions and source banks remain unchanged. H is appended at runtime with a separate collision map, indexed fallback bank, sprite bank and HD art.

## Play

Golden platform tops show support. Honey slows grounded running, amber spikes are lethal, and three lanterns save checkpoints. The main route uses ordinary jumps; J and the upper kite route are optional. Bees can be struck or bounced on. The queen has six hits and drops the exit key. The closed hive gate opens after collecting it. Checkpoints preserve defeated enemies, opened caches and queen/key progress, including reloading a saved browser run. Death before taking the dropped key respawns it. Upper branches contain the kite and two breakable honey caches. Honey pots award200 displayed points each. Music reuses the original PRES track; no new music was generated.

**J** starts a stronger ground jump with the original held-jump enemy-bounce impulse (`vy=-224`) followed by the normal held-jump curve. Hold J for full height. It is edge-triggered, cannot retrigger in the air, and does not replace kite flight controls. The existing ordinary jump is unchanged. Replays use bit64 for J while preserving the original six bits.

Type these codes during play:

| Code | Weapon |
| --- | --- |
| IDCLUB | Club |
| IDHAMMER | Hammer |
| IDTOMAHAWK | Tomahawk |
| IDAXE | Double axe |

These equip the four actual original weapon types and retain their attack animations, damage and projectile behavior. The ID prefix prevents normal movement, H and F shortcuts from accidentally starting weapon cheats. Existing IDDQD, IDKFA and MAP remain available.

## Art and construction

`references/approved-concept.png` is the approved design. `prompts/` contains the exact ImageGen prompts. `raw/background.png` and `raw/objects.png` are unmodified generated outputs: a giant-tree panorama and sixteen transparent illustrated objects. `scripts/build-amber-level.mjs` deterministically packs them, removes detached alpha specks and trims the branch cell before the next atlas row begins. `packing.json` records source/consumed hashes and crop bounds. It also builds the independent H data and a quantized Original-mode sprite fallback. No source DOS program or emulator was run; all54 original input files pass hash verification.

HD uses complete platform illustrations placed from the same authored surface records used to build collisions. Small bright edges mark their exact support height. Background parallax is darker to separate it from the amber platforms. The final long crown platform stretches its complete drawing; this is authored surface art rather than a tiled reconstruction. The key-unlocked door adds a dark opening/arrow over the painted gate. The full-size queen and bee illustrations are separate custom actors, leaving native enemy AI untouched.

## Verification and limits

-351 Node tests pass, including the existing sixteen-stage replay suite and14 new tests. `tests/fixtures/amber-route.json` completes H in1380 ticks using only ordinary right/up/attack inputs, with no cheats, glider, teleport, death or checkpoint rescue; the queen is defeated and key/exit collected. A separate85-tick input replay reaches the optional kite via the upper staircase.
- Tests also cover every surface top, honey/spikes, all four weapons hitting the queen, key recovery before pickup, checkpoint/browser persistence, caches, J trajectory and air gating, extended replay round trips, original level immutability and packed image hashes.
- `scripts/verify-amber-browser.mjs` checks the complete input replay in Chromium and WebKit, captures eight route views per engine, verifies HD/Original native-raster and simulation parity, renders the completion panel, and uses actual keyboard J/weapon codes. `review/browser.json` and screenshots retain results. Mobile checks launch H by an actual tap at844×390 and verify default HD and full-viewport fallback layout; they are browser emulation, not physical-phone tests.
- Screenshots were visually inspected for support clarity, atlas contamination and disconnected objects. This does not claim every possible path or combat outcome was manually tested. The optional kite uses the existing flight controller; the main route does not require mastering it. Original mode uses simple authored indexed surfaces rather than the HD illustrations.

Publication evidence is recorded in `release.json` after CI succeeds. This work does not roll out a Kubernetes cluster.

## Published release1.3.0

Game commit`aab8ff023cebe929ecfe8f0093d55ee0680d1374`; successful[build39599733319](https://github.com/michalmedvecky/pre2-web/actions/runs/39599733319). Verified linux/amd64 and linux/arm64 OCI revisions and actual served build.json contents in both image layers. Index digest`sha256:9003da93540c9a3856f3fa3a8d578afe645663c811e8875afa020429af276544`. The subsequent metadata/tag commit carries the verified deployment pin. No cluster rollout was performed.
