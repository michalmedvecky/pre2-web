import{mkdir,writeFile}from'node:fs/promises';import{resolve}from'node:path';import{combinedManifest,project}from'./manifest.mjs';
const m=await combinedManifest();for(const dir of['provenance','pre2/provenance'])await mkdir(resolve(project,dir),{recursive:true});
await writeFile(resolve(project,'provenance/runtime-manifest.json'),JSON.stringify(m,null,2)+'\n');await writeFile(resolve(project,'pre2/provenance/runtime-manifest.json'),JSON.stringify(m.sites.pre2,null,2)+'\n');
for(const[dir,snapshot]of[['portal',m.snapshotSHA256],['pre2',m.sites.pre2.snapshotSHA256]])await writeFile(resolve(project,dir+'/dist/build.json'),JSON.stringify({repository:'https://github.com/michalmedvecky/remastered',commit:null,buildSource:'dirty-snapshot',dirty:true,sourceSnapshot:snapshot},null,2)+'\n');
console.log(m.snapshotSHA256,Object.entries(m.sites).map(([k,v])=>k+':'+Object.keys(v.files).length).join(' '));
