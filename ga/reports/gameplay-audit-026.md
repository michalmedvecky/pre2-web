# Gameplay and restart audit after ga-v0.2.5

Restart during a paused travel/interlude could reset the simulation while keeping
the old presenter and its map. The valid travel fixture then threw `Cannot set
properties of undefined (setting phase)` and stopped RAF; interlude kept rendering
the previous world. Restart also retained opening/interlude completion flags.
`restartGame()` now clears the presenter and both flags, closes overlays/calibration,
then uses the existing Simulation.reset/start. Restart and Playagain share it;
LEVEL's selected initial stage remains intact. No simulation/physics change is
part of this app fix.

Six actual Chrome conditional UI regressions pass on the final frozen candidate:
restart interlude, restart travel, opening on two successive runs, Playagain from
paused game-over, and restarting an explicitly selected LEVEL stage. The fixture
setup is declared; this is not a normal fullmode/native replay. The original0.2.5
failure and earlier invalid/unfinished QA probes remain separate in research.
Portable manual test: `tests/restart-browser.mjs`.

## Fourteen final candidate runs

Frozen runtime `6f5dd207fe67a5b96580bbf0b6e11f56c6fa63a49d72a9e27490b704192c3e2d`,
586files; native-fix simulation SHA
`6ca2e6f98c1e97ae148aca3f21f69b4b44fa0b3bdab13465b04e2cc0a05c589e`.
Every run verifies the same runtime before/after. No individual module is overridden.

| Character / pair | Arcade ticks | Beginner ticks | Duel ticks |
| --- | ---: | ---: | ---: |
| Gilius1P |22174|8306|6606|
| Axe Battler1P |25838|9485|7886|
| Tyris1P |24807|8166|12629|
| Gilius + Axe Battler2P |19223|7923|1339|
| Axe Battler + Tyris2P |—|9473|—|
| Gilius + Tyris2P |—|7209|—|

All14 reached the actual menu through their source-defined terminal path:
**171064 world ticks,340 world checkpoints,183 presentation phases and195
settled RAF presentation renders.** No page errors or settled original sprite,
glyph, base-map or dynamic-cell fallback. All browsers closed/audio disposed.

These are batched legal normal-input Simulation replays in the actual current
app, with real RAF and UI-driven presentation flow. They are not continuous
real-time keyboard gameplay or a native DOS fullrun. Canonical Gilius routes
re-execute archived legal inputs under the new core; every trace was recomputed.
Fresh Hero/Amazon routes use a controller reading the original floor grid and
source movement/physical-depth rules. It never teleports or changes health/state.
Failed navigation/combat experiments remain explicitly recorded (budget, stall,
legitimate game-over); they are not counted as completed modes. All runs use the
original Options LifeMeter5. P2 refusal after death is explicit and P2 is often
eliminated before the end; this is not proof both partners survive the whole game.

## UI and visual review

Seven further actual browser checks pass: MAP restores running/paused state,
typed MAP/Escape preserves pause, MAP selects/teleports player2, fullscreen enters
and exits, and P2 Continue acceptance/refusal consumes the correct shared credit
and clears input. These are declared cheat/conditional death fixtures.
Portable manual test: `tests/ui-edges-browser.mjs`.

Personally viewed baseline Stage8 Death, red mounted dragon/flame, late Duel;
final candidate Hero/Amazon Stage8 Death, corrected late Duel nine-bar HUD, and
early Hero+Amazon combat. The remaining checkpoints are automated, not claimed
as manually inspected frame-by-frame. Physical iOS/Safari/gamepad were not tested.
The source-backed score/combo/HUD and audio/art fixes belong to separate reports.

Before candidate changes, an exact0.2.5 export (all584 hashes) also passed the six
canonical mode/player browser runs (65571ticks/138checkpoints/83presentations),
plus fresh Hero/Amazon Beginner to the menu. The owned baseline5892server is
stopped; root's final5894server was left untouched.

Receipts: `golden-axe-research/evidence/full-gameplay-026/` — final authority
`candidate-browser-summary.json`, individual `candidate-browser*/.../replay.json`,
`restart-frozen-candidate/checks.json`, `ui-edges-portable/checks.json`.
Portable summary: `provenance/gameplay-audit-026.json`.
