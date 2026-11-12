import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Simulation} from '../dist/js/simulation.js';
const root=new URL('../',import.meta.url),assets=JSON.parse(await readFile(new URL('dist/assets/game.json',root)));
for(const m of Object.values(assets.maps)){const b=await readFile(new URL('dist/assets/'+m.cellsFile,root));m.cells=Array.from({length:b.length/2},(_,i)=>b.readUInt16LE(i*2));}
function scene(character='hero',distance=20,dy=0,type=12){
 const s=new Simulation({assets,character,healthBars:5});s.script=[];s.scriptWait=null;s.scrollLimit=216;
 const p=s.state.player;Object.assign(p,{x:100,y:174,level:1,direction:2,state:0,invulnerability:0});s.refresh(p);
 const t=s.createActor({type,x:100+distance,y:174+dy,health:12,nativeWait:1080,decisionTimer:20});t.direction=6;s.refresh(t);s.state.entities=[p,t];return{s,p,t};
}
function oldSelection(s){const original=s.playerControl.bind(s);s.playerControl=(a,i)=>{const c=original(a,i);c.combo=a.lastTarget==null?0:a.lastDistance<31?(a.combo===0?0:a.combo===1?1:11):(a.combo===0?0:a.combo===1?1:a.combo===2?6:5);return c;};}
function attack(s,t,{jump=false,run=false,old=false}={}){if(old)oldSelection(s);let accepted=0;const drops=[],dropTypes=[];for(let tick=0;tick<30;tick++){s.step(tick===0?{attack:true,jump,run,explicitRun:run}:{},1);accepted+=s.state.events.filter(e=>e.kind==='hit'&&e.target===t.id).length;for(const e of s.state.entities)if(e.isPickup&&!drops.includes(e.id)){drops.push(e.id);dropTypes.push(e.typeId);}}return{accepted,drops,dropTypes};}

test('native3fea selects exact32/64/96 distance bands and inclusive10-depth window',()=>{
 const{s,p,t}=scene();for(const[dx,expected]of[[0,5],[31,5],[32,2],[63,2],[64,0],[95,0],[96,null]]){t.x=p.x+dx;assert.equal(s.nearGoodsAttack(p),expected,'distance '+dx);}
 t.x=p.x+20;t.y=p.y+10;assert.equal(s.nearGoodsAttack(p),5);t.y=p.y+11;assert.equal(s.nearGoodsAttack(p),null);
 t.y=p.y;t.x=p.x-20;assert.equal(s.nearGoodsAttack(p),5,'native does not filter a candidate behind the attacker');t.z=80;assert.equal(s.nearGoodsAttack(p),5,'selection uses floor-adjusted depth, not sprite Z');
});
test('native3fea uses inventory+9 rather than health or wait and retains actor order',()=>{
 const{s,p,t}=scene();t.magicPots=0;assert.equal(s.nearGoodsAttack(p),null);t.magicPots=1;t.nativeWait=0;assert.equal(s.nearGoodsAttack(p),5);
 const goods=s.createActor({type:18,x:p.x+10,y:p.y,health:1});s.state.entities=[p,goods];assert.equal(s.nearGoodsAttack(p),null,'ordinary dropped goods have native inventory0 despite health1');
 goods.magicPots=1;assert.equal(s.nearGoodsAttack(p),5,'literal native type18 branch uses the inventory word');
 const far=s.createActor({type:12,x:p.x+80,y:p.y,health:12});t.x=p.x+20;t.magicPots=1;s.state.entities=[p,far,t];assert.equal(s.nearGoodsAttack(p),0,'first matching actor wins, not nearest');far.removed=true;assert.equal(s.nearGoodsAttack(p),5);
});
test('native3fea depth compensates floor height and keeps signed16 horizontal semantics',()=>{
 const{s,p,t}=scene();t.level=2;t.y=p.y+s.levelHeight(p.level)-s.levelHeight(t.level);assert.equal(s.nearGoodsAttack(p),5);t.y+=11;assert.equal(s.nearGoodsAttack(p),null);
 t.level=p.level;t.y=p.y;t.x=p.x+32768;assert.equal(s.nearGoodsAttack(p),5,'native NEG8000 and signed JL retain the word overflow');
});
test('source near-thief attack restores missing AxeBattler and Tyris contacts without enlarging rectangles',()=>{
 for(const[character,distance]of[['hero',20],['hero',30],['amazon',40],['amazon',60]]){
  const before=scene(character,distance),after=scene(character,distance),old=attack(before.s,before.t,{old:true}),now=attack(after.s,after.t);
  assert.equal(old.accepted,0,character+' old selection');assert.equal(now.accepted,1,character+' native selection');assert.equal(now.drops.length,1);assert.equal(after.t.magicPots,2);
 }
});
test('all three heroes drop exactly one potion or food for one valid close hit',()=>{
 for(const character of['amazon','hero','dwarf'])for(const type of[12,13]){const{s,t}=scene(character,20,0,type),r=attack(s,t);assert.equal(r.accepted,1,character+' '+type);assert.equal(r.drops.length,1);assert.equal(t.magicPots,2);assert.deepEqual(r.dropTypes,[type===12?18:19]);}
});
test('native attack selection preserves run, simultaneous special, air and mounted priorities',()=>{
 for(const[state,input,expected]of[[0,{attack:true,jump:true},12],[2,{attack:true},9],[3,{attack:true},8]]){const{s,p}=scene();p.state=state;p.z=state===3?20:0;s.refresh(p);s.control(p,s.playerControl(p,input));assert.equal(p.state,expected);}
 const{s,p}=scene(),m=s.createActor({type:10,x:p.x,y:p.y,health:4});s.state.entities.push(m);p.mountID=m.id;p.state=19;m.riderID=p.id;s.refresh(m);s.control(p,s.playerControl(p,{attack:true}));assert.equal(m.state,5);assert.equal(p.state,19);
});
test('native miss conditions do not create potions: exhausted wait, depth, facing and airborne hurt',()=>{
 for(const variant of['expired','depth','behind','knockback']){const{s,p,t}=scene('hero',20);if(variant==='expired')t.nativeWait=0;if(variant==='depth')t.y+=8;if(variant==='behind')t.x=p.x-20;if(variant==='knockback'){t.state=13;t.z=30;t.vz=10;s.refresh(t);}const r=attack(s,t);assert.equal(r.accepted,0,variant);assert.equal(r.drops.length,0,variant);}
});
test('P2 shares native near-goods selection and magic still precedes an ordinary attack',()=>{
 const s=new Simulation({assets,players:2,character:'dwarf',character2:'hero',healthBars:5}),p=s.state.players[1];s.script=[];s.scriptWait=null;Object.assign(p,{x:100,y:174,level:1,direction:2,state:0,magicPots:3});s.refresh(p);
 const t=s.createActor({type:12,x:120,y:174,health:12,nativeWait:1080});s.state.entities.push(t);const c=s.playerControl(p,{attack:true});assert.equal(c.combo,5);s.control(p,c);assert.equal(p.state,10);
 p.state=0;s.refresh(p);s.control(p,s.playerControl(p,{attack:true,magic:true}));assert.equal(p.state,4);assert.equal(s.magic.casterID,p.id);
});
