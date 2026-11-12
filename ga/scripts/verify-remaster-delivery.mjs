import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

export async function verifyRemasterDelivery(base){
  base=String(base).replace(/\/+$/,'');
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
  const fxResponse=await fetch(base+'/assets/audio/remaster-effects/manifest.json');
  if(!fxResponse.ok||!fxResponse.headers.get('content-type')?.includes('application/json')||fxResponse.headers.get('cache-control')?.includes('immutable'))throw Error('Effects manifest MIME/cache failed');
  const fx=await fxResponse.json();if(fx.version!==1||Object.keys(fx.effects||{}).length!==15)throw Error('Incomplete effects remaster catalog');
  for(let id=0;id<15;id++){
    const record=fx.effects[id];
    if(record.file!==`effect-${id}-${record.sha256.slice(0,16)}.wav`)throw Error('Effects filename is not content-addressed: '+id);
    const r=await fetch(base+'/assets/audio/remaster-effects/'+record.file,{signal:AbortSignal.timeout(10000)}),b=Buffer.from(await r.arrayBuffer());
    if(!r.ok||!r.headers.get('content-type')?.includes('audio/wav')||!r.headers.get('cache-control')?.includes('immutable')||b.length!==record.bytes||b.subarray(0,4).toString()!=='RIFF'||b.subarray(8,12).toString()!=='WAVE'||createHash('sha256').update(b).digest('hex')!==record.sha256)throw Error('Effects SHA/MIME/cache failed: '+id);
  }
  console.log('PASS all15 restored effects SHA/MIME and immutable delivery cache');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await verifyRemasterDelivery(process.argv[2]);
