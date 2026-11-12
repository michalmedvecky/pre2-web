import { createHash } from 'node:crypto';
import { readdir, readFile, lstat, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export async function runtimeManifest(directory) {
  const root = resolve(directory);
  const files = {};
  async function walk(directory) {
    for (const entry of (await readdir(directory)).sort()) {
      const path = resolve(directory, entry);
      const name = relative(root, path).split('\\').join('/');
      const stat = await lstat(path);
      if (stat.isSymbolicLink()) throw new Error(`Runtime symlink refused: ${name}`);
      if (stat.isDirectory()) await walk(path);
      else if (stat.isFile() && name !== 'build.json') {
        if (/(^|\/)(\.git|\.env)(\/|$)|\.(exe|zip|pem|key)$/i.test(name)) {
          throw new Error(`Unexpected runtime artifact: ${name}`);
        }
        const bytes = await readFile(path);
        files[name] = { sha256: sha256(bytes), size: bytes.length };
      }
    }
  }
  await walk(root);
  const sorted = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
  return { schemaVersion: 1, snapshotSHA256: sha256(JSON.stringify(sorted)), excluded: ['build.json (injected per build)'], files: sorted };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.slice(2).join(' ') !== '--write') throw new Error('Usage: node scripts/runtime-manifest.mjs --write');
  const root = new URL('../', import.meta.url);
  const manifest = await runtimeManifest(fileURLToPath(new URL('dist/', root)));
  await writeFile(new URL('provenance/runtime-manifest.json', root), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(new URL('dist/build.json', root), JSON.stringify({
    application: 'flappy', repository: 'https://github.com/michalmedvecky/remastered',
    commit: null, buildSource: 'local', dirty: null, sourceSnapshot: manifest.snapshotSHA256
  }, null, 2) + '\n');
  console.log(`Recorded ${Object.keys(manifest.files).length} runtime files: ${manifest.snapshotSHA256}`);
}
