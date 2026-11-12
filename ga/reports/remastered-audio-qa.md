# Remastered-default audio QA

The final candidate defaults to remastered music and reconstructed effects;
original music and original effects remain independently selectable. MUSIC
continues to select the music edition only. F2/F3 remain independent effect
and music gates. No sound event IDs, gameplay timings or speaker-clock rules
were changed by this QA work.

## Final runtime

The final actual-browser run recorded runtime snapshot
`e75cbeb2683a9eef3099c5f02587b90beaa01530144822137c871c0e7ea6fdc5`.
All fifteen reconstructed WAVs use the frozen catalog with manifest SHA256
`75ce453c7d8d4c743857277c2c61374eb262ed271755160508011cfc9ef36d3c`.

## Results

- **39 targeted Node tests PASS** across effects-bank/default/lifecycle,
  effects assets, music remaster and existing audio lifecycle tests.
  Ten effects-bank/playback tests cover shared preload, exact source/native
  time validation, partial HTTP503 and checksum failures, cancellation before
  decode, disposal during unabortable serialized decode, stale hit/stop races,
  newer-effect priority, expired one-shots and paused phase-preserving swaps.
- **Two effect asset tests PASS** for all15 original IDs and source WAV SHA,
  unchanged native durations, real48kHz PCM frames/content-addressed filenames,
  non-silent unclipped reconstructed waveforms and magic-loop boundary.
  These tests are included in the39 total above; they are not extra cases.
- **12 actual Chrome browser checks PASS, with15 isolated effect PCM samples**.
  The fresh English page requires a gesture and then plays the remastered
  title. Both effect banks are preloaded once. Actual SoundTest dispatch uses
  the reconstructed buffer, all15 effects produce finite nonzero post-master
  signal above the native idle baseline, and loop10 continues across multiple
  native periods. F2 silences the effects bus without replacing its cursor or
  changing F3. Help pause and original/remastered changes retain the same
  clock and native event start. Pickup replaces magic; explicit stop never
  restarts it. A deliberately unavailable50ms effect4 uses its prewarmed
  original immediately, without any hit-time request, while effect0 remains
  reconstructed.
- **30 real OfflineAudioContext cases PASS**: every effect is decoded and
  rendered at48kHz and44.1kHz, across three loop periods plus a native-time
  one-shot stop. Largest observed local seam sample delta was
  **0.003250153735280037**; output after the scheduled native stop was exactly
  zero. Decoded duration remained within two output samples of native time.
  This is finite rendered-buffer validation, not an indefinite physical loop
  or speaker-device clock measurement.
- The retained **10-case MUSIC browser regression PASS** after explicitly
  selecting original music for its legacy-mode checks. Fresh-session and
  touch assertions now reflect the remastered default. Existing history,
  interruption and stage-transition runners likewise explicitly choose
  original where their fixture intentionally tests that edition.

The physical host output was muted; the application was not test-muted in
the signal tests. Main gain was1. All source comparisons inspect actual
AudioBuffer identity in addition to the requested-edition flag. There is no
claim of subjective listening quality, newly recovered missing source
information, physical Safari/iOS or a new complete DOS playthrough.

## Source event audit

The retained code dispatches death0/1, player attack2, hit3, falling/step4,
skeleton attack7, thief-drop8, pickup9, magic/heavy attack10, doors11 and
character selection13. All15 source IDs remain available, including IDs
without a demonstrated current gameplay callsite. A new effect replaces
the single shared speaker cursor. Magic loop10 and its explicit stop remain
separate events; reconstructed audio does not invent extra effects or
change those mechanics.

## Corrected QA setup

An initial absolute-zero assertion at the master bus was invalid: the
persistent original OPL backend retains a small idle output even with native
music disabled. Observed master peak was0.00042724609375 while effects gain
was0. The F2 check now measures the actual effects bus, where output is zero;
individual audible-effect checks still measure the post-master signal and
require a peak above0.01, so the OPL idle value cannot satisfy them. The
initial failed proof was retained rather than relabeled as a runtime defect.

## Reproduction and cleanup

Portable runners are `tests/remastered-audio-browser.mjs`,
`tests/effects-loop-offline.mjs`, `tests/remaster-effects.test.mjs` and
`tests/remaster-effects-assets.test.mjs`. Browser runners accept GA_TEST_URL,
GA_QA_OUTPUT, GA_PLAYWRIGHT_MODULE and GA_CHROME_PATH.

Raw evidence is under
`golden-axe-research/evidence/remastered-audio-20261112/`:
`final-warm-browser/checks.json`, `offline/checks.json`,
`music-regression/browser-checks.json` and the explicitly named earlier QA
attempts. All owned browser contexts were closed and audio was disposed.
The isolated5943 QA server was stopped; user preview5799 was not operated.
