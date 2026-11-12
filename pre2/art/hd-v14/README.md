# Bonus platforms, HD title/cherries and MAP teleport

Bread now maps vertically over each complete connected semantic object, rather than restarting a full bread drawing in every short pixel column. The previously omitted physical491 left cap and local5 lower lettuce are included. Local banks are stage-specific: B's local2/5 bread identities must not be applied to C's unrelated local0–2. Native footprints still bound the art; source-derived rounded ends are not replaced by full rectangular strips. See [long platform](review/long-bread-hd.png) and [round platforms](review/bread-hd.png).

Complete80×96 cherry patterns are recognized from30 physical map cells. A single transparent image replaces the native pieces as a unit; collectible cherry sprite136 remains separate. The first generated right fruit had a flat asymmetric flank, rejected following user feedback. A targeted imagegen edit made it round. Both raw variants, the original native reference and exact generation requests are retained. See [in-game cherries](review/cherries-hd.png). MENU now has a1280×800 painted title with a small HD badge; browser menu controls replace the original bitmap menu text. Original mode retains the exact native raster. See [title with controls](review/title-hd.png).

MAP now accepts a click/tap in the fitted map to move the player's feet there. CSS size, crop offsets and device pixel ratio are inverted; clicks in letterboxing are ignored. Motion, platform grip, attack/glider state and camera locks are cleared; checkpoint, pickups, score, health and cheat flags are retained. Any key or Back to game dismisses without moving. Opening from pause returns to pause. Pointer quantization at whole-map scale limits placement precision to a few native pixels. [Real window/fullscreen/Retina interaction results](review/interaction.json).

## Contact geometry: observations and deliberate browser adaptation

REA/Ghidra12.1.4 verified the loaded inner.game.exe identity `094404bc9a9fa649e3b4b12015bc2a74f7c69ad78e82a9f8baf30a802923a10b` before interpretation. Retained full Evidence is outside the game repo at `analysis/evidence/bonus-surfaces-20261020/rea.json` with a saved session snapshot.

- Load verification: `ev_913bb1c384d8c72a2c624d5c88a28a77d766613e04c508bb3668e45db3959a47`.
- Floor dispatcher15d91: `ev_09eca57e39648a66e62be703248e542dffbae3a623339cadd23f48cb50d0368e`; observed callback class dispatch, not a generic nonzero-pixel floor.
- Complete bytes16626: `ev_c893c3c165b84861692e240ea484e1ab52b12110efc027ed4383da5c63187bd2`, compared with historical supplemental Ghidra assembly. The default live inventory did not define this function; an exact instruction query at16665 was undecodable. This is recorded rather than presented as a successful fresh function recovery.
- Slope bytes16821: `ev_c6db04d2a92872ea1613cd70ad241f8718d24cfc42aad4561cc5c50bdf082a6c` retain `MOV BL,3; DIV BL`. Saved assembly computes `floor((x &15)/3)`. Native straw489/518 visibly changes one row per column, not a third-row. Source profiles and native arrays: [support-profiles.json](review/support-profiles.json).

**This release intentionally aligns selected B/C/D player contact profiles with original source pixels. It is a browser correction, not proof of DOS runtime equivalence.** Native floor callback classes still decide solidity and speed changes; green leaves remain pass-through. Shared straw IDs and B-only cherry IDs get extracted top-ink profiles and swept vertical contact, plus up to6px following of adjacent slope columns while grounded. Other stages retain their existing slope rules. The simulation, and thus the contact correction, is shared by Original and HD presentation. HD art never supplies collision data.

The old encoded approximation could put the feet several pixels inside a fruit or up to10px away from a straw's visible surface. A basic earlier center drop did not reproduce every reported fall, so it is not claimed as an exact reproduction of the user's particular approach. Tests now drop on every native solid fruit column and perform eight center drops in the real browser; all stay supported. Newly recorded ordinary-input B/C/D completion routes replace old trajectories invalidated by the geometry correction. They complete in710/139/771ticks with original next-stage destinations4/3/2 and health3.

Residual original-runtime question: whether runtime patching/protection or another context changes the observed divisor/contact rules. A bounded optional experiment would, after approval, run an isolated DOS emulator for at most30seconds at the first B straw/cherry, record feet/contact frames and compare initialized slope bytes with their static values. No original game or emulator was executed here.

## Verification and rebuild

262 tests pass, including source profiles, all fruit columns,105 straw walk samples, click mapping/reset, all16 campaign completion fixtures and selected secret paths. [16-stage HD/state/raster checks](review/all-stages.json), [subpixel seam regression](review/scroll/scroll-seams.json), [MAP keyboard behavior](review/map-survey/browser.json), [fullscreen toggles/performance](review/fullscreen/browser.json), and [eight paired Original/HD scenes](review/scenes.json) pass.54 original DOS files hash unchanged. Cached fullscreen rendering recorded p501.5ms/p956.8ms under parallel tests; these are variable render costs, not FPS promises.

After prior packs, run `node scripts/prepare-hd-v14.mjs`, `node scripts/build-hd-v14.mjs`, `node scripts/build-bonus-support.mjs`. Native references and code-generated profiles are reproducible; imagegen outputs are retained immutable inputs. Run all node tests and, with Playwright/server5775 available, `scripts/verify-bonus-updates-browser.mjs`, `scripts/inspect-bonus-v14-scenes.mjs` and existing HD/MAP/scroll checks. An input-only planner generated the new route records; unit replay validates completion without teleport or state edits.

Remaining artwork: static glasses/brackets/straws and other native terrain still use4× source reconstruction. This is not a complete terrain remaster. The painted title/cherries reinterpret highlights/detail while preserving subject/composition. The prior carved LEVEL oval is retained.

- [x] Repair cap/long-platform material coordinates and omitted food cells.
- [x] Add full HD cherry ornament, repair right fruit, add HD title/badge.
- [x] Reconcile visible support, document binary/art discrepancy and test all fruit contacts.
- [x] Add MAP click teleport with keyboard dismissal and Retina/fullscreen tests.
- [x] Replay B/C/D to completion; pass campaign and rendering regressions.
- [x] Publish verified amd64/arm64 image and update Kubernetes pin.

Release: code `6598889334836484ae402b451b3ef17c3019ab29`, [successful build 39428224413](https://github.com/michalmedvecky/pre2-web/actions/runs/39428224413), GHCR index `sha256:21328dd076495533494ac35ca0445ad2d9fb8d85878e2f1182439df11638969f`. Both linux/amd64 and linux/arm64 revision labels independently verified. Kubernetes pin updated; no cluster rollout.
