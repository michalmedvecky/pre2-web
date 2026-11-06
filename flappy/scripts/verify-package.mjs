import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { runtimeManifest } from './runtime-manifest.mjs';

const root = new URL('../', import.meta.url);
const expected = JSON.parse(await readFile(new URL('provenance/runtime-manifest.json', root)));
const actual = await runtimeManifest(fileURLToPath(new URL('dist/', root)));
assert.deepEqual(actual, expected, 'Runtime changed; review and explicitly run npm run manifest.');
for (const name of ['index.html', 'game.js', 'engine.js', 'style.css', 'levels.json', 'sprites.json', 'favicon.svg']) {
  assert.ok(actual.files[name], `Missing runtime dependency ${name}`);
}
const build = JSON.parse(await readFile(new URL('dist/build.json', root)));
assert.equal(build.application, 'flappy');
assert.equal(build.commit, null, 'Tracked metadata must not claim a CI commit.');
assert.equal(build.buildSource, 'local');
assert.equal(build.sourceSnapshot, actual.snapshotSHA256);
const levels = JSON.parse(await readFile(new URL('dist/levels.json', root)));
assert.equal(levels.levels.length, 200);
assert.equal(levels.levels[8].number, 9);
console.log(`PASS Flappy runtime manifest, 200 original rooms and honest local build metadata (${actual.snapshotSHA256}).`);
