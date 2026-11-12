import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Simulation} from '../dist/js/simulation.js';
import {LOGIC} from '../dist/js/logic-data.js';
const assets=JSON.parse(await readFile(new URL('../dist/assets/game.json',import.meta.url)));
for(const m of Object.values(assets.maps)){const b=await readFile(new URL('../dist/assets/'+m.cellsFile,import.meta.url));m.cells=Array.from({length:b.length/2},(_,i)=>b.readUInt16LE(i*2));}
function scene(extra={}){const s=new Simulation({assets,character:'hero'});s.script=[];s.scriptWait=null;const t=s.createActor({type:12,x:180,y:174,health:8,...extra});s.state.entities=[s.state.player,t];return{s,t};}
test('5456 freezes hurt only with positive decision counter',()=>{
 for(const state of[13,14]){const{s,t}=scene({state,decisionTimer:3});s.refresh(t);s.thiefControl(t);assert.equal(t.decisionTimer,3);assert.equal(t.state,state);t.decisionTimer=0;s.thiefControl(t);assert.equal(t.state,1);assert.ok(t.decisionTimer>=2&&t.decisionTimer<=5);}
});
test('54d5 uses signed previous projected cache, including Z, before selecting direction',()=>{
 const{s,t}=scene({x:162,y:132,cachedScreenX:158,cachedScreenY:128});s.rng[0]=0;s.tile=()=>({floor:true,wall:false,level:t.level});const c=s.thiefControl(t);assert.equal(c.direction,3);assert.equal(c.run,false);
 const other=scene({x:158,y:128,cachedScreenX:162,cachedScreenY:132});other.s.rng[0]=0;other.s.tile=()=>({floor:true,wall:false,level:other.t.level});assert.equal(other.s.thiefControl(other.t).direction,7);
});
test('54d5 clears inventory immediately on expiry and leaves offscreen deletion to cleanup',()=>{
 const{s,t}=scene({x:10,nativeWait:1,decisionTimer:0});s.thiefControl(t);assert.equal(t.magicPots,0);assert.equal(t.state,2);assert.equal(t.removed,false);
});
test('5456 preserves54 idle decisions and native12-pixel movement tables',()=>{
 const{s,t}=scene({state:1,decisionTimer:0});s.refresh(t);s.thiefControl(t);assert.equal(t.state,0);assert.equal(t.decisionTimer,54);for(let n=0;n<54;n++){const c=s.thiefControl(t);assert.equal(c.direction,8);assert.equal(t.state,0);}s.thiefControl(t);assert.equal(t.state,1);assert.ok(t.decisionTimer>=2&&t.decisionTimer<=5);
 assert.deepEqual(LOGIC.thiefVX,[0,12,12,12,0,-12,-12,-12,0]);assert.deepEqual(LOGIC.thiefVY,[-12,-12,0,12,12,12,0,-12,0]);
});
test('26d4/271f inventory is finite, independent of health, one item per eligible call',()=>{
 for(const type of[12,13]){const{s,t}=scene({type,health:8});assert.equal(t.magicPots,2);s.dropPickup(t);s.dropPickup(t);s.dropPickup(t);const items=s.state.entities.filter(a=>a.isPickup);assert.equal(items.length,2);assert.ok(items.every(a=>a.typeId===(type===12?18:19)&&a.magicPots===0));assert.equal(t.health,8);assert.equal(t.magicPots,0);assert.equal(t.nativeWait,0);}
});
test('normal attack input reproduces the zero-counter hurt divergence without post-start actor edits',()=>{
 function run(before){const{s,t}=scene({x:112,y:174,aux:3});const p=s.state.player;Object.assign(p,{x:100,y:174,level:1,direction:2,state:0,invulnerability:0});s.refresh(p);s.scrollLimit=216;
  if(before){const fixed=s.thiefControl;s.thiefControl=function(a){if(a.state===13||a.state===14){if(a.nativeWait>0)a.nativeWait--;else a.magicPots=0;return{direction:8,attack:false,jump:false,magic:false,run:false,combo:0};}return fixed.call(this,a);};}
  let accepted=0;for(let tick=0;tick<4;tick++){s.step({attack:tick===0},1);accepted+=s.state.events.filter(e=>e.kind==='hit'&&e.target===t.id).length;}return{t,accepted};}
 const before=run(true),after=run(false);assert.equal(before.accepted,1);assert.equal(after.accepted,1);assert.equal(before.t.magicPots,1);assert.equal(after.t.magicPots,1);assert.equal(before.t.state,13);assert.equal(before.t.decisionTimer,0);assert.equal(after.t.state,1);assert.equal(after.t.decisionTimer,2);
});
