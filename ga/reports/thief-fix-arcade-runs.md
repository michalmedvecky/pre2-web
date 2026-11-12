# Arcade replay regeneration after source corrections — 2026-11-12

Both ordinary Arcade configurations reach the original stage7 script terminal using the corrected simulation. These are deterministic JavaScript integration runs; they do not establish native DOS wall-clock equivalence or visual inspection of every frame.

| Configuration | Ordinary input updates | Terminal | Primary player |
| --- | --- | --- | --- |
| Arcade1P, Gilius, Life Meter5 |18142| stage7, PC7, `ending-incomplete` |20 health,1 life |
| Arcade2P, Gilius/Axe, Life Meter5; P2 declines continues |19931| stage7, PC7, `ending-incomplete` |20 health,3 lives; P2 eliminated |

`ending-incomplete` is the existing simulation's name for the successfully reached Arcade script terminal; this report preserves that actual value rather than claiming a newly completed ending presentation.

Archives in `golden-axe-research/evidence/full-mode-runs/`:

- `thief-fix-arcade-1p.json`: fresh normal-input run.
- `thief-fix-arcade-2p.json`: initial stalled attempt, retained as evidence.
- `thief-fix-arcade-2p-magic-suffix.json`: ordinary P2 magic press followed by150 neutral updates.
- `thief-fix-arcade-2p-repair1.json`: first6300 valid updates from the stalled run, the above input suffix, then resumed planner. Full inputs are expanded into the archive; playback does not depend on recreating planner choices.

The initial2P attempt stalled in stage1 with an enemy-ridden dragon left of the camera and P1 unable to approach through the native player viewport boundary. P2 still held3 magic pots. Pressing P2 magic legally released the encounter; no HP, RNG, actor position or live state was edited. No LEVEL start, cheats or save-state injection was used. Remaining progression includes the game's ordinary stage transitions and explicit continue decisions.

Source bundle: `evidence/full-mode-runs/sources/062ac1eb6cc2079f7f9e/`. `simulation.js` SHA256: `4e856a7b7d9c8994a25f8f88ee51f4553b63c809089014f589033c2f901f215b`. Source hashes before/after generation match. Assets and all imported simulation modules are hashed in each archive.

Independent replay `golden-axe-research/scripts/verify-thief-arcade-runs.mjs` replays only recorded ordinary inputs against the archived source, checks asset/source hashes, and compares **the entire final actor state** to each archive. Both replay checks PASS. No runtime or published fullmode fixture was altered in this follow-up; parent integration owns fixture updates. All generator processes exited, and no browser/audio process was started.
