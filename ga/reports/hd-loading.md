# Atomic HD presentation

## Follow-up: continuous gameplay after 0.2.1

0.2.1 introduced an unacceptable regression: a cache miss could pause every
new animation frame. Its original test certified absence of SD commits but
did not constrain time spent loading. The local follow-up adds a level-wide
preparation phase (`hd-stage-loader.js`): all scripted actor banks, map/door
regions and supported palette-command contexts are prepared before playing.
Scripted palette changes do not restart preparation. Both stage-wide and actual
initial actor palettes are included; required crops must still exist before
the level becomes ready. Future level textures/palettes have eviction priority.

Display-only ImageBitmaps decode at half source width/height; logical crop
coordinates, pivots and source PNGs remain unchanged. This is a rendering mip,
not regenerated artwork. All renderer/MAP draws use the same coordinate helper.
It reduces pixel memory to approximately one quarter; large originals can be
transiently decoded by the browser, so cache totals are not process RSS bounds.
The app budgets 128 MiB for decoded atlases and 64 MiB for recolored bitmaps,
plus at most 4 MiB for LUTs. Defaults for separately constructed test banks stay
smaller. Palette jobs use larger bounded chunks to avoid excessive timer yields
during initial preparation. The nominal gameplay clock and core are unchanged.

Validation: 152 unit tests; 156 static mode/player/character/stage plans fit
the budgets (max source 88.69 MiB, derived palettes 52.25 MiB, 267 crops).
This static matrix is not proof of every late live palette context or native
DOS equivalence. Actual Chrome with each PNG delayed 450 ms: Stage1 and Stage4
continuous movement/attacks/jumps had zero loading samples and >99% nominal
tick rate; mobile viewport 390x844 with 2P also had zero interruptions. Cold
preparation measured approximately 15–30 seconds. Physical iOS/Safari and a
fresh full-game playthrough are untested. A browser without createImageBitmap
uses original bitmaps and cannot claim the half-size memory measurements.

The atomic display barrier remains a safety net for unexpected missing data;
zero interruptions in these tests is not a claim that unknown contexts can
never wait. Public deployment/release is unchanged by this local work.
Regression script: `tests/hd-stage-browser.mjs`; output location and browser
module/path are configurable with the same environment variables as the older
loading test, plus GA_PLAYERS, GA_MOBILE and GA_STAGES.

## Historical 0.2.1 implementation

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
