import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {encodePNG,decodePNG,alphaBounds} from '../scripts/png.mjs';
import {SceneAdapter,worldToMetres} from '../dist/js/scene.js';
const root=new URL('../',import.meta.url),read=n=>readFile(new URL(n,root)),json=async n=>JSON.parse(await read(n));
test('PNG packing preserves exact RGBA values including transparent edges',()=>{const src={width:3,height:2,pixels:Uint8Array.from([255,0,0,255,0,255,0,128,0,0,0,0,1,2,3,0,10,20,30,17,44,55,66,255])};const out=decodePNG(encodePNG(src.width,src.height,src.pixels));assert.deepEqual(out,src);assert.deepEqual(alphaBounds(out),[0,0,3,2]);});
test('every inventoried sprite frame has a nonempty aligned HD texture',async()=>{
 const i=await json('art/hd-v1/inventory.json'),m=await json('dist/assets/hd/manifest.json'),g=await json('dist/assets/game.json'),v2=await json('art/hd-v2/inventory.json'),v5=await json('art/hd-v5/inventory.json'),v6=await json('art/hd-v6/inventory.json');assert.equal(Object.keys(m.sprites).length,385);assert.deepEqual(Object.keys(m.sprites).sort(),Object.keys({...i.sprites,...v2.sprites,...v5.sprites,...v6.sprites}).filter(id=>id!=='282').sort());
 const images=new Map();for(const a of m.atlases){const b=await read('dist/assets/hd/'+a.file),image=decodePNG(b);assert.equal(createHash('sha256').update(b).digest('hex'),a.sha256);assert.equal(image.width,a.width);assert.equal(image.height,a.height);if(a.kind==='sprite'||a.kind==='tile')assert.ok(image.pixels.some((v,i)=>i%4===3&&v===0));images.set(a.id,image);}
 for(const [id,s] of Object.entries(m.sprites)){const source=g.sprites[id];assert.equal(s.width,source.width);assert.equal(s.height,source.height);assert.equal(s.originX,source.originX);assert.equal(s.originY,source.originY);assert.equal(s.rect[2],source.width*4);assert.equal(s.rect[3],source.height*4);assert.ok(alphaBounds(images.get(s.atlas),s.rect),`blank frame ${id}`);}
 for(const [p,hash]of Object.entries(i.sourceHashes))assert.equal(createHash('sha256').update(await read(p)).digest('hex'),hash);
});
test('native player animation streams and alternate equipment are covered by HD IDs',async()=>{
 const r=await json('dist/rules.json'),m=await json('dist/assets/hd/manifest.json'),b=await read('dist/assets/tables.bin'),word=p=>b[p]|b[p+1]<<8;
 for(const a of Object.values(r.animations))for(const f of a.words)if(f.word>=0&&f.sprite<=52)assert.ok(m.sprites[f.sprite],String(f.sprite));
 for(let weapon=0;weapon<4;weapon++){const start=word(0x7b00+weapon*5);for(let n=0;n<64;n++){const p=start+n*8;if(word(p)===0x55aa)break;assert.ok(m.sprites[word(p+2)&8191]);}}
 for(let id=39;id<=52;id++)assert.ok(m.sprites[id]);for(let id=119;id<=127;id++)assert.ok(m.sprites[id]);for(const id of [312,313,314,315,316,379,380,381])assert.ok(m.sprites[id]);
});
test('scene export keeps world coordinates independent of scrolling, stable IDs and weapon sockets',()=>{
 const p={x:64,y:96,sprite:9,face:-1},a={x:160,y:96,sprite:313,active:true};const w={player:p,actors:[a],camera:{x:100,y:100},playerWeapon:{x:53,y:80,sprite:58},level:{id:'1'},frame:10,health:3,lives:2,score:4};const adapter=new SceneAdapter(),before=JSON.stringify(w),one=adapter.capture(w);assert.equal(JSON.stringify(w),before);assert.deepEqual(one.entities.find(e=>e.id==='player').position,{x:2,y:-3,z:0});assert.equal(one.entities.find(e=>e.id==='player').facing,-1);assert.equal(one.entities.find(e=>e.id==='player').yaw,Math.PI/2);assert.deepEqual(one.entities.at(-1).attachment.offsetPixels,{x:-11,y:-16});w.camera.x+=100;const two=adapter.capture(w);assert.deepEqual(one,two);assert.equal(one.entities[0].id,two.entities[0].id);assert.deepEqual(worldToMetres(64,96,{pixelsPerMetre:16,originX:32,originY:128,depth:-2}),{x:2,y:2,z:-2});assert.throws(()=>worldToMetres(0,0,{pixelsPerMetre:0}));
});
