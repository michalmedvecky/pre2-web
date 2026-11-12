# Fresh Beginner1P trace after native thief fixes

Fresh legal-input run reaches `ending-incomplete`, stageIndex18, at5732 simulation steps with Gilius, original Life Meter5, HP20/lives3, zero Continues. This is port integration coverage; it does not claim a native DOS full playthrough or final rendered credits coverage.

The first new bot trace failed at the stageIndex2 stair/gap. Its jump crossed too early and landed inside the gap; repeated falls exhausted lives. The repair uses its unchanged first4100 inputs, a181-input legal route suffix, then the normal bot. Only normal `step(input)`, successful terminal `advanceStage()` and permitted Continue APIs are used. No position, HP, RNG, script, actor, simulation or collision data was patched.

A bounded search on cloned future simulations examined walking and jump input macros and found a route onto floor layer4. The chosen input sequence was replayed from the real initial menu/game state, so clone snapshots are planning tools rather than substituted checkpoints. It moves from278/243/layer1 at4100 through the stairs, reaches310/165/layer4 at4210, double-taps right, runs8 additional updates, then jumps. Recorded positions:336/165/Z0 at4240;378/165/Z78 at4250;408/165/Z48 at4260;430/165/Z0 at4270. End of suffix4281:452/165/layer4, HP20/lives3. This route safely crosses without a fall or health loss. Afterward the normal bot completes stageIndex2 at5451 and the final bonus stage18 at5732.

An independent second execution expanded every RLE entry, checked row offsets, replayed all5732 steps against the archived native-fix source bundle, verified the exact final entity JSON against the generator output and the legitimate `stage-complete`→`ending-incomplete` terminal transition. PASS. The runtime source did not change before/after generation.

Research artifacts (outside the web Git repo):

- `golden-axe-research/evidence/full-mode-runs/thief-fix-beginner-1p-repair1.json`: complete5732-step RLE, traces, final state, source/asset SHA.
- `.../thief-beginner-gap-suffix.json`:181 legal input objects.
- `.../thief-beginner-repair-proof.json`: independent replay assertions and route coordinates.
- `golden-axe-research/scripts/thief-beginner-gap-plan.mjs`: bounded planning, no runtime edits.
- `.../scripts/thief-beginner-replay-check.mjs`: independent full replay checker.

Run archive SHA256: `bfc9629d1fa9d94a8c76e11fa4c90957140cf427057d12e5975be9a7fe89d99e`.
Source bundle: `evidence/full-mode-runs/sources/062ac1eb6cc2079f7f9e/`.
Simulation SHA256: `4e856a7b7d9c8994a25f8f88ee51f4553b63c809089014f589033c2f901f215b`.

The separate consolidation follow-up integrates this successful stream with the other five; see `thief-fixture-consolidation.md`. No runtime or replay-test assertion was changed. All owned command processes exited; no browser/server was started for this follow-up.
