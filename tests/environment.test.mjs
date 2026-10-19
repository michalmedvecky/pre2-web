import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';
import{World}from'../dist/js/engine.js';import{updateMovingBlocks,updateWeather}from'../dist/js/environment.js';
const root=new URL('../dist/assets/',import.meta.url),g=JSON.parse(await readFile(new URL('game.json',root))),a={game:g,tables:new Uint8Array(await readFile(new URL('tables.bin',root))),maps:{},footers:{}};
for(const l of g.levels){a.maps[l.id]=new Uint8Array(await readFile(new URL(l.map,root)));a.footers[l.id]=new Uint8Array(await readFile(new URL(l.footer,root)));}
test('all sixteen footers decode fifteen ten-byte moving-map records with seven authored regions',()=>{let count=0;for(const l of g.levels){const f=a.footers[l.id];assert.equal(l.movingBlocks.length,15);for(const d of l.movingBlocks){assert.deepEqual(d.raw,[...f.slice(1429+d.index*10,1439+d.index*10)]);assert.equal(d.active,d.mapAddress!==65535);if(d.active){count++;assert.ok(['9','E'].includes(l.id));assert.ok(d.raw[2]>0&&d.raw[3]>0&&d.raw[8]>0);}}}assert.equal(count,7);});
test('every authored moving region follows its swept source rows, four-tick cadence, finite travel and fresh restart',()=>{
 for(let i=0;i<16;i++)for(const d of g.levels[i].movingBlocks.filter(d=>d.active)){
  const w=new World(a);w.loadLevel(i);w.movingBlocks=w.movingBlocks.filter(b=>b.index===d.index);const b=w.movingBlocks[0],start=b.pos,width=b.width,height=b.height,travel=b.remaining,source=a.maps[w.level.id],before=source.slice();
  // The trigger is a packed tile address and an unsigned forward range of eight tiles.
  w.player.x=((d.triggerTile&255)+9)*16;w.player.y=(d.triggerTile>>8)*16;updateMovingBlocks(w);assert.equal(b.trigger,d.triggerTile);
  w.player.x=((d.triggerTile&255)+8)*16;updateMovingBlocks(w);assert.equal(b.trigger,65534);assert.equal(b.step,0);
  const initial=w.map.slice();w.frame=2;updateMovingBlocks(w);assert.deepEqual(w.map,initial);
  for(let step=1;step<=travel;step++){
   w.frame=step*4+1;updateMovingBlocks(w);assert.equal(b.pos,start-step*256);assert.equal(b.remaining,travel-step);
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const expected=initial[start+y*256+x];
    assert.equal(w.map[b.pos+y*256+x],expected,`stage ${w.level.id} region ${d.index} step ${step} tile ${x},${y}`);
   }
   for(let y=0;y<step;y++)for(let x=0;x<width;x++){const pos=start+(height-step+y)*256+x;assert.equal(w.map[pos],source[pos]);}
  }
  assert.equal(b.trigger,65535);const done=w.map.slice();w.frame+=4;updateMovingBlocks(w);assert.deepEqual(w.map,done);assert.deepEqual(source,before);
  w.loadLevel(i,{restart:true});const fresh=w.movingBlocks.find(q=>q.index===d.index);assert.equal(fresh.pos,start);assert.equal(fresh.remaining,travel);assert.equal(fresh.trigger,d.triggerTile);
 }
});
test('native rain schedule is dormant in fifteen worlds and ramps through the three level-G phases',()=>{
 for(let i=0;i<16;i++){const w=new World(a);w.loadLevel(i);const trace=new Map();for(let n=1;n<=1600;n++){w.frame=n;updateWeather(w);if([440,444,880,884,888,1320,1324,1328,1600].includes(n))trace.set(n,w.weather);assert.ok(w.rainPoints.every(p=>Number.isInteger(p.x)&&Number.isInteger(p.y)));}if(i===15){assert.deepEqual([...trace.values()],[0,1,40,40,46,100,100,101,169]);assert.ok(w.rainPoints.length>0);}else{assert.equal(w.weather,0);assert.equal(w.rainPoints.length,0);}}
});
test('moving map triggers reject adjacent rows and points before the trigger',()=>{const w=new World(a);w.loadLevel(13);const b=w.movingBlocks[0];for(const pos of[b.trigger-1,b.trigger+256,b.trigger-256]){w.player.x=(pos&255)*16;w.player.y=(pos>>8)*16;updateMovingBlocks(w);assert.notEqual(b.trigger,65534);}});
