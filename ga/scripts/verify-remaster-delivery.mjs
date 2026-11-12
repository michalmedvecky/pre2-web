import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

export async function verifyRemasterDelivery(base){
  const response=await fetch(base+'/assets/audio/remaster/manifest.json');
  if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error('Remaster manifest delivery failed');
  if(response.headers.get('cache-control')?.includes('immutable'))throw Error('Mutable remaster manifest must not be cached as immutable');
  const manifest=await response.json();
  if(manifest.version!==1||Object.keys(manifest.tracks||{}).length!==26)throw Error('Incomplete music remaster catalog');
  for(const id of ['opening','stage1','thief']){
    const record=manifest.tracks[id];
    if(record.file!==`${id}-${record.sha256.slice(0,16)}.flac`)throw Error('Remaster filename is not content-addressed: '+id);
    const r=await fetch(base+'/assets/audio/remaster/'+record.file,{signal:AbortSignal.timeout(30000)});
    if(!r.ok||!r.headers.get('content-type')?.includes('audio/flac')||!r.headers.get('cache-control')?.includes('immutable'))throw Error('Remaster MIME/cache failed: '+id);
    const b=Buffer.from(await r.arrayBuffer());
    if(b.subarray(0,4).toString()!=='fLaC'||createHash('sha256').update(b).digest('hex')!==record.sha256)throw Error('Remaster delivery SHA failed: '+id);
  }
  console.log('PASS complete remastered music manifest, sampled FLAC hashes/MIME and immutable delivery cache');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await verifyRemasterDelivery(process.argv[2]);
