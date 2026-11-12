# Native thief fix: full-mode fixture consolidation

All six legal world replay tests PASS against the current source bundle `062ac1eb6cc2079f7f9e` (simulation SHA256 `4e856a7b7d9c8994a25f8f88ee51f4553b63c809089014f589033c2f901f215b`). No runtime or test assertion was changed during consolidation.

| Mode | Players | Input ticks | Final stageIndex | Status |
|---|---:|---:|---:|---|
| Arcade |1|18142|7|ending-incomplete|
| Arcade |2|19931|7|ending-incomplete|
| Beginner |1|5732|18|ending-incomplete|
| Beginner |2|7085|18|ending-incomplete|
| Duel |1|6606|14|ending-incomplete|
| Duel |2|1339|1|ending-incomplete|

The four Arcade/Beginner streams are freshly generated legal plays after both source-backed thief fixes. Previously valid inputs changed their outcomes; old expected states were not merely rebased against failed runs. The strict original final stage/status requirements were retained, and every new stream reaches its legitimate terminal stage boundary. Beginner1P required a legal stair/run-jump planning repair; Arcade2P required a legal magic input suffix. Those route reports describe the interventions.

Before replacing `tests/fixtures/full-mode-replays.json`, the original bytes and SHA256 were preserved under research `evidence/full-mode-runs/full-mode-replays-before-thief-fix.json` and its `.sha256`. Backup SHA256: `787a5a7ef2c061527a9ef9b55e6ab3b26aa59952a9b7cba1d5f7350dacfc319f`.

The consolidation script independently executed all six streams from constructor Options with the current source. It allowed only `step(input)`, the recorded Continue policy, and `advanceStage()` after a legitimate `stage-complete` or `duel-result`. It checked each contiguous RLE offset, source and asset hashes, source stability before/after execution, world tick count, every terminal boundary, strict final status/stage, and absence of diagnostic cheating. For all four new streams the complete final entity arrays matched their generator archives exactly. Every packed input was decoded and compared with its original object before replay: explicit false and absent fields remain distinct.

Duel preserves the two historical input streams unchanged. Fresh wrappers `thief-fix-duel-{1p,2p}-revalidated.json` record actual current-core final entities and traces, current sources/checkpoint/assets, and historical archive and exact input-row SHA256 provenance. Their prior tick counts, boundaries and strict final player fields were independently checked unchanged. Historical source metadata was not relabelled as current execution.

`node --test ga/tests/full-mode-replays.test.mjs`:6/6 PASS after fixture replacement. Fixture schema, present-mask packing, strict source ending assertions and final player-field assertions remain intact. This is normal-input port integration coverage; it does not establish a full native DOS replay, real-time keyboard operation or visually inspected credits playback.

Research artifacts (outside the web Git repository):

- `scripts/consolidate-thief-fullmode-fixture.mjs`: verification/packing/wrapper generation workflow.
- `evidence/full-mode-runs/thief-fixture-consolidation.json`: per-case boundaries, exact final entity SHA, archive/source/asset hashes and fixture SHA.
- Four source archives: `thief-fix-arcade-1p.json`, `thief-fix-arcade-2p-repair1.json`, `thief-fix-beginner-1p-repair1.json`, `thief-fix-beginner-2p.json`.
- Two fresh Duel wrappers noted above, retaining provenance of `evidence/full-gameplay-026/candidate-prefix-duel-{1p,2p}.json`.

No original files, runtime source, manifest, deployment or release was changed. All owned processes exited; no browser/server was needed for this consolidation.
