import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile}from'node:fs/promises';
import {createHash}from'node:crypto';
import {decodePNG}from'../scripts/png.mjs';
const root=new URL('../',import.meta.url),read=n=>readFile(new URL(n,root)),json=async n=>JSON.parse(await read(n));
test('HD level1 terrain preserves every original alpha mask and all adjoining edge pixels',async()=>{
 const m=await json('dist/assets/hd/manifest.json'),i=await json('art/hd-v2/inventory.json'),g=await json('dist/assets/game.json'),pal=g.palettes[0].rgb8_scaled,images=new Map(),banks={local:await read('dist/assets/'+g.levels[0].tiles),union:await read('dist/assets/union.idx'),front:await read('dist/assets/front.idx')};
 const legacy=Object.fromEntries(Object.entries(m.tiles).filter(([key])=>key.startsWith('1:')));assert.equal(Object.keys(legacy).length,198);assert.deepEqual(Object.keys(legacy).sort(),Object.keys(i.tiles).sort());
 for(const a of m.atlases.filter(a=>a.kind==='tile'))images.set(a.id,decodePNG(await read('dist/assets/hd/'+a.file)));
 for(const [key,s]of Object.entries(legacy)){const image=images.get(s.atlas),[x,y]=s.rect,source=banks[s.bank].subarray(s.index*256,s.index*256+256);assert.ok(key.startsWith('1:'));for(let py=0;py<16;py++)for(let px=0;px<16;px++){const v=source[py*16+px],edge=px===0||py===0||px===15||py===15;for(let yy=0;yy<4;yy++)for(let xx=0;xx<4;xx++){const p=((y+py*4+yy)*image.width+x+px*4+xx)*4;assert.equal(image.pixels[p+3],v?255:0,'alpha '+key);if(v&&((px*4+xx===0||py*4+yy===0||px*4+xx===63||py*4+yy===63)||s.preservedFlat||s.preservedOriginal))assert.deepEqual([...image.pixels.slice(p,p+3)],pal.slice(v*3,v*3+3),'seam '+key);}}}
 for(const [path,hash]of Object.entries(i.sourceHashes))assert.equal(createHash('sha256').update(await read(path)).digest('hex'),hash);
});
test('legacy tile art stays scoped to level1 while all game backgrounds retain native extents',async()=>{
 const m=await json('dist/assets/hd/manifest.json');assert.equal(Object.keys(m.backgrounds).length,16);assert.equal(m.backgrounds['1:BACK0'].width,320);assert.equal(m.backgrounds['1:BACK0'].height,200);for(const t of Object.values(m.tiles).filter(t=>!t.atlas.startsWith('v16-'))){assert.equal(t.level,'1');assert.deepEqual(t.rect.slice(2),[64,64]);}
});
