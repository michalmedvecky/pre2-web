import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { validateReleaseEnvironment } from '../scripts/validate-release-env.mjs';
import { runtimeManifest } from '../scripts/runtime-manifest.mjs';

const base = 'nginx:stable-alpine@sha256:' + 'a'.repeat(64);
const image = 'ghcr.io/michalmedvecky/pre2-web-flappy';
test('release inputs keep Flappy separate from both existing game repositories', () => {
  assert.deepEqual(validateReleaseEnvironment({image, base}), {image, base});
  for (const invalid of ['ghcr.io/michalmedvecky/pre2-web', 'ghcr.io/michalmedvecky/pre2-web-ga', image + ':latest', 'ghcr.io/a/../b', 'ghcr.io/a//b']) {
    assert.throws(() => validateReleaseEnvironment({image: invalid, base}));
  }
  for (const invalid of ['nginx:stable-alpine', 'evil/nginx@sha256:' + 'a'.repeat(64), base.slice(0,-1)]) {
    assert.throws(() => validateReleaseEnvironment({image, base: invalid}));
  }
});

test('image build identity is honest locally and validates the full CI commit', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'flappy-build-'));
  const out = join(directory, 'build.json');
  const script = fileURLToPath(new URL('../scripts/write-build-info.sh', import.meta.url));
  const env = {...process.env, BUILD_SOURCE:'ci', BUILD_DIRTY:'false', VCS_REF:'b'.repeat(40), SOURCE_SNAPSHOT:'c'.repeat(64)};
  try {
    execFileSync('/bin/sh', [script,out], {env});
    const result = JSON.parse(await readFile(out));
    assert.equal(result.application, 'flappy');assert.equal(result.commit, env.VCS_REF);
    assert.equal(result.sourceSnapshot, env.SOURCE_SNAPSHOT);assert.equal(result.dirty,false);
    for (const invalid of [{VCS_REF:'short'},{BUILD_DIRTY:'true'},{BUILD_SOURCE:'unsupported'},{BUILD_REPOSITORY:'https://other.invalid/repo'}]) {
      assert.throws(() => execFileSync('/bin/sh',[script,out],{env:{...env,...invalid},stdio:'pipe'}));
    }
    execFileSync('/bin/sh',[script,out],{env:{...env,BUILD_SOURCE:'local',BUILD_DIRTY:'unknown',VCS_REF:'unknown'}});
    assert.equal(JSON.parse(await readFile(out)).commit,null);
  } finally {await rm(directory,{recursive:true,force:true});}
});

test('the packaged runtime includes every dependency and excludes local hosting state', async () => {
  const manifest = await runtimeManifest(fileURLToPath(new URL('../dist/',import.meta.url)));
  assert.deepEqual(Object.keys(manifest.files).sort(), ['engine.js','favicon.svg','game.js','index.html','levels.json','sprites.json','style.css']);
  const expected = JSON.parse(await readFile(new URL('../provenance/runtime-manifest.json',import.meta.url)));
  assert.deepEqual(manifest,expected);
});
