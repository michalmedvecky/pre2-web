import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { renderDeployment } from '../scripts/render-deployment.mjs';

const digest = 'a'.repeat(64);
const baseConfig = {
  kubeContext: 'explicit-test-context',
  namespace: 'flappy',
  image: `ghcr.io/michalmedvecky/pre2-web-flappy@sha256:${digest}`,
  imagePullSecret: '',
  expose: false,
  host: '',
  tlsSecret: '',
  ingressClass: 'traefik',
  httpsEntrypoint: '',
};
const exposedConfig = {
  ...baseConfig,
  expose: true,
  host: 'flappy.example.com',
  tlsSecret: 'games.example.com',
  httpsEntrypoint: 'websecure',
  imagePullSecret: 'ghcr-pull',
};
const item = (manifest, kind) => manifest.items.find(resource => resource.kind === kind);

test('default workload is a separate two-replica Flappy service with matching selectors', () => {
  const manifest = renderDeployment(baseConfig);
  assert.equal(manifest.apiVersion, 'v1');
  assert.equal(manifest.kind, 'List');
  assert.deepEqual(manifest.items.map(resource => resource.kind), ['Namespace', 'Deployment', 'Service']);
  assert.equal(item(manifest, 'Namespace').metadata.name, 'flappy');
  for (const resource of manifest.items) {
    assert.equal(resource.metadata.labels['app.kubernetes.io/name'], 'flappy');
    assert.equal(resource.metadata.labels['app.kubernetes.io/part-of'], 'flappy');
    if (resource.kind !== 'Namespace') {
      assert.equal(resource.metadata.name, 'flappy');
      assert.equal(resource.metadata.namespace, 'flappy');
    }
  }
  const deployment = item(manifest, 'Deployment');
  const service = item(manifest, 'Service');
  const pod = deployment.spec.template;
  assert.equal(deployment.spec.replicas, 2);
  assert.deepEqual(deployment.spec.strategy, {type:'RollingUpdate', rollingUpdate:{maxUnavailable:0,maxSurge:1}});
  assert.deepEqual(service.spec.selector, deployment.spec.selector.matchLabels);
  for (const [name, value] of Object.entries(service.spec.selector)) assert.equal(pod.metadata.labels[name], value);
  assert.equal(pod.spec.containers[0].name, 'flappy');
  assert.equal(pod.spec.containers[0].image, baseConfig.image);
  assert.equal(service.spec.type, 'ClusterIP');
  assert.deepEqual(service.spec.ports, [{name:'http',port:80,targetPort:'http'}]);
  assert.ok(!JSON.stringify(manifest).includes('__'));
});

test('nginx workload has non-root, read-only confinement, writable tmp and health probes', () => {
  const spec = item(renderDeployment(baseConfig), 'Deployment').spec.template.spec;
  const container = spec.containers[0];
  assert.equal(spec.automountServiceAccountToken, false);
  assert.deepEqual(spec.securityContext, {runAsNonRoot:true,runAsUser:10001,runAsGroup:10001,seccompProfile:{type:'RuntimeDefault'}});
  assert.deepEqual(container.securityContext, {allowPrivilegeEscalation:false,readOnlyRootFilesystem:true,capabilities:{drop:['ALL']}});
  assert.deepEqual(container.ports, [{name:'http',containerPort:8080}]);
  assert.deepEqual(container.volumeMounts, [{name:'tmp',mountPath:'/tmp'}]);
  assert.deepEqual(spec.volumes, [{name:'tmp',emptyDir:{sizeLimit:'64Mi'}}]);
  for (const probe of ['readinessProbe', 'livenessProbe']) {
    assert.deepEqual(container[probe].httpGet, {path:'/healthz',port:'http'});
    assert.ok(container[probe].timeoutSeconds > 0);
  }
  assert.equal(container.resources.requests.memory, '32Mi');
  assert.equal(container.resources.limits.memory, '128Mi');
  assert.equal(spec.imagePullSecrets, undefined);
});

test('exposure renders the explicit HTTPS host, Traefik entrypoint and namespaced secret', () => {
  const config = {...exposedConfig, namespace:'games-flappy'};
  const manifest = renderDeployment(config);
  assert.equal(manifest.items.length, 4);
  const ingress = item(manifest, 'Ingress');
  const deployment = item(manifest, 'Deployment');
  assert.equal(ingress.metadata.name, 'flappy');
  assert.equal(ingress.metadata.namespace, 'games-flappy');
  assert.equal(ingress.metadata.labels['app.kubernetes.io/name'], 'flappy');
  assert.equal(ingress.spec.ingressClassName, 'traefik');
  assert.deepEqual(ingress.spec.tls, [{hosts:['flappy.example.com'],secretName:'games.example.com'}]);
  assert.equal(ingress.spec.rules[0].host, 'flappy.example.com');
  const route = ingress.spec.rules[0].http.paths[0];
  assert.equal(route.path, '/');
  assert.equal(route.pathType, 'Prefix');
  assert.deepEqual(route.backend.service, {name:'flappy',port:{number:80}});
  assert.deepEqual(ingress.metadata.annotations, {
    'traefik.ingress.kubernetes.io/router.entrypoints':'websecure',
    'traefik.ingress.kubernetes.io/router.tls':'true',
  });
  assert.deepEqual(deployment.spec.template.spec.imagePullSecrets, [{name:'ghcr-pull'}]);
  assert.ok(!JSON.stringify(manifest).includes('__'));
});

test('rendering neither mutates input config nor leaks a prior render into the next', () => {
  const before = structuredClone(exposedConfig);
  const exposed = renderDeployment(exposedConfig);
  assert.deepEqual(exposedConfig, before);
  item(exposed, 'Deployment').spec.template.spec.containers[0].image = 'mutated';
  const fresh = renderDeployment(baseConfig);
  assert.equal(fresh.items.length, 3);
  assert.equal(item(fresh, 'Deployment').spec.template.spec.containers[0].image, baseConfig.image);
  assert.equal(item(fresh, 'Deployment').spec.template.spec.imagePullSecrets, undefined);
});

test('context, namespace, explicit image digest and exposure choice are required', () => {
  for (const invalid of [null, [], 'config']) assert.throws(() => renderDeployment(invalid), /Config object required/);
  for (const value of [undefined, '', '   ', 'other\ncontext', 'other\u007fcontext', 3]) {
    assert.throws(() => renderDeployment({...baseConfig,kubeContext:value}), /kubeContext/);
  }
  for (const value of ['', 'Game', 'a.b', '-flappy', 'flappy-', 'x'.repeat(64), 'flappy\n']) {
    assert.throws(() => renderDeployment({...baseConfig,namespace:value}), /namespace/);
  }
  for (const image of [
    'ghcr.io/michalmedvecky/pre2-web-flappy:latest',
    `flappy@sha256:${digest}`,
    `ghcr.io/michalmedvecky/../flappy@sha256:${digest}`,
    `ghcr.io//flappy@sha256:${digest}`,
    `ghcr.io/flappy@sha256:${'A'.repeat(64)}`,
    `ghcr.io/flappy@sha256:${'a'.repeat(63)}`,
    `ghcr.io/flappy@sha256:${digest}\n`,
    `registry.example.com:70000/flappy@sha256:${digest}`,
  ]) assert.throws(() => renderDeployment({...baseConfig,image}), /image/);
  for (const expose of [undefined, 'false', 0, null]) assert.throws(() => renderDeployment({...baseConfig,expose}), /boolean/);
  const localRegistry = `registry.example.com:5000/games/flappy@sha256:${digest}`;
  assert.equal(item(renderDeployment({...baseConfig,image:localRegistry}), 'Deployment').spec.template.spec.containers[0].image, localRegistry);
});

test('Flappy cannot point at either peer game image repository', () => {
  for (const peer of ['pre2-web','pre2-web-ga']) {
    assert.throws(() => renderDeployment({...baseConfig,image:`ghcr.io/michalmedvecky/${peer}@sha256:${digest}`}), /separate from Prehistorik and Golden Axe/);
  }
});

test('optional configuration rejects wrong types even when ingress is disabled', () => {
  for (const key of ['imagePullSecret','host','tlsSecret','ingressClass','httpsEntrypoint']) {
    for (const value of [false, true, 1, null, [], {}]) {
      assert.throws(() => renderDeployment({...baseConfig,[key]:value}), new RegExp(`${key} must be a string`));
    }
  }
});

test('ingress requires every explicit hostname, TLS, class and entrypoint input', () => {
  for (const key of ['host','tlsSecret','ingressClass','httpsEntrypoint']) {
    assert.throws(() => renderDeployment({...exposedConfig,[key]:''}));
  }
  for (const host of ['https://flappy.example.com','flappy.example.com/path','flappy.example.com:443','*.example.com','127.0.0.1','foo\n.example.com','flappy.example.com.']) {
    assert.throws(() => renderDeployment({...exposedConfig,host}), /host/);
  }
  for (const value of ['tls/name','UPPER','foo\tbar','x'.repeat(64)]) {
    assert.throws(() => renderDeployment({...baseConfig,imagePullSecret:value}), /imagePullSecret/);
  }
  for (const value of ['websecure,web','websecure\n','https:443','']) {
    assert.throws(() => renderDeployment({...exposedConfig,httpsEntrypoint:value}), /entrypoint/i);
  }
});

test('CLI renders JSON with a nonexistent context and no external command PATH', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'flappy-render-'));
  try {
    const path = join(directory, 'config.json');
    await writeFile(path, JSON.stringify({...baseConfig,kubeContext:'not-a-real-cluster'}));
    const result = spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/render-deployment.mjs',import.meta.url)),path],{
      encoding:'utf8',env:{...process.env,PATH:''},timeout:5000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), renderDeployment(baseConfig));
  } finally {
    await rm(directory,{recursive:true,force:true});
  }
});
