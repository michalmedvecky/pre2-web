import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// These workflows intentionally use inline lists. Check actual trigger paths,
// including GitHub's 'all ignored' rule for paths-ignore and mixed-game commits.
function filters(yaml, key) {
  const match = yaml.match(new RegExp(`^    ${key}: \\[(.+)\\]$`, 'm'));
  assert.ok(match, `Missing inline ${key} filter`);
  return [...match[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
}
const matches = (file, pattern) => pattern.endsWith('/**') ? file.startsWith(pattern.slice(0,-2)) : file === pattern;

test('Flappy-only changes cannot publish either peer game; mixed changes still run their own workflows', async () => {
  const workflows = new URL('../../.github/workflows/', import.meta.url);
  const [pre, ga, flappy] = await Promise.all(['publish-image.yml','publish-ga-image.yml','publish-flappy-image.yml'].map(file => readFile(new URL(file,workflows),'utf8')));
  const ignored = filters(pre,'paths-ignore'), gaPaths = filters(ga,'paths'), flappyPaths = filters(flappy,'paths');
  const cases = [
    {files:['flappy/dist/game.js'], expected:[false,false,true]},
    {files:['.github/workflows/publish-flappy-image.yml'], expected:[false,false,true]},
    {files:['ga/dist/js/app.js'], expected:[false,true,false]},
    {files:['dist/js/app.js'], expected:[true,false,false]},
    {files:['flappy/Dockerfile','dist/js/app.js'], expected:[true,false,true]},
    {files:['flappy/Dockerfile','ga/dist/index.html'], expected:[false,true,true]},
    {files:['flappy/Dockerfile','.github/workflows/publish-image.yml','ga/tests/ci-isolation.test.mjs'], expected:[false,true,true]},
  ];
  for (const {files,expected} of cases) {
    assert.deepEqual([
      files.some(file=>!ignored.some(pattern=>matches(file,pattern))),
      files.some(file=>gaPaths.some(pattern=>matches(file,pattern))),
      files.some(file=>flappyPaths.some(pattern=>matches(file,pattern))),
    ],expected,files.join(', '));
  }
  assert.match(flappy,/if: github.event_name != 'pull_request' && github.ref == 'refs\/heads\/main'/);
  assert.match(flappy,/context: \.\/flappy/);
  assert.match(flappy,/platforms: linux\/amd64,linux\/arm64/);
  assert.doesNotMatch(flappy,/kubectl|kubeconfig|KUBECONFIG/);
});
