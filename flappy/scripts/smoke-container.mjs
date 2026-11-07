import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { sha256 } from './runtime-manifest.mjs';

const image = process.env.FLAPPY_CONTAINER_IMAGE;
assert.ok(image && /^[a-zA-Z0-9._:/@-]+$/.test(image), 'Set FLAPPY_CONTAINER_IMAGE to the image to test.');
const manifest = JSON.parse(await readFile(new URL('../provenance/runtime-manifest.json', import.meta.url)));
const name = `flappy-smoke-${process.pid}`;
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8' });
let started = false;
try {
  docker('run', '--detach', '--name', name, '--read-only', '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m',
    '--cap-drop=ALL', '--security-opt=no-new-privileges', '-p', '127.0.0.1::8080', image);
  started = true;
  const base = 'http://' + docker('port', name, '8080/tcp').trim().split('\n')[0];
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await fetch(base + '/healthz', { signal: AbortSignal.timeout(1500) });
      if (response.ok && await response.text() === 'ok\n') { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  assert.ok(ready, 'Container /healthz failed.');
  const mime = { html: 'text/html', js: 'javascript', css: 'text/css', json: 'application/json', svg: 'image/svg+xml' };
  for (const [path, info] of Object.entries(manifest.files)) {
    const response = await fetch(`${base}/${path}`, { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 200, path);
    assert.ok(response.headers.get('content-type')?.includes(mime[path.split('.').at(-1)]), `Wrong MIME: ${path}`);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path);
    assert.ok(response.headers.get('cache-control')?.includes('no-cache'), path);
    assert.equal(sha256(Buffer.from(await response.arrayBuffer())), info.sha256, `Wrong deployed bytes: ${path}`);
  }
  const index = await fetch(base + '/');
  assert.equal(index.status, 200);
  assert.equal(sha256(Buffer.from(await index.arrayBuffer())), manifest.files['index.html'].sha256);
  assert.equal((await fetch(base + '/missing-file.js')).status, 404, 'Missing assets must not return HTML.');
  const response = await fetch(base + '/build.json');
  assert.equal(response.status, 200);
  assert.ok(response.headers.get('content-type')?.includes('application/json'));
  const build = await response.json();
  assert.equal(build.application, 'flappy');
  assert.equal(build.buildSource, 'ci');
  assert.equal(build.dirty, false);
  assert.equal(build.commit, process.env.EXPECTED_COMMIT);
  assert.equal(build.sourceSnapshot, manifest.snapshotSHA256);
  assert.equal(docker('exec', name, 'id', '-u').trim(), '10001');
  console.log('PASS actual Flappy container: read-only root, UID10001, /healthz, every asset hash/MIME, 404 and CI build identity.');
} finally {
  if (started) {
    try { console.log(docker('logs', name)); } catch {}
    docker('rm', '-f', name);
  }
}
