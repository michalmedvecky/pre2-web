// Source-only dependency registry for the original presentation sequences.
// This module never advances the simulation or replaces text with generated art.
const playableCharacters = new Set(['amazon', 'hero', 'dwarf']);

export const HD_PRESENTATIONS = Object.freeze({
  title: Object.freeze({maps: ['a'], banks: ['title1', 'title2', 'title3'], font: false}),
  'character-select': Object.freeze({maps: ['c'], banks: ['select1', 'select2', 'select3'], font: false}),
  opening: Object.freeze({maps: ['1'], banks: [], players: true, font: true}),
  travel: Object.freeze({maps: ['b'], banks: ['oldmap'], font: true}),
  interlude: Object.freeze({maps: ['6'], banks: ['king'], players: true, font: true}),
  rescue: Object.freeze({maps: ['6'], banks: ['king'], players: true, font: true}),
  beginner: Object.freeze({maps: ['9'], banks: [], font: true}),
  'duel-message': Object.freeze({maps: ['9'], banks: [], font: true}),
  results: Object.freeze({maps: ['d'], banks: ['scoring', 'select1', 'select2', 'select3'], font: false}),
  gameover: Object.freeze({maps: [], banks: ['gameover'], font: false}),
  password: Object.freeze({maps: [], banks: [], font: true}),
  options: Object.freeze({maps: [], banks: [], font: true}),
});

/**
 * Enumerate actual stored frames, never synthetic fallback slots or guessed art.
 * Selected player banks may be supplied by the caller. Unknown player names are
 * rejected instead of quietly skipping a missing presentation dependency.
 */
export function presentationHDRequests(assets, kind, {characters = []} = {}) {
  const presentation = HD_PRESENTATIONS[kind];
  if (!presentation) throw new RangeError(`Unknown presentation: ${kind}`);
  const selected = [...new Set(characters)];
  for (const name of selected) {
    if (!playableCharacters.has(name)) throw new RangeError(`Unknown character: ${name}`);
  }
  const requests = [];
  for (const mapId of presentation.maps) {
    if (!assets.maps?.[mapId]) throw new Error(`Missing original map ${mapId}`);
    requests.push({kind: 'map', mapId});
  }
  const banks = [...new Set([...presentation.banks, ...(presentation.players ? selected : [])])];
  for (const bank of banks) {
    const group = assets.sprites?.[bank];
    if (!group?.slots) throw new Error(`Missing original sprite bank ${bank}`);
    for (let slot = 0; slot < group.slots.length; slot++) {
      const frames = group.slots[slot]?.frames || [];
      for (let frame = 0; frame < frames.length; frame++) requests.push({kind: 'sprite', bank, slot, frame});
    }
  }
  if (presentation.font) {
    if (!Number.isInteger(assets.font?.glyphs) || assets.font.glyphs <= 0) throw new Error('Missing original font');
    requests.push({kind: 'font', glyphCount: assets.font.glyphs});
  }
  return requests;
}

/** Explicit coverage: original fallback must return false, not count as HD. */
export function presentationHDCoverage(requests, isReady) {
  if (typeof isReady !== 'function') throw new TypeError('An HD readiness resolver is required.');
  const missing = requests.filter(request => isReady(request) !== true);
  return {total: requests.length, ready: requests.length - missing.length, missing, complete: missing.length === 0};
}

/**
 * Optional warmup for a loader which already owns URL validation/cache/SHA.
 * Failed or unavailable assets are reported; the original presentation remains
 * runnable. No unbounded fetch batch and no loader-specific schema assumptions.
 */
export async function preloadPresentationHD(assets, kind, {characters = [], load, concurrency = 4} = {}) {
  if (typeof load !== 'function') throw new TypeError('An HD asset loader is required.');
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) throw new RangeError('Preload concurrency must be 1..8.');
  const requests = presentationHDRequests(assets, kind, {characters});
  const results = Array(requests.length);
  let next = 0;
  await Promise.all(Array.from({length: Math.min(concurrency, requests.length)}, async () => {
    while (next < requests.length) {
      const index = next++;
      try {
        const loaded = await load(requests[index]);
        results[index] = {request: requests[index], ready: loaded === true};
      } catch (error) {
        results[index] = {request: requests[index], ready: false, error: String(error?.message || error)};
      }
    }
  }));
  const missing = results.filter(result => !result.ready);
  return {kind, total: requests.length, ready: requests.length - missing.length, missing, complete: missing.length === 0};
}
