import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {scale2x,connectedTerrain} from '../dist/js/terrain.js';
import {hudState} from '../dist/js/hd-hud.js';
const palette=[0,0,0,90,70,50,210,190,160,30,90,40];
test('connected terrain has identical pixels across independently cached regions, including transparent diagonals',()=>{
 const width=196,height=112,src=new Uint8Array(width*height);
 // Cross all tile and cache boundaries with diagonals, holes and color changes.
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)src[y*width+x]=(x+y)%37<9?0:(Math.floor((x+y)/7)%3)+1;
 const whole=connectedTerrain(src,width,height,palette);
 for(const [ox,oy]of [[16,16],[80,16],[128,32]]){const size=32,halo=16,w=size+halo*2,part=new Uint8Array(w*w);for(let y=0;y<w;y++)for(let x=0;x<w;x++)part[y*w+x]=src[(oy+y-halo)*width+ox+x-halo];const rgba=connectedTerrain(part,w,w,palette);for(let y=0;y<size*4;y++){const a=((y+halo*4)*w*4+halo*4)*4,b=((oy*4+y)*width*4+ox*4)*4;assert.deepEqual(rgba.slice(a,a+size*16),whole.slice(b,b+size*16));}}
});
test('terrain enlargement retains palette, constant surfaces and transparent voids without tile outlines',()=>{
 for(const color of [0,1,2,3]){const src=new Uint8Array(32*32).fill(color),before=src.slice(),rgba=connectedTerrain(src,32,32,palette);assert.deepEqual(src,before);for(let i=0;i<rgba.length;i+=4)assert.deepEqual([...rgba.slice(i,i+4)],color?[...palette.slice(color*3,color*3+3),255]:[0,0,0,0]);}
 assert.deepEqual([...scale2x(Uint8Array.of(1),1,1)],[1,1,1,1]);
});
test('HD HUD follows native score, lives, hearts and all five authored inventory positions',async()=>{
 const tables=await readFile(new URL('../dist/assets/tables.bin',import.meta.url));
 for(const health of [0,1,2,3])for(const inventory of [0,1,2,4,8,16,31]){const w={health,lives:2,score:12345,inventory},before=JSON.stringify(w),hud=hudState(w,tables);assert.equal(JSON.stringify(w),before);assert.equal(hud.lives,2);assert.equal(hud.score,'0123450');assert.deepEqual(hud.hearts,[0,1,2].map(i=>i<health));assert.equal(hud.slots.filter(s=>s.active).length,inventory===31?5:inventory?1:0);assert.deepEqual(hud.slots.map(s=>[s.x,s.y]),[[264,182],[272,178],[280,184],[288,181],[296,179]]);}
 assert.equal(hudState({lives:99,score:12345678},tables).lives,9);assert.equal(hudState({score:12345678},tables).score,'3456780');
 assert.ok(hudState({collectionFlash:1,frame:1},tables).slots.every(s=>s.active));assert.ok(hudState({collectionFlash:1,frame:2,inventory:31},tables).slots.every(s=>!s.active));
});

test('HD terrain reconstructs subpixel colors rather than copying DOS palette blocks',()=>{
 const src=new Uint8Array(12*12);for(let y=0;y<12;y++)for(let x=0;x<12;x++)src[y*12+x]=x+y<12?1:2;
 const rgba=connectedTerrain(src,12,12,palette),colors=new Set();for(let i=0;i<rgba.length;i+=4)if(rgba[i+3]===255)colors.add([...rgba.slice(i,i+3)].join(','));
 assert.ok(colors.size>8);assert.ok([...colors].some(c=>c!==palette.slice(3,6).join(',')&&c!==palette.slice(6,9).join(',')));
 const texture=()=>Float32Array.of(.25,0,0,1),painted=connectedTerrain(src,12,12,palette,texture);assert.notDeepEqual(painted,rgba);for(let i=3;i<rgba.length;i+=4)assert.equal(painted[i],rgba[i],'texture cannot change reconstructed coverage');
});
test('HD texture detail blends continuously at atlas cuts and across world-space cache regions',async()=>{
 const {textureSampler}=await import('../dist/js/terrain.js'),tiles=[];for(let i=0;i<36;i++){const t=new Float32Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const p=(y*64+x)*4;t[p]=(i%6)*.03+Math.sin(x/7+y/9)*.02;t[p+3]=255;}tiles.push(t);}
 const whole=textureSampler(tiles,6),part=textureSampler([tiles[14],tiles[15],tiles[20],tiles[21]],2);
 // A cached region's halo covers the blend support; its interior is independent
 // of which chunk requested it, including the shared tile boundary.
 for(let y=8;y<120;y+=3)for(let x=8;x<120;x+=3)assert.deepEqual([...part(x,y)],[...whole(x+128,y+128)]);
 for(let y=16;y<112;y++)assert.ok(Math.abs(whole(63,y)[0]-whole(64,y)[0])<.01,'visible square edge');
});
