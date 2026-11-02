# Atomic HD presentation

Reported: enemies alternate SD/HD and newly revealed map regions first appear SD.
The release 0.2.0 renderer draws original pixels while asynchronous atlases or
palette crops load. Checks of already settled screenshots missed this transition;
browser cache is not required to trigger it.

`hd-frame-presenter.js` stages the entire frame, including presentation sequences,
offscreen. The asset bank records exact atlas and palette dependencies requested
by that draw. Only a ready frame is copied to the visible canvas. While waiting,
the app freezes simulation/sequence ticks and audio, discards elapsed catch-up
time and displays a loading overlay over the last committed frame. No source
animation frame is replaced by a different HD pose. Original mode bypasses this
barrier. A failed request or a wait over 15 seconds reports an error and leaves
the HD toolbar available for an explicit switch to original graphics.

Visible dependencies have eviction priority; existing 64 MiB atlas and 16 MiB
combined palette budgets remain. Next-frame warmup now loads matching base
atlases too, rather than preparing recolors only. This is bounded streaming:
cold actions/regions can still briefly pause to load. No all-game preload or
unlimited memory allocation is introduced. Missing/unsupported source mappings
retain existing renderer diagnostics; this does not certify new palette fidelity.

Validation: 146 unit tests, package SHA verification, and
`tests/hd-loading-browser.mjs`. The browser test delays each HD PNG by 450 ms,
drives Stage1 movement/attacks and a cold Stage4 transition, intercepts actual
display commits and verifies no SD sprite/map loading placeholders reach them.
Consecutive waiting samples must keep the same simulation tick. It also tests
mobile viewport, failed map requests and recovery by selecting original graphics.
The test mutes audio and closes its browser. This is targeted regression testing,
not a fresh complete-game or native DOS equivalence test.

Local QA evidence: `golden-axe-research/evidence/hd-loading-fix/` outside the GA
package. The public deployment stays on 0.2.0 until a new release is deployed.
