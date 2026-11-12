import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('unified publisher builds and verifies all game prefixes without deploying the cluster',async()=>{
 const root=new URL('../../',import.meta.url);
 const workflow=await readFile(new URL('.github/workflows/publish-remastered-image.yml',root),'utf8');
 const docker=await readFile(new URL('Dockerfile',root),'utf8');
 const smoke=await readFile(new URL('scripts/smoke-container.mjs',root),'utf8');
 assert.match(workflow,/npm (?:run )?test/);
 assert.match(workflow,/node scripts\/verify-package\.mjs/);
 assert.match(workflow,/node scripts\/smoke-container\.mjs/);
 assert.match(workflow,/context:\s*["']?\.["']?\s*(?:\n|$)/);
 assert.match(workflow,/platforms:\s*linux\/amd64,linux\/arm64/);
 assert.doesNotMatch(workflow,/kubectl|KUBECONFIG/);
 for(const game of['ga','pre2','flappy']){
  assert.match(docker,new RegExp('COPY\\s+'+game+'/dist/\\s+/usr/share/nginx/html/'+game+'/'));
  assert.ok(smoke.includes('/'+game+'/'),'Smoke must request '+game+' prefix');
 }
 assert.match(smoke,/SMOKE_IMAGE/);
 assert.match(smoke,/EXPECTED_COMMIT/);
 assert.match(smoke,/EXPECTED_SNAPSHOT/);
});
