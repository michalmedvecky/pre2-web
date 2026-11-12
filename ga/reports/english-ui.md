# English game interface

The complete shipped game interface now uses English. Both `index.html` and
the retained historical `hd-pilot.html` declare `lang="en"`. Existing English
text rendered from the original game assets is preserved.

Translated surfaces include:

- Main menu, Options, character selection controls, Pause, Continue/results,
  touch controls, footer, About, graphics/audio edition labels and statuses.
- Both players' controls guide, device-dependent bindings, combat combos,
  running jumps, touch instructions, audio controls and testing cheats.
- MAP instructions, buttons, feedback, invulnerability state and accessibility
  labels; LEVEL instructions, stage/bonus/round labels and errors.
- Missing-gamepad prompts, calibration steps, pointer-lock status, loading,
  HD fallback/error messages, diagnostic notices and build/source identity.
- Historical HD preview page/overlay, clearly labeled as a rejected historical
  pilot rather than the current game artwork.

Sound effects have their own edition selector in Options and Pause, plus a
nonblocking loading/fallback status. These call the audio owner's
`getEffectsEditionStatus()`, `toggleEffectsEdition()` and change callback.
MUSIC still selects only the music edition. Initial labels and aria-pressed
states reflect remastered music and effects being the defaults; live labels
follow actual requested state.

No bindings, selectors, CSS rules, combat, collisions, timing, or lifecycle
logic were renamed or changed for translation. `simulation.js` changes only
three user-facing error/message literals; `renderer.js` changes only two
load-error literals. Their file hashes therefore change despite unchanged
mechanical logic. This matters when comparing old full-run source hashes.

## Verification

- **10 targeted Node tests PASS**: controls mapping/help (3), build identity
  (5), and complete shipped HTML/JavaScript/CSS/JSON English-remnant scan and
  initial remaster language/state checks (2).
- **9 English UI browser checks PASS**: actual live effects selector both
  ways, missing-gamepad status, MAP controls/feedback, LEVEL and Duel round
  labels, guide, mobile portrait390×844 and landscape844×390, and an actual
  intercepted HTTP503 game-data load error.
- **11 existing controls-guide browser checks PASS** with translated
  assertions: actual 2P device swap, mouse bindings, pause/input isolation,
  focus and movement after close, original pause preservation, native
  fullscreen, cached-page lifecycle, character selection freeze and both
  emulated touch orientations.
- Desktop, portrait and landscape screenshots were personally inspected.
  English text is readable, the modal header/close action stays visible,
  and the body scrolls. MAP desktop was captured as an additional artifact.
  These are automated Chrome and emulated-touch checks, not physical
  Safari/iPhone, gamepad, screen-reader, or complete manual playthrough tests.
- The runtime scan covers Czech accented letters and common unaccented
  Czech UI words, alongside explicit visible-text/aria/title inspection.
  It is a regression check for known translation remnants, not automatic
  linguistic certification of every possible future string.

Portable tests: `tests/english-ui.test.mjs`, `tests/english-ui-browser.mjs`,
`tests/controls-help.test.mjs`, `tests/controls-help-browser.mjs`,
`tests/build-info.test.mjs`.

Raw evidence and screenshots:
`golden-axe-research/evidence/english-ui-20261112/{english,controls}/`.
The dedicated QA browser contexts/audio were closed; server5951 was stopped, its session exited successfully, and a separate
connection check confirmed that it no longer accepts connections.
User preview5799 was not navigated, reloaded or changed by this agent.
