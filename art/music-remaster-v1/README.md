# Complete violin/piano/orchestra soundtrack — release1.4.0

All12 recovered MODs have a complete optional sampled arrangement: BOULA, BRAVO, CARTE, CODE, FINAL, GLACE, KOOL, MINES, MONSTER, MYSTERY, PRES and PRESENTA. The approved solo violin/piano palette is retained, with the requested prominent background cello/viola/violin sections. Original bird/animal/shimmer cues are translated into short piccolo ornaments. No external generative music service is used.

## Player behavior

Fresh page loads always select **original** music. Type **MUSIC** while playing to switch to the new soundtrack; type it again to return. The choice is session-only, independent of HD, saves and sound mute. The cheat reserves its full prefix so S does not crouch; the existing single-M delayed mute and F3 still work. Each switch restarts the current cue. Music selection carries into menus, tally and subsequent stages. The separate Sound on/off control affects both modes; if it is off, the MUSIC feedback says SOUND OFF.

No orchestral catalog or audio is requested before selection. The original MOD starts while an optional arrangement loads and is the automatic fallback for a failed/missing file, rejected decode or canceled request. Original SFX continue through the unchanged recovered worklet/mixer even while new music plays on a separate bus. A single decoded arrangement is cached, not the entire soundtrack. Track changes and repeated cheats cancel old requests, preventing stale audio from starting afterward. The game-over panel uses the existing original CODE cue instead of requesting a nonexistent GAMEOVER.mod.

## Arrangement and fidelity

`instruments.json` explicitly maps each original instrument. Nominal source roots were inspected spectrally, rather than assuming all samples are C4. Source guitar/piano/accord-vox chord samples are represented by piano triads. Voice-like instruments and MetalBass have approximate nominal roots flagged in the plan; musical contour is preserved but this is not a claim to reproduce every inflection/noise in those source effects. Original drums are omitted, as in the approved chamber proof. Recovered timing, row jumps, fixed-point pitch ratios, volume automation and finite one-shot endings drive the new performances. Each source pitched event is represented, with no re-timed or newly generated lead melody.

`export-remaster-timelines.mjs` follows the real `OriginalMixer` and detects repeated (order,row,speed) state. It explicitly wraps at the declared song order boundary: some native D-break streams otherwise continue into unspecified orders. That finite authored-song policy only affects these offline arrangements; the original runtime/kernel and MODs remain unchanged. Intro and loop boundaries are retained separately, including long introductions in FINAL/PRESENTA. Recorded notes/volume can begin before the loop and their releases/reflections wrap into the looping region.3ms edge ramps reduce waveform discontinuities without shortening the musical loop.

Section strings sustain original bass anchors, with octave and open-fifth voicings. These are intentionally added accompaniment. Piccolo neighbour-note trills begin at the original audible cue times; their ornaments are authored, not a literal reproduction of bird sample frequencies. The prominent orchestra balance follows the user's +12dB revision of the initial proof.

## Files and reproduction

- `timelines/`: complete source event/timing exports, nominal pitches and source SHA256.
- `review/<track>.json`: rendered source events, added sections/ornaments, PCM peak/RMS, loop coordinates and master SHA256.
- `dist/assets/music-remastered/`: twelve192kbps AAC-LC stereo tracks, about24MB total, plus exact duration/loop/hash catalog. Original MODs remain separate.
- Raw sample WAVs and intermediate masters are retained locally and ignored by Git. Their download URLs, CC0 license/readme and SHA256 are versioned in `art/music-faithful-v1/samples/` and `art/music-faithful-v2/samples/`. Run `python3 scripts/fetch-music-samples.py` to fetch/verify them, `node scripts/export-remaster-timelines.mjs`, then `python3 scripts/render-remastered-tracks.py` with NumPy. `python3 scripts/encode-remastered-tracks.py` uses macOS afconvert/AAC services; outputs may differ with encoder versions, so consumed hashes are recorded.

Sample credits: VSCO2 Community Edition, Versilian Studios / Sam Gossner, Simon Dalzell / Ivy Audio, editing Elan Hickler / Soundemote. Pinned CC0 source: https://github.com/sgossner/VSCO-2-CE/tree/440300901dfe9275fd84e0b7763af1f8443ae62e . Original soundtrack composition remains attributed to the original game's creators.

## Verification

359 Node tests pass, including all prior physics/render/input traces plus eight new music tests: original-by-default/lazy loading, MUSIC recognition, loop metadata, single-buffer cache, canceled/stale requests, mute, failure fallback/SFX and all12 encoded hashes/source coverage. Each render asserts unchanged source onset/nominal pitch for every mapped pitched event. Every downloaded sample hash and all54 original source files are verified.

`review/browser.json`: Chromium and WebKit both decode and start all12 full AAC files, validate loop bounds/decoded signal and seam amplitude, exercise real keyboard MUSIC both directions, retain the selection across a stage change, recover from an injected503, and reload into original mode with no optional request. These are headless integration/decoded-signal checks, not a claim of a full subjective listening pass on every track or physical-phone testing. In-browser memory retains only one decoded track. The previous approved acoustic proof and the rendering sources are retained under `art/music-faithful-v1/` and `v2/`.

Original playback remains the default. This is a sampled arrangement, not a live orchestral recording. Publication evidence is added in `release.json` after CI; no cluster rollout is performed here.

## Published release1.4.0

Game commit`a945d51e5be8823920a2e6527dfe2dbc8b1a77fa`; successful[build39925343875](https://github.com/michalmedvecky/pre2-web/actions/runs/39925343875). Verified linux/amd64 and linux/arm64 OCI revision labels and actual build.json contents in both image layers. Index digest`sha256:0a10ebbdca3d5885548252a9310427d3a4ca814becbee44a3dfd60996348926a`. The metadata/tag commit carries this verified deployment pin. No Kubernetes rollout was performed.
