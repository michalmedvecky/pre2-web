# PRES — strings and piccolo expansion

Review-only expansion of the approved violin/piano proof. Listen to `output/PRES-violin-piano-orchestra-piccolo.wav`. The duet remains the original v1 rendered waveform, with a shared level adjustment. No melody notes, note onsets, timing or arrangement in that source were regenerated.

## Background orchestra

Real recorded violin, viola and cello sections from VSCO2 Community Edition, not copies of the solo violin with artificial detuning. Twelve harmonic anchors follow the original bass on rows0,16,32,48 of the selected three patterns. Cello and viola double those anchors in appropriate octaves; section violins add an open fifth above them. These36 added sustained notes are new accompaniment, not a claim that the original MOD contained a string orchestra. Soft attacks, gentle swells, stereo placement and short room reflections keep the bed behind the approved lead. Measured whole-excerpt RMS is about14dB below the duet before final common normalization.

## Bird replacement

`scripts/export-music-birds.mjs` follows actual native mixer row selection and captures original instrument7 ('zozio') triggers. There are seven triggers in this passage, of which the last is explicitly volume0; only the six audible cues are replaced. The cue start times are unchanged. Each becomes a three-note piccolo neighbour trill. Original relative period contour determines its starting register; the neighbouring notes are authored musical ornaments. This is a musical translation of a sound effect, not a claim to preserve literal bird-sample frequencies. No generated or recorded bird noises are added.

## Sources and reproduction

Run `node scripts/export-music-birds.mjs`, then `python3 scripts/render-orchestral-music.py` with NumPy. The v1 rendered duet and its timeline must be present. Extra samples: VSCO2 CE, pinned `440300901dfe9275fd84e0b7763af1f8443ae62e`, CC0; sources, SHA256, LICENSE and upstream readme retained under `samples/`. Credits: Versilian Studios / Sam Gossner, Simon Dalzell / Ivy Audio, editing Elan Hickler / Soundemote. https://github.com/sgossner/VSCO-2-CE . Selected section/piccolo filenames use C3=middle C, distinct from the v1 solo-violin names; mappings account for this. Strong upper partials in string samples are not mistaken for octave transpositions.

`verification.json` records the v1 waveform hash, source MOD hash, all54 added instrument notes, six bird cue mappings and mix measurements. `output/PRES-comparison-duet-then-orchestra.wav` plays the approved duet then the expanded version with matched duet level, separated by one second. Separate strings-only and piccolo-only stems support review.

## Verification and limits

48kHz PCM16 stereo,24.7308s including the existing tail; peak0.89, no clipped or nonfinite samples. Checks validate downloaded sample hashes, unchanged source duet/MOD hashes,36 section notes,18 piccolo notes and exact six cue start times. The background sustains and new ornaments are intentionally authored; the main duet remains intact. This is sampled acoustic orchestration, not a live performance or generative audio cover. No gameplay files or deployed soundtrack are changed by this preview.

## Louder orchestra revision

User requested a clearly audible string orchestra. `--strings-gain 4 --mix-id orchestra-forward` boosts all three background sections by12.04dB relative to the unchanged duet/piccolo balance. Final common peak normalization retains headroom (peak0.89). Files are in `output-orchestra-forward/`; previous mixes remain available. The new strings/duet RMS ratio is approximately−2dB, compared with−14dB previously. Notes and bird cue timings are unchanged. Verification: `verification-orchestra-forward.json`.
