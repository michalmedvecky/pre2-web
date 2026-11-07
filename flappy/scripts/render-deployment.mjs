import { readFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const deployDirectory = new URL('../deploy/', import.meta.url);
const workloadTemplate = JSON.parse(await readFile(new URL('workload.template.json', deployDirectory), 'utf8'));
const ingressTemplate = JSON.parse(await readFile(new URL('ingress.template.json', deployDirectory), 'utf8'));
const controlCharacters = /[\x00-\x1f\x7f]/;
const peerImageRepositories = new Set([
  'ghcr.io/michalmedvecky/pre2-web',
  'ghcr.io/michalmedvecky/pre2-web-ga',
]);

function validateLabel(value, name) {
  if (typeof value !== 'string' || value.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value)) {
    throw new Error(`Required valid DNS label: ${name}`);
  }
  return value;
}

function validateDns(value, name) {
  if (typeof value !== 'string' || !value.length || value.length > 253) {
    throw new Error(`Required valid DNS name: ${name}`);
  }
  try {
    value.split('.').forEach(part => validateLabel(part, name));
  } catch {
    throw new Error(`Required valid DNS name: ${name}`);
  }
  return value;
}

function validateImage(value) {
  if (typeof value !== 'string' || controlCharacters.test(value)) {
    throw new Error('image must be an explicit registry/repository@sha256:<64 lowercase hex>');
  }
  const match = /^([^/]+)\/([a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*(?:\/[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*)*)@sha256:([0-9a-f]{64})$/.exec(value);
  if (!match) throw new Error('image must be an explicit registry/repository@sha256:<64 lowercase hex>');
  const registry = /^([^:]+)(?::([0-9]+))?$/.exec(match[1]);
  if (!registry) throw new Error('image must contain a valid explicit registry');
  validateDns(registry[1], 'image registry');
  if (registry[2] && (Number(registry[2]) < 1 || Number(registry[2]) > 65535)) {
    throw new Error('image registry port must be between 1 and 65535');
  }
  if (peerImageRepositories.has(`${match[1]}/${match[2]}`)) {
    throw new Error('Flappy must use its own image repository, separate from Prehistorik and Golden Axe');
  }
  return value;
}

function validateConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Config object required');
  if (typeof config.kubeContext !== 'string' || !config.kubeContext.trim() || controlCharacters.test(config.kubeContext)) {
    throw new Error('Explicit kubeContext required; the renderer never selects or contacts a cluster');
  }
  validateLabel(config.namespace, 'namespace');
  validateImage(config.image);
  if (typeof config.expose !== 'boolean') throw new Error('expose must be an explicit boolean');

  for (const key of ['imagePullSecret', 'host', 'tlsSecret', 'ingressClass', 'httpsEntrypoint']) {
    if (config[key] !== undefined && typeof config[key] !== 'string') throw new Error(`${key} must be a string when provided`);
  }
  for (const key of ['imagePullSecret', 'host', 'tlsSecret', 'ingressClass']) {
    if (config[key]) validateDns(config[key], key);
  }
  if (config.host && isIP(config.host)) throw new Error('host must be a DNS hostname, not an IP address');
  if (config.httpsEntrypoint && !/^[A-Za-z][A-Za-z0-9_-]*$/.test(config.httpsEntrypoint)) {
    throw new Error('httpsEntrypoint must name one installed Traefik HTTPS entrypoint');
  }
  if (config.expose) {
    for (const key of ['host', 'tlsSecret', 'ingressClass']) validateDns(config[key], key);
    if (!config.httpsEntrypoint) throw new Error('Explicit installed Traefik HTTPS entrypoint required');
  }
}

function replacePlaceholders(value, substitutions) {
  if (typeof value === 'string') return substitutions[value] ?? value;
  if (Array.isArray(value)) return value.map(item => replacePlaceholders(item, substitutions));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replacePlaceholders(item, substitutions)]));
  }
  return value;
}

// This function only renders objects. It performs no Kubernetes or network calls.
export function renderDeployment(config) {
  validateConfig(config);
  const substitutions = {
    __NAMESPACE__: config.namespace,
    __IMAGE__: config.image,
  };
  if (config.expose) Object.assign(substitutions, {
    __HOSTNAME__: config.host,
    __TLS_SECRET__: config.tlsSecret,
    __INGRESS_CLASS__: config.ingressClass,
    __HTTPS_ENTRYPOINT__: config.httpsEntrypoint,
  });

  const manifest = replacePlaceholders(workloadTemplate, substitutions);
  if (config.imagePullSecret) {
    manifest.items.find(item => item.kind === 'Deployment').spec.template.spec.imagePullSecrets = [{ name: config.imagePullSecret }];
  }
  if (config.expose) manifest.items.push(replacePlaceholders(ingressTemplate, substitutions));
  if (/__[A-Z_]+__/.test(JSON.stringify(manifest))) throw new Error('Unresolved template placeholder');
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length !== 1) throw new Error('Usage: node scripts/render-deployment.mjs deploy/config.local.json (renders only)');
  const config = JSON.parse(await readFile(resolve(args[0]), 'utf8'));
  console.log(JSON.stringify(renderDeployment(config), null, 2));
}
