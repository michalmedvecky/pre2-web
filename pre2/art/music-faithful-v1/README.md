# PRES: melody-preserving violin and piano proof

This is an offline sample-based arrangement for review, not a replacement of in-game music. No generative music service is used. Source: the original unmodified `dist/assets/music/PRES.mod` (SHA256 in timeline/verification).

Listen to `output/PRES-violin-piano.wav`. `output/PRES-comparison-original-then-arrangement.wav` plays the original passage, one second of silence, then the same passage with sampled instruments. Source passage8.516592–31.547376 seconds, corresponding to original orders2–4:23.030784 seconds plus an instrument release tail in the arrangement. The original has drums and bird effects; the arrangement deliberately omits these. Original pitched bass, xylo, glock and vocoder lines remain, with no added pitched notes.

## Reconstruction

`node scripts/export-faithful-music.mjs` runs the existing recovered `OriginalMixer` offline. It captures the actual selected rows, native clock, instrument triggers, volume events and fixed-point pitch steps. It does not assume standard ProTracker BPM or reinterpret the native effect conventions. It advances actual audio blocks so one-shot endings silence notes rather than becoming invented long sustains. `timeline.json` retains the source events, before cropping.

Source sample fundamentals at step0 were inspected spectrally: bass C2, xylo C4, glock C5 and vocoder F3. Conversion retains the native relative pitch ratios rather than assuming every source sample is C4. Root names are nominal semitone pitches, not a guarantee of matching the old sample's tiny tuning offsets. The bass line goes to piano; xylo, glock and vocoder go to bowed violin. Pitched source rhythm/onsets remain; articulation and release naturally change with the instruments. No reharmonization, added intro, new melody, percussion replacement or humanized timing is introduced.

`render-faithful-music.py` uses NumPy and real stereo WAV multisamples. It resamples the nearest source note to each target pitch, uses tracker volume automation, shapes note releases, balances bass/melody and adds subtle stereo room reflections. Piano filenames use a different octave convention from the violin files; measured C3 piano≈261Hz is explicitly mapped to MIDI60. `verification.json` records all114 rendered pitched events, their unchanged source onset/pitch, chosen sample and resampling ratio. Output is48kHz PCM16 stereo, peak0.89, no clipping. A separate violin-only stem is available for inspection.

## Sample sources

[VSCO2 Community Edition](https://github.com/sgossner/VSCO-2-CE), pinned commit `440300901dfe9275fd84e0b7763af1f8443ae62e`. Recorded by Sam Gossner / Versilian Studios and Simon Dalzell / Ivy Audio; editing Elan Hickler / Soundemote. Solo violin Arco Vib forte and Upright Nr.1 mezzo-forte recordings. CC0 license and upstream readme are retained in `samples/`; exact download URLs, file sizes and SHA256 hashes are in `samples/sources.json`. Downloaded only the needed sample subset, not an application or executable.

## Limits

This demonstrates melody preservation and real acoustic timbres. It is not a live performance or a finished full-game orchestration. Sample attacks/releases and source tuning are different from the original electronic sounds. Dynamics, bow articulation, note lengths and mix can be refined after listening. Original gameplay code, MODs, soundtrack selection and deployed release are unchanged. No claim is made that the sample arrangement is an AI audio-to-audio cover.
