#!/usr/bin/env python3
"""Deterministic restoration of the shipped one-bit SND recordings.

Requires Python 3 + NumPy; no model, download, external sample or paid service.
The originals remain the authority for IDs, bit clock, event order and duration.
This does NOT recover missing original recording detail or produce new foley.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import wave

import numpy as np

RATE = 48000
BIT_RATE = 1193182 / 170
VERSION = 1


def sha(data):
    return hashlib.sha256(data).hexdigest()


def wav_read(path):
    with wave.open(str(path), 'rb') as audio:
        if (audio.getnchannels(), audio.getsampwidth(), audio.getframerate()) != (1, 2, RATE):
            raise ValueError('Expected original mono 16-bit 48 kHz PCM: ' + str(path))
        return np.frombuffer(audio.readframes(audio.getnframes()), '<i2').astype(np.float64) / 32768


def wav_write(path, samples):
    samples = np.asarray(samples)
    if not np.isfinite(samples).all() or np.max(np.abs(samples), initial=0) >= 1:
        raise ValueError('Non-finite/clipped PCM refused')
    pcm = np.rint(samples * 32767).astype('<i2')
    with wave.open(str(path), 'wb') as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(RATE)
        audio.writeframes(pcm.tobytes())


def smooth_axis(values, axis):
    padding = [(0, 0)] * values.ndim
    padding[axis] = (1, 1)
    padded = np.pad(values, padding, mode='edge')
    return (.25 * np.take(padded, range(values.shape[axis]), axis=axis)
            + .5 * np.take(padded, range(1, values.shape[axis] + 1), axis=axis)
            + .25 * np.take(padded, range(2, values.shape[axis] + 2), axis=axis))


def native_restore(bits, looping):
    """Phase-preserving, soft time/frequency quantization-noise subtraction.

    A frame-local spectral floor, not a separate noise sample, controls a
    bounded mask. The soft floor avoids invented silence and musical gating.
    """
    size, hop = 256, 32
    original = bits - np.mean(bits)
    x = np.pad(original, (size, size), mode='wrap' if looping else 'reflect')
    count = math.ceil((len(x) - size) / hop) + 1
    x = np.pad(x, (0, (count - 1) * hop + size - len(x)))
    window = np.sqrt(np.hanning(size + 1)[:-1])
    positions = np.arange(count)[:, None] * hop + np.arange(size)[None, :]
    spectra = np.fft.rfft(x[positions] * window, axis=1)
    magnitude = np.abs(spectra)
    floor = np.percentile(magnitude[:, 3:-4], 18, axis=1)
    floor = smooth_axis(floor, 0)
    strength = .12 if looping else .24
    gain = np.sqrt(np.maximum(.38 ** 2, 1 - strength * (floor[:, None] / np.maximum(magnitude, 1e-12)) ** 2))
    gain = smooth_axis(smooth_axis(gain, 1), 0)
    frequency = np.fft.rfftfreq(size, 1 / BIT_RATE)
    # Remove infrasonic one-bit bias; no causal phase/delay is introduced.
    low = np.clip((frequency - 40) / 70, 0, 1)
    gain *= np.sin(low * np.pi / 2) ** 2
    frames = np.fft.irfft(spectra * gain, n=size, axis=1) * window
    restored = np.zeros(len(x))
    weight = np.zeros(len(x))
    for index, row in enumerate(frames):
        start = index * hop
        restored[start:start + size] += row
        weight[start:start + size] += window ** 2
    restored /= np.maximum(weight, 1e-12)
    return restored[size:size + len(bits)]


def sinc_reconstruct(native, frames, looping):
    """Windowed-sinc interpolation on the exact original PIT bit clock.

    The original WAV is a zero-order hold. Sampling at bit-bin centres removes
    its staircase images without shifting the physical source time grid.
    """
    output = np.empty(frames)
    radius, cutoff, beta = 32, .91, 8.6
    offsets = np.arange(-radius + 1, radius + 1)
    for start in range(0, frames, 2048):
        stop = min(frames, start + 2048)
        positions = np.arange(start, stop) * BIT_RATE / RATE - .5
        indices = np.floor(positions).astype(int)[:, None] + offsets
        distance = positions[:, None] - indices
        window = np.i0(beta * np.sqrt(np.maximum(0, 1 - (distance / radius) ** 2))) / np.i0(beta)
        kernel = cutoff * np.sinc(cutoff * distance) * window
        kernel[np.abs(distance) >= radius] = 0
        kernel /= np.maximum(np.sum(kernel, axis=1, keepdims=True), 1e-12)
        if looping:
            source = native[indices % len(native)]
        else:
            # Reflect the reconstruction boundary, never add an external sound.
            span = max(1, 2 * (len(native) - 1))
            mirror = indices % span
            mirror = np.where(mirror < len(native), mirror, span - mirror)
            source = native[mirror]
        output[start:stop] = np.sum(source * kernel, axis=1)
    return output


def detail_resynthesis(samples):
    """Restrained deterministic harmonic extension from the restored waveform.

    No random excitation/new pitch/recording. These are intentionally generated
    overtones, not a claim to recover the missing recording above 3.5 kHz.
    """
    rms = np.sqrt(np.mean(samples ** 2))
    if rms < 1e-12:
        return samples
    driven = np.tanh(samples / rms * .65)
    residual = driven - samples / rms * .65
    spectrum = np.fft.rfft(residual)
    frequencies = np.fft.rfftfreq(len(samples), 1 / RATE)
    high = np.sin(np.clip((frequencies - 3100) / 1500, 0, 1) * np.pi / 2) ** 2
    low = np.cos(np.clip((frequencies - 7000) / 2500, 0, 1) * np.pi / 2) ** 2
    detail = np.fft.irfft(spectrum * high * low, n=len(samples))
    detail_rms = np.sqrt(np.mean(detail ** 2))
    return samples + detail * min(1, rms * .035 / max(detail_rms, 1e-12))


def finish(samples, source, looping):
    samples = samples - np.mean(samples)
    # Equal-RMS reference prevents mistaking simple loudness gain for quality.
    target = np.sqrt(np.mean((source - np.mean(source)) ** 2))
    samples *= target / max(np.sqrt(np.mean(samples ** 2)), 1e-12)
    # Sub-ms onset and ~1 ms release also condition the exact fractional PIT
    # loop boundary: first/last few PCM values are zero at either playback rate.
    attack = min(len(samples) // 8, round(RATE * .00075))
    release = min(len(samples) // 8, round(RATE * (.00125 if looping else .0025)))
    samples[:attack] *= np.sin(np.linspace(0, np.pi / 2, attack)) ** 2
    samples[-release:] *= np.sin(np.linspace(np.pi / 2, 0, release)) ** 2
    samples[:2] = 0
    samples[-3:] = 0
    # Fades can reintroduce a tiny mean. Remove it with an endpoint-zero smooth
    # correction rather than reintroducing a discontinuity by subtracting DC.
    correction = np.sin(np.linspace(0, np.pi, len(samples))) ** 2
    correction[:2] = 0
    correction[-3:] = 0
    samples -= np.mean(samples) / max(np.mean(correction), 1e-12) * correction
    peak = np.max(np.abs(samples), initial=0)
    if peak > .62:
        samples *= .62 / peak
    return samples


def correlation(a, b):
    a, b = a - np.mean(a), b - np.mean(b)
    return float(np.dot(a, b) / max(np.linalg.norm(a) * np.linalg.norm(b), 1e-12))


def render(root, evidence):
    source_dir = root / 'dist/assets/audio'
    output = source_dir / 'remaster-effects'
    output.mkdir(parents=True, exist_ok=True)
    source_manifest = json.loads((source_dir / 'manifest.json').read_text())
    catalog = {'version': VERSION, 'kind': 'source-derived-snd-restoration', 'sampleRate': RATE,
               'sourceBitRate': BIT_RATE, 'effects': {},
               'limits': ['One-bit source information is irrecoverable; this is restoration plus restrained source-derived harmonic detail, not new high-fidelity foley.',
                          'Original event IDs and exact PIT durations are retained; native gameplay speaker scheduling is unchanged.',
                          'The first use of the optional original edition plays the unchanged original WAV assets.']}
    proof = {'rendererVersion': VERSION, 'rendererSHA256': sha(Path(__file__).read_bytes()), 'numpy': np.__version__, 'originalManifestSHA256': sha((source_dir / 'manifest.json').read_bytes()),
             'sourceBitRate': BIT_RATE, 'sampleRate': RATE, 'effects': {}, 'subjectiveListeningClaimed': False}
    comparisons = []
    for ident, record in source_manifest['effects'].items():
        source_path = source_dir / record['file']
        if sha(source_path.read_bytes()) != record['sha256']:
            raise ValueError('Changed original source refused: ' + ident)
        source = wav_read(source_path)
        bits_count = record['bits']
        indices = np.floor((np.arange(bits_count) + .5) * RATE / BIT_RATE).astype(int)
        bits = np.sign(source[np.minimum(indices, len(source) - 1)])
        if not np.isin(bits, [-1, 1]).all():
            raise ValueError('Not the expected original bipolar one-bit source')
        expected = np.where(bits[np.minimum(bits_count - 1, (np.arange(len(source)) * BIT_RATE / RATE).astype(int))] > 0, 6000, -6000)
        if not np.array_equal(np.rint(source * 32768).astype(int), expected):
            raise ValueError('Native bit reconstruction did not exactly recover original WAV: ' + ident)
        looping = ident == '10'
        restored = native_restore(bits, looping)
        pcm = finish(detail_resynthesis(sinc_reconstruct(restored, len(source), looping)), source, looping)
        bandlimited_control = finish(sinc_reconstruct(bits - np.mean(bits), len(source), looping), source, looping)
        temporary = output / ('effect-' + ident + '.wav')
        wav_write(temporary, pcm)
        digest = sha(temporary.read_bytes())
        filename = f'effect-{ident}-{digest[:16]}.wav'
        temporary.replace(output / filename)
        decoded = wav_read(output / filename)
        native_duration = record['nativeDurationSeconds']
        if len(decoded) != math.ceil(native_duration * RATE):
            raise ValueError('Native duration changed')
        catalog['effects'][ident] = {'file': filename, 'sha256': digest, 'sampleRate': RATE,
                                    'frames': len(decoded), 'duration': len(decoded) / RATE,
                                    'nativeDurationSeconds': native_duration, 'loopStart': 0,
                                    'loopEnd': native_duration, 'sourceSHA256': record['sha256'],
                                    'bytes': (output / filename).stat().st_size}
        spectrum = np.abs(np.fft.rfft(decoded)) ** 2
        frequencies = np.fft.rfftfreq(len(decoded), 1 / RATE)
        original_spectrum = np.abs(np.fft.rfft(source - np.mean(source))) ** 2
        # Exact event length, DC/peak, identity correlation and removed staircase
        # images are useful checks; none is a subjective listening substitute.
        proof['effects'][ident] = {'sourceSHA256': record['sha256'], 'outputSHA256': digest,
                                  'frames': len(decoded), 'nativeDurationSeconds': native_duration,
                                  'peak': float(np.max(np.abs(decoded))), 'rms': float(np.sqrt(np.mean(decoded ** 2))),
                                  'sourceACRms': float(np.std(source)), 'dc': float(np.mean(decoded)),
                                  'waveformCorrelation': correlation(source, decoded),
                                  'beyondBandlimitedControlRmsFraction': float(np.sqrt(np.mean((decoded - bandlimited_control) ** 2)) / max(np.sqrt(np.mean(decoded ** 2)), 1e-12)),
                                  'amplitudeLevels': int(len(np.unique(np.rint(decoded * 32768).astype(int)))),
                                  'imageBandAbove10kFraction': float(np.sum(spectrum[frequencies > 10000]) / np.sum(spectrum)),
                                  'originalAbove10kFraction': float(np.sum(original_spectrum[frequencies > 10000]) / np.sum(original_spectrum)),
                                  'endpointJump': float(abs(decoded[-1] - decoded[0])),
                                  'firstTwoFramesZero': bool(np.all(decoded[:2] == 0)),
                                  'lastThreeFramesZero': bool(np.all(decoded[-3:] == 0))}
        # A/B source is DC-centred and level matched to the output. No subjective
        # claim about browser's historical hardware response is made.
        reference = source - np.mean(source)
        reference *= min(1, np.sqrt(np.mean(decoded ** 2)) / max(np.sqrt(np.mean(reference ** 2)), 1e-12))
        fade = min(48, len(reference) // 8)
        reference[:fade] *= np.linspace(0, 1, fade)
        reference[-fade:] *= np.linspace(1, 0, fade)
        comparisons.extend([reference, np.zeros(round(RATE * .25)), decoded, np.zeros(round(RATE * .55))])
    # Remove only renderer-owned stale generations, never the original catalog.
    current = {record['file'] for record in catalog['effects'].values()}
    for path in output.glob('effect-*.wav'):
        if path.name not in current:
            path.unlink()
    (output / 'manifest.json').write_text(json.dumps(catalog, indent=2) + '\n')
    proof['catalogSHA256'] = sha((output / 'manifest.json').read_bytes())
    proof['totalBytes'] = sum(record['bytes'] for record in catalog['effects'].values())
    proof['originalFilesVerifiedUnchanged'] = True
    (root / 'provenance/sfx-remaster-v1.json').write_text(json.dumps(proof, indent=2) + '\n')
    if evidence:
        evidence.mkdir(parents=True, exist_ok=True)
        wav_write(evidence / 'all-effects-ab.wav', np.concatenate(comparisons))
        # Every pair is original then restored; the complete15-ID montage is
        # about24s and permits the human listener to assess the actual result.
        (evidence / 'checks.json').write_text(json.dumps(proof, indent=2) + '\n')
    print(f'Rendered {len(catalog["effects"])} restored effects: {proof["totalBytes"]} bytes')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--evidence', type=Path)
    options = parser.parse_args()
    render(options.root.resolve(), options.evidence.resolve() if options.evidence else None)
