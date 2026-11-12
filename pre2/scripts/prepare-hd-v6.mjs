import{readFile,writeFile,mkdir}from'node:fs/promises';import{createHash}from'node:crypto';import{encodePNG,alphaBounds}from'./png.mjs';
const root=new URL('../',import.meta.url),art=new URL('art/hd-v6/',root),read=n=>readFile(new URL('dist/assets/'+n,root)),game=JSON.parse(await read('game.json')),manifest=JSON.parse(await read('hd/manifest.json')),pixels=await read('sprites.idx'),pal=game.palettes[0].rgb8_scaled;
const procedural=new Set(manifest.extensions.feedbackV5.spriteIds);
const missing=game.sprites.map(s=>s.id).filter(id=>!procedural.has(id)&&(!manifest.sprites[id]||manifest.sprites[id].atlas.startsWith('v6-')));
const groups=Array.from({length:Math.ceil(missing.length/12)},(_,i)=>({id:'v6-actors-'+i,ids:missing.slice(i*12,i*12+12),columns:4,rows:Math.ceil(Math.min(12,missing.length-i*12)/4)}));
await mkdir(new URL('references/',art),{recursive:true});await mkdir(new URL('raw/',art),{recursive:true});const sprites={};
for(const g of groups){const width=g.columns*256,height=g.rows*256,rgba=new Uint8Array(width*height*4);for(const[i,id]of g.ids.entries()){const s=game.sprites[id],scale=Math.min(4,Math.floor(210/Math.max(s.width,s.height))),left=i%4*256+Math.floor((256-s.width*scale)/2),top=Math.floor(i/4)*256+224-s.height*scale,native=new Uint8Array(s.width*s.height*4);
 for(let y=0;y<s.height;y++)for(let x=0;x<s.width;x++){const v=pixels[s.pixelOffset+y*s.width+x];if(!v)continue;const color=[...pal.slice(v*3,v*3+3),255];native.set(color,(y*s.width+x)*4);for(let yy=0;yy<scale;yy++)for(let xx=0;xx<scale;xx++)rgba.set(color,((top+y*scale+yy)*width+left+x*scale+xx)*4);}
 sprites[id]={id,width:s.width,height:s.height,originX:s.originX,originY:s.originY,ink:alphaBounds({width:s.width,height:s.height,pixels:native}),group:g.id,cell:i};}
 await writeFile(new URL('references/'+g.id+'.png',art),encodePNG(width,height,rgba));}
const hash=b=>createHash('sha256').update(b).digest('hex');await writeFile(new URL('inventory.json',art),JSON.stringify({version:1,groups,sprites,sourceHashes:{'dist/assets/sprites.idx':hash(pixels),'dist/assets/game.json':hash(await read('game.json'))}},null,2)+'\n');console.log(groups);
