import{writeFile,readFile}from'node:fs/promises';import{fileURLToPath}from'node:url';import{runtimeManifest}from'./manifest.mjs';
const root=new URL('../',import.meta.url),manifest=await runtimeManifest(fileURLToPath(new URL('dist/',root)));
await writeFile(new URL('provenance/runtime-manifest.json',root),JSON.stringify(manifest,null,2)+'\n');
if(process.argv.includes('--local-build-info'))await writeFile(new URL('dist/build.json',root),JSON.stringify({repository:'https://github.com/michalmedvecky/remastered',commit:null,buildSource:'dirty-snapshot',dirty:true,sourceSnapshot:manifest.snapshotSHA256},null,2)+'\n');
console.log(manifest.snapshotSHA256,Object.keys(manifest.files).length+' runtime files (build.json excluded)');
