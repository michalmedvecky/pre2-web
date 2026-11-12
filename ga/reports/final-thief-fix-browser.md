# Final six-mode browser replay — 2026-11-12

All six configurations passed in the actual application and returned to its menu. Frozen runtime manifest: `d11308d84fbd85000d11f639a2e1f45499e391d5474e1e0607568028e0461c4e` (635 files). Every run checked the legal archive's complete simulation dependency hashes before launch and confirmed that the complete runtime manifest remained unchanged afterward.

| Configuration | Recorded input updates | HD world checkpoints | Real presentation phases | Menu return |
| --- | ---: | ---: | ---: | --- |
| Arcade1P |18142|33|33|PASS|
| Arcade2P |19931|32|33|PASS|
| Beginner1P |5732|15|8|PASS|
| Beginner2P |7085|17|8|PASS|
| Duel1P |6606|16|1|PASS|
| Duel2P |1339|3|0|PASS|

The driver launches through the actual options/character-selection UI, then resets the ordinary selected launch to tick0 for exact replay. It feeds recorded ordinary inputs in synchronous batches while the world is paused. Stage transitions, rescue, travel, results and menu return use the actual application's RAF/UI flow and real Enter presses. Therefore this is **batched semantic gameplay replay plus actual presentation integration**, not continuous realtime keyboard gameplay, a new native DOS fullrun or exhaustive animation inspection. Duel2P returns directly to the menu; no intermediate presentation phase was sampled.

Across116 world checkpoints, switching original→HD left world state unchanged. Warmed HD samples contained zero original sprites, original glyphs or original map area, zero failed atlases/delivery fallbacks, and no warmup timeout. All six runs recorded zero page errors and correct final player health/lives. The HD manifest itself still declares palette/color coverage incomplete; these observed render checkpoints do not establish exhaustive artistic completion.

## Actual visual inspection

Eight screenshots were actually viewed, separately from the automated checks:

- `arcade-2p/tick-9065.png`: stage3 knight/door scene.
- `arcade-1p/tick-10183.png`: stage4 terminal platform progression.
- `arcade-2p/tick-18555.png`: final boss and skeletons.
- `arcade-2p/stage-7-rescue-message-3.png`: rescue scene and dialogue panel.
- `beginner-2p/tick-2343.png`: both players, stage2 terrain and HUD.
- `arcade-2p/stage-7-results-score-0.png`: two-player score/rank presentation.
- `arcade-2p/tick-1542.png`: mounted Gilius with P2 in the foreground.
- `duel-2p/tick-667.png`: duel arena/HUD terminal checkpoint.

These samples were legible with expected HD scenery/actors; they do not prove every pose, overlap or intermediate frame is correct. The rescue text screenshot intentionally captures the typewriter at the start of a message.

## Audio scope and cleanup

The driver explicitly selects remastered music rather than typing MUSIC, because remaster is now default. Its short audio-clock probes are **inconclusive**: the paused application's RAF correctly reasserts suspension, producing zero sampling windows in many probes. They are not evidence of silent normal gameplay and are not claimed as per-stage audio validation. Dedicated LEVEL/audio lifecycle and PCM tests provide that authority. No method override or runtime modification was introduced to manufacture a stronger audio result.

All six Chrome instances closed and disposed their audio. Owned QA server127.0.0.1:5968 was stopped; the user's5799 preview was untouched. No deployment or release was performed.

Evidence: `golden-axe-research/evidence/final-thief-fix/{replay-browser.mjs,summary.json,browser/}`. Each configuration directory contains its full report, canvas checkpoints and presentation captures. The earlier conditional AI trace remains a separate100-step simulation comparison with explicitly fixed1 IRQ tick per step; it is not the authority for these default-timing full-mode replays.
