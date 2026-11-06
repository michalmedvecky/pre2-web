import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function validateReleaseEnvironment({ image = '', base = '' }) {
  if (!/^ghcr\.io\/[a-z0-9._-]+\/[a-z0-9._/-]+$/.test(image) || image.includes('..') || image.includes('//')) {
    throw new Error('IMAGE must be a lowercase GHCR repository without a tag.');
  }
  if (['ghcr.io/michalmedvecky/pre2-web', 'ghcr.io/michalmedvecky/pre2-web-ga'].includes(image)) {
    throw new Error('Flappy must use its own image repository.');
  }
  if (!/^(nginx|docker\.io\/library\/nginx)(:[A-Za-z0-9._-]+)?@sha256:[0-9a-f]{64}$/.test(base)) {
    throw new Error('NGINX_IMAGE must be official nginx pinned by sha256 digest.');
  }
  return { image, base };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  validateReleaseEnvironment({ image: process.env.IMAGE, base: process.env.NGINX_IMAGE });
  console.log('Validated separate Flappy image repository and immutable official nginx base.');
}
