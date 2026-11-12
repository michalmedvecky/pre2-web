# Source-derived sound-effect restoration

All **15 original Golden Axe effects** have a new source-derived restoration.
The originals remain unchanged and retain their original authorship. No external
recording, model, paid service, downloaded sample or newly composed musical
material was used. The new files do not receive the CC0 licence of the unrelated
VSCO instrument samples used by the music remaster.

## What the source actually contains

The supplied SND recordings are one-bit speaker streams at
`1193182 / 170 = 7018.717647…` bits per second. The shipped original WAVs hold
each bit as `-6000` or `+6000` at48kHz. Together the15 recordings last
5.77997321448 seconds. Re-exporting them with a larger sample rate or bit depth
alone cannot restore the original recording's missing information.

The renderer first recovers the native bit sequence from each shipped WAV and
reconstructs **every original PCM sample exactly** as a negative control. It
checks the original file SHA256 before processing. IDs, source bit clock, frame
count and exact native duration remain authoritative.

## Restoration, rather than an upscale-only export

`scripts/render-remastered-effects.py` uses deterministic local NumPy processing:

1. Phase-preserving short-time analysis on the native clock with a bounded,
   smoothly varying spectral-floor mask reduces quantization noise without
   hard gating or inventing silent intervals.
2. Exact-clock windowed-sinc reconstruction removes the original zero-order
   hold's staircase images. It retains the recording's time grid and adds no
   causal filter delay.
3. Restrained waveform-derived nonlinear overtones add a small amount of
   coherent upper detail, limited to3.5% of restored RMS. These are explicitly
   generated overtones, **not recovered original content** above the source
   Nyquist frequency and not a new foley recording.
4. Source-AC-RMS matching prevents simple loudness gain from masquerading as a
   quality improvement. Sub-millisecond onset conditioning, short release and a
   smooth endpoint-zero DC correction prevent delivery clicks. Native event
   length and the source loop period do not change.

The15 outputs are48kHz, mono,16-bit PCM WAV, **555552 bytes total**. Their names
are content addressed; the runtime manifest is
`dist/assets/audio/remaster-effects/manifest.json`. Each record includes file
hash/size, original source hash, frames, exact native duration and loop markers.
ID10 retains `loopStart=0` and
`loopEnd=0.6964235129259408` seconds; the stored final partial sample remains
available for that fractional boundary. One-source replacement, magic stop and
the original gameplay speaker clock are runtime responsibilities, not altered
by this asset renderer.

## Checks and reproduction

- All15 source WAVs have unchanged hashes; native-bit recovery exactly reproduces
  all their samples before restoration.
- A complete second render produced a bit-identical manifest and all15 WAVs.
- Output/source waveform correlation is approximately0.720–0.949. The outputs
  differ by8.4–47.8% RMS from a simple sinc-bandlimited control, so this is not
  solely a sample-rate conversion or fixed equalizer. These numbers establish
  identity/change, not an objective proof of aesthetic quality.
- Peaks stay below0.47 full scale, RMS approximately0.128–0.181, no clipping or
  non-finite values. Residual DC is below2.4e-7. The first two and last three
  stored samples are zero; every endpoint jump is zero. There are2201–16172
  distinct reconstructed amplitude values per effect, versus two in the source.
- `tests/remaster-effects-assets.test.mjs`:2/2 PASS, independently checks
  complete ID coverage, original hashes/native time, delivered PCM/hash,
  reconstructed amplitude levels, headroom and magic-loop endpoints.
- Actual44.1/48kHz browser decode/loop/stop verification belongs to the runtime
  audio QA. Stored endpoint checks alone are not presented as that browser test.

Reproduce with Python3 and NumPy (the recorded run used NumPy2.3.5):

```sh
python3 scripts/render-remastered-effects.py --evidence /tmp/ga-sfx-restoration
```

No dependency is automatically installed. CI verifies the committed deliverables
without needing Python/NumPy. Per-file metrics and renderer/source hashes are
in `provenance/sfx-remaster-v1.json`. Raw reproducibility checks and an A/B WAV
are retained at
`golden-axe-research/evidence/sfx-remaster-20261112/`.

## Listening and honest limits

`all-effects-ab.wav` contains every ID0–14, each original then restored, with
short gaps. The original side is DC-centred and RMS-matched for comparison;
it is not an asserted emulation of every historical PC speaker. The montage is
for actual human A/B assessment. No subjective listening by the agent, physical
speaker/headphone test, AI speech recovery or new high-fidelity foley is claimed.

The short, gritty identity of the DOS recordings necessarily remains. Lost
amplitude detail and bandwidth cannot be recovered from a one-bit recording.
The result is a cleaner source-derived restoration with restrained synthesized
detail, not a claim that those recordings have become modern studio masters.
The original edition remains available if that character is preferred.
