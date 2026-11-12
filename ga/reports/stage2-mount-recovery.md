# Stage2 expired dragon escape correction

The reported screenshot shows a free-looking dragon that could not be boarded.
It does not reveal the actor's RAM state or exact input history. This investigation
reproduced a concrete matching failure: an expired dragon remained on screen
because it inherited a rider's backward-walk flag and the port had omitted the
original escape-navigation branch.

## Original rule and actual defect

The original boarding routine requires a positive mount wait counter. Both IRQ
and the ordinary mount handler decrement that counter, including while occupied.
Knocking off a rider does not restart it. Once it has expired, the free animal
is intentionally no longer boardable: it should flee. Boarding is a close-range
walking interaction, not a jump-on mechanic. See `native-mount-lifecycle.md`.

The old port retained the mount's backward flag after dismount. Its simplified
escape code selected an outward direction, but movement reversed that direction,
so the animal oscillated around the middle of the viewport. It also omitted the
original down/jump obstacle probes and used current ground coordinates instead
of cached projected screen coordinates.

The corrected `Simulation.enemyControl` mount branch follows retained AXE539d:

- Keep the positive-wait decrement and occupied early returns unchanged.
- Clear backward movement once the animal actually begins its free escape.
- Select left/right from cached signed screen X; probe12 units horizontally.
- A valid probe has floor and either no wall or the same level. If blocked,
  probe down12. A valid downward route forces walking; if both probes fail,
  retain horizontal running and request the original jump.
- Write the chosen actor direction before generic control, as AXE540e does;
  otherwise the generic run-turn and refresh ordering introduces another stall.
- Apply native strict cached bounds X>8/X<312 and projected Y>8/Y<192,
  marking lifecycleFD for the normal cleanup pass.

No boarding-distance extension, counter reset, forced boarding, teleport,
or general occupied-mount cleanup heuristic was introduced.

## Reproduced encounter and finite scope

The frozen fixture uses the actual Stage2 map and original rider/dragon spawn
pair at696/272, original Life Meter5, Gilius initially640/256 and camera504/152.
The script queue is disabled only to isolate this encounter. No actor state,
health, RNG, position, ownership or collision values are patched after setup;
the real camera update remains active.

It supplies **354 ordinary semantic input updates**, explicitly calling
`Simulation.step(input, 1)`: a controlled one-timer-tick-per-update experiment,
not wall-clock IRQ timing. The stream first waits270 updates, then approaches
and attacks. Normal AI boards the enemy, walks backward while mounted and the
normal player hit knocks it off. At354, old and new versions agree:
playerHP4, riderHP10, dragonHP4, wait0, no rider and backward=true.

- **Pre-fix:** after200 more idle updates, the dragon remains visible,
  unboardable and oscillating near the viewport center (x668/y260).
- **Corrected:** the next update clears backward movement. The animal takes
  its native downward route around the Stage2 obstacle and exits after40
  updates; normal lifecycleFD cleanup removes it atx504/y288.

The before module was reconstructed from the unmodified branch and verified
against its frozen e75 candidate SHA256
`c6f584e7bf8ae6dac9cda661cf3e76add4b182c390679d7edd760361f8571e07`.
This is a controlled source-map encounter, not a fresh full-stage manual or
native DOS traversal, and not a claim to have retrieved the user's live state.

## Verification

- **242 Node tests PASS**, including8 new mount regressions and all6 existing
  complete world replay fixtures. No old fullmode outcomes were rebaselined.
- New finite tests cover the natural boarding/backward/hit/escape chain,
  direct direction ordering, cached-side selection, both early returns,
  exact floor/wall/level probes, down/jump routes, projected cached bounds,
  lifecycle cleanup, ordinary boarding and unchanged expired/occupied rejection.
- Actual isolated Chrome **before/after encounter cases PASS**, using the
  same354-input fixture and the actual HD renderer. Original Stage2 palette
  commands9/17 are applied for this render-only setup. Both captures render
  without SD sprite/glyph fallback. Knockoff and final before/after screenshots
  were personally inspected. No audio context was created.
- Browser metadata identifies final snapshot
  `4480a17d3e902ea14c1d30ed153fe218d490ed947f33aa7908020626d0d31f6c`.
  The native branch was independently reviewed against retained instructions;
  this task did not execute a new complete original EXE run.

Portable regressions: `tests/mechanics-mount-escape.mjs`,
`tests/fixtures/stage2-mount-recovery.json`, `tests/mount-escape-browser.mjs`.
The browser test optionally accepts `GA_MOUNT_BEFORE_MODULE`; that module must
match the fixture's recorded original SHA. The normal portable run tests only
the corrected module.

Raw evidence: `golden-axe-research/evidence/stage2-mount-recovery-20261112/`:
`frozen-combat-comparison.json`, `browser/checks.json`, before/after PNGs and
the explicitly conditional earlier probes. Browser closed, no audio created,
owned QA server5962 stopped. User preview5799 was not operated by this agent.
