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

test('rain initialization preserves original duplicated second RNG byte and resets gameplay RNG separately',()=>{
 const w=new World(a);assert.equal(w.rng.a,5);assert.equal(w.rng.b,0x22);assert.equal(w.rng.c,0x86);assert.equal(w.rng.w,0xe58d);
 for(const seed of w.rainSeeds)assert.equal(seed&255,seed>>>8);
 assert.deepEqual([...w.rainSeeds.slice(0,8)],[0xfcfc,0x2323,0x3636,0xfbfb,0xe9e9,0xffff,0x5454,0xb3b3]);
});
test('rain follows native VGA byte mask direction, overlap and shared three-call random reinjection',()=>{
 const w=new World(a);w.weather=2;w.rainSeeds.fill(0);w.frame=1;w.camera.x=0;const before={...w.rng};
 updateWeather(w);assert.deepEqual(w.rainPoints,[{x:316,y:1},{x:316,y:2},{x:317,y:2},{x:316,y:1}]);
 // A live rain pass uses exactly three main RNG calls (index, high byte, low byte).
 let {a:aa,b,c,w:ww}=before;const values=[];for(let n=0;n<3;n++){ww=(ww+aa)&65535;aa=(aa+3+(ww>>>8))&255;b=(2*((b+c)&255)+aa)&255;c^=aa^b;values.push(b);}
 assert.equal(w.rainSeeds[values[0]],values[1]*256+values[2]);assert.deepEqual([w.rng.a,w.rng.b,w.rng.c,w.rng.w],[aa,b,c,ww]);
 const state={...w.rng};w.weather=0;updateWeather(w);assert.deepEqual({...w.rng},state);
});
test('native shake prepares alternating next-frame offsets, restores zero and exempts crouch/form idle from lifting',async()=>{
 const {updateScreenShake}=await import('../dist/js/environment.js');
 const w=new World(a);w.player.landingShake=9;w.player.action=0;const y=w.player.y,offsets=[];
 for(let frame=1;frame<=18;frame++){w.frame=frame;w.shakePlayerNudge=0;if(w.player.landingShake)w.player.landingShake--;updateScreenShake(w);offsets.push(w.nextScreenShake);}
 assert.deepEqual(offsets,[9,0,8,0,7,0,6,0,5,0,4,0,3,0,0,0,0,0]);assert.equal(w.player.y,y-21);
 for(const [action,alternate]of[[5,false],[0,true]]){w.player.action=action;w.alternate=alternate;w.player.landingShake=7;w.frame=1;const before=w.player.y;updateScreenShake(w);assert.equal(w.player.y,before);assert.equal(w.nextScreenShake,8);}
});
test('held Down enters the level-two end cave once, release stays inside and a fresh press returns once',()=>{
 for(const index of[14,16]){const w=new World(a);w.loadLevel(1);const g=w.gates[index];Object.assign(w.player,{x:(g.triggerTile&255)*16,y:(g.triggerTile>>>8)*16});
 let passages=0;const emit=w.emit;w.emit=function(t,d){if(t==='sfx'&&d.index===3)passages++;emit.call(this,t,d);};
 for(let i=0;i<30;i++)w.step({down:true});assert.equal(passages,1);assert.equal(w.player.x,1776);assert.ok(w.player.y>=1504);assert.equal(w.gateDownConsumed,true);
 for(let i=0;i<4;i++)w.step({});assert.equal(passages,1);assert.equal(w.player.downTimer,0);
 for(let i=0;i<30;i++)w.step({down:true});assert.equal(passages,2);assert.equal(w.player.x,1856);assert.equal(w.gateCameraFlag,1);
 }
});

test('rain advances during the native death presentation while player controls stay disabled',()=>{
 const w=new World(a);w.loadLevel(15);w.weather=2;w.deathTimer=10;const time=w.weatherTime,rng=w.rng.w;w.step({right:true});assert.equal(w.weatherTime,time+1);assert.notEqual(w.rng.w,rng);assert.equal(w.deathTimer,9);
});
