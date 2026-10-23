// Faithful palette/lookup reconstruction, using the same connected 4x scaler as web HD.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {encodePNG} from './png.mjs';
import {connectedTerrain} from '../dist/js/terrain.js';
const root=new URL('../dist/vr/assets/',import.meta.url),out=new URL('../dist/vr/textures/',import.meta.url),game=JSON.parse(await readFile(new URL('game.json',root))),level=game.levels[1],local=new Uint8Array(await readFile(new URL(level.tiles,root))),union=new Uint8Array(await readFile(new URL('union.idx',root))),palette=game.palettes[1].rgb8_scaled;
const cell=72,padding=4,extent=cell*16,rgba=new Uint8Array(extent*extent*4);
for(let id=0;id<256;id++){const value=level.lookup[id];if(value===undefined||value===256||value===65535)continue;const bank=value<256?local:union,index=value<256?value:value-256,pixels=connectedTerrain(bank.subarray(index*256,index*256+256),16,16,palette),x=(id&15)*cell+padding,y=(id>>4)*cell+padding;for(let row=0;row<64;row++)rgba.set(pixels.subarray(row*256,row*256+256),((y+row)*extent+x)*4);}
const bytes=encodePNG(extent,extent,rgba),hash=data=>createHash('sha256').update(data).digest('hex');
await writeFile(new URL('tiles-hd-2.png',out),bytes);
await writeFile(new URL('tiles-hd-2.json',out),JSON.stringify({level:'2',file:'tiles-hd-2.png',width:extent,height:extent,cell,padding,sha256:hash(bytes),method:'connectedTerrain 4x; recovered level-2 lookup and palette, no generated imagery',sources:{[level.tiles]:hash(local),'union.idx':hash(union)},palette},null,2)+'\n');
console.log(JSON.stringify({level:'2',bytes:bytes.length,sha256:hash(bytes)}));
