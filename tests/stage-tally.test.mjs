import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {World,completionPercent} from '../dist/js/engine.js';
import {advanceTally,ledgerScore,pendingTallyScore} from '../dist/js/stage-tally.js';
import {TICK_HZ} from '../dist/js/compat.js';
const base=new URL('../dist/assets/',import.meta.url),buf=async n=>new Uint8Array(await readFile(new URL(n,base)));
const a={game:JSON.parse(await readFile(new URL('game.json',base))),tables:await buf('tables.bin'),maps:{},footers:{}};
for(const l of a.game.levels){a.maps[l.id]=await buf(l.map);a.footers[l.id]=await buf(l.footer);}
function prepare(items=[110,111,128]){const w=new World(a);for(const sprite of items)w.scorePickup({sprite,x:0,y:0});w.complete('special');return w;}
function ready(w){let ticks=0;for(;!w.transition.ready&&ticks<10000;ticks++)w.step({right:true,attack:true,up:true});assert.equal(w.transition.ready,true);return ticks;}
test('completion begins with a 48-retrace iris, then uses the original walk stream and coordinates',()=>{
 const w=prepare(),t=w.transition.tally;assert.equal(t.phase,'iris');
 for(let n=0;n<47;n++)advanceTally(w,1/70);assert.equal(t.phase,'iris');advanceTally(w,1/70);assert.equal(t.phase,'approach');assert.equal(t.iris.frames,48);
 assert.equal(w.events.filter(e=>e.type==='tallyStart').length,1);for(let n=0;t.phase==='approach'&&n<200;n++)advanceTally(w,1/TICK_HZ);
 assert.equal(t.phase,'arrive');assert.deepEqual([t.player.x,t.player.y],[60,175]);
 for(let n=0;n<69;n++)advanceTally(w,1/TICK_HZ);assert.equal(t.phase,'brake');assert.equal(t.props[0].x,153);
 for(let n=0;n<17;n++)advanceTally(w,1/TICK_HZ);assert.equal(t.phase,'tally');assert.equal(t.player.x,91);
});
test('food falls in round-robin sprite order; each landing credits its exact value once',()=>{
 const w=prepare([110,110,111,128]),t=w.transition.tally,total=(w.score+ledgerScore(w))>>>0,initial=w.score,spawned=[],seen=new Set(),awards=[];
 const fixed={player:{...w.player},camera:{...w.camera},rng:{...w.rng},health:w.health,lives:w.lives};let ticks=0,lastScore=w.score,highWater=0;
 for(;!w.transition.ready&&ticks<2000;ticks++){
  w.step({left:true,attack:true,up:true});for(const o of t.falling)if(!seen.has(o)){seen.add(o);spawned.push(o.sprite);}
  highWater=Math.max(highWater,t.falling.length);if(w.score!==lastScore){awards.push(w.score);lastScore=w.score;}
  assert.equal((w.score+pendingTallyScore(w))>>>0,total);assert.ok(t.falling.every(o=>o.x===155&&o.vy<=128&&o.y<145));
 }
 assert.ok(ticks<2000);assert.equal(w.transition.ready,true);assert.deepEqual(spawned,[110,111,128,110]);assert.equal(awards.length,4);assert.equal(w.score,total);assert.ok(w.score>initial);assert.ok(highWater<=20);assert.ok(w.foodCounts.every(n=>n===0));
 assert.deepEqual({player:w.player,camera:w.camera,rng:{...w.rng},health:w.health,lives:w.lives},fixed);
 assert.equal(w.events.filter(e=>e.type==='transitionReady').length,1);w.step({});assert.equal(w.events.filter(e=>e.type==='transitionReady').length,0);const score=w.score;w.advance();assert.equal(w.levelIndex,1);assert.equal(w.score,score);w.advance();assert.equal(w.score,score);
});
test('an empty ledger bypasses the braking/tally loop, and advance cannot skip an unfinished sequence',()=>{
 const w=prepare([]),phases=new Set(),level=w.levelIndex;w.advance();assert.equal(w.levelIndex,level);
 while(!w.transition.ready){phases.add(w.transition.tally.phase);w.step({});}assert.ok(phases.has('arrive')&&phases.has('leave'));assert.ok(!phases.has('brake')&&!phases.has('tally'));assert.equal(w.score,0);
});
test('bonus entry preserves the ledger and only the authored return tallies it',()=>{
 const w=new World(a);w.loadLevel(1);w.scorePickup({sprite:110,x:0,y:0});const first=w.score,ledger=w.foodCounts.slice();w.pickup({sprite:311,x:0,y:0,active:true});assert.equal(w.transition.tally,undefined);assert.equal(w.transition.next,12);ready(w);w.advance();assert.equal(w.levelIndex,12);assert.equal(w.score,first);assert.deepEqual(w.foodCounts,ledger);
 w.scorePickup({sprite:111,x:0,y:0});const total=(w.score+ledgerScore(w))>>>0;w.pickup({sprite:311,x:0,y:0,active:true});assert.ok(w.transition.tally);assert.equal(w.transition.next,2);ready(w);assert.equal(w.score,total);w.advance();assert.equal(w.levelIndex,2);assert.ok(w.foodCounts.every(n=>n===0));
});
test('special doors and final-boss reward respect the pre-tally native level remapping',()=>{
 for(const [level,show,next] of [[2,false,13],[13,true,3],[6,false,15],[15,true,7],[10,false,11]]){const w=new World(a);w.loadLevel(level);w.pickup({sprite:279,x:0,y:0,active:true});assert.equal(!!w.transition.tally,show);assert.equal(w.transition.next,next);}
 const w=new World(a);w.loadLevel(9);w.pickup({sprite:311,x:0,y:0,active:true});assert.equal(w.transition.next,14);assert.equal(w.transition.tally,undefined);
});
test('completion arithmetic retains the native byte numerator and 32-bit score carry',()=>{
 assert.equal(completionPercent(256,1,300,0),0);assert.equal(completionPercent(255,0,255,0),100);assert.equal(completionPercent(0,0,0,0),100);
 const w=prepare([110,111]);w.score=0xfffffff0;const expected=(w.score+ledgerScore(w))>>>0;ready(w);assert.equal(w.score,expected);
});
test('RAF-driven completion preserves totals, duration and frozen gameplay at 60 and 144Hz',()=>{
 const results=[];for(const hz of[60,144]){const w=prepare([110,111,128]),initialFrame=w.frame,initialPlayer={...w.player};let frames=0;while(!w.transition.ready&&frames<hz*60){w.stepTally(1/hz);frames++;}assert.equal(w.transition.ready,true);assert.equal(w.frame,initialFrame);assert.deepEqual(w.player,initialPlayer);results.push({score:w.score,seconds:frames/hz});}
 assert.equal(results[0].score,results[1].score);assert.ok(Math.abs(results[0].seconds-results[1].seconds)<1/60);
});
