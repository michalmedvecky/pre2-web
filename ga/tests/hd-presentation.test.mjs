import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {presentationHDRequests, presentationHDCoverage, preloadPresentationHD} from '../dist/js/hd-presentation.js';
import {INTRO_DATA} from '../dist/js/intro-data.js';
import {CHARACTER_SELECT_DATA} from '../dist/js/character-select-data.js';

const assets = JSON.parse(await readFile(new URL('../dist/assets/game.json', import.meta.url)));
const frameKey = request => `${request.bank}/${request.slot}/${request.frame}`;

test('title and rotating selection dependency plans include every original presenter sprite', () => {
  const title = presentationHDRequests(assets, 'title');
  const frames = new Set(title.filter(request => request.kind === 'sprite').map(frameKey));
  assert.deepEqual(title.filter(request => request.kind === 'map'), [{kind: 'map', mapId: INTRO_DATA.title.map}]);
  for (const actor of INTRO_DATA.title.actors) assert(frames.has(`${actor.sprite}/0/${actor.frame}`));
  assert.equal(frames.size, 18);
  const selection = presentationHDRequests(assets, 'character-select');
  assert.deepEqual(selection.filter(request => request.kind === 'map'), [{kind: 'map', mapId: CHARACTER_SELECT_DATA.map}]);
  for (const character of CHARACTER_SELECT_DATA.characters) assert(selection.some(request => frameKey(request) === `${character.sprite}/0/0`));
});

test('opening and rescue retain both selected player banks, glyphs and original map identities', () => {
  for (const kind of ['opening', 'rescue', 'interlude']) {
    const requests = presentationHDRequests(assets, kind, {characters: ['amazon', 'dwarf', 'dwarf']});
    assert.equal(requests.filter(request => request.kind === 'sprite' && request.bank === 'amazon').length, 61);
    assert.equal(requests.filter(request => request.kind === 'sprite' && request.bank === 'dwarf').length, 63);
    assert(!requests.some(request => request.bank === 'hero'));
    assert(requests.some(request => request.kind === 'font' && request.glyphCount === 72));
    assert.equal(requests.find(request => request.kind === 'map').mapId, kind === 'opening' ? '1' : '6');
  }
  assert.throws(() => presentationHDRequests(assets, 'rescue', {characters: ['unknown']}), /Unknown character/);
});

test('presentation coverage explicitly rejects original fallback and missing text assets', () => {
  const requests = presentationHDRequests(assets, 'travel');
  const result = presentationHDCoverage(requests, request => request.kind !== 'font');
  assert.equal(result.complete, false);
  assert.deepEqual(result.missing, [{kind: 'font', glyphCount: 72}]);
  assert.equal(result.ready, 6);
  assert.equal(presentationHDCoverage(requests, () => 'original-fallback').ready, 0);
  assert.throws(() => presentationHDRequests(assets, 'invented-scene'), /Unknown presentation/);
});

test('presentation warmup bounds concurrent loads and preserves failed dependency identity', async () => {
  let active = 0, peak = 0;
  const result = await preloadPresentationHD(assets, 'title', {concurrency: 2, load: async request => {
    active++; peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 1));
    active--;
    if (request.kind === 'sprite' && request.bank === 'title3' && request.frame === 1) throw new Error('missing HD prompt');
    return true;
  }});
  assert.equal(peak, 2);
  assert.equal(active, 0);
  assert.equal(result.complete, false);
  assert.equal(result.total, 19);
  assert.deepEqual(result.missing.map(item => item.request), [{kind: 'sprite', bank: 'title3', slot: 0, frame: 1}]);
  assert.equal(result.missing[0].error, 'missing HD prompt');
});
