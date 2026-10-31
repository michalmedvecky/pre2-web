import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Simulation,nativeScale,mapFlags,directionFromInput} from '../dist/js/simulation.js';
import {LOGIC} from '../dist/js/logic-data.js';
const root=new URL('../',import.meta.url);
const assets=JSON.parse(await readFile(new URL('dist/assets/game.json',root)));
for(const m of Object.values(assets.maps)){const b=await readFile(new URL('dist/assets/'+m.cellsFile,root));m.cells=Array.from({length:b.length/2},(_,i)=>b.readUInt16LE(i*2));}
function scenario(){const sim=new Simulation({assets});sim.scriptWait=null;sim.script=[];sim.state.entities=[sim.state.player];const p=sim.state.player;p.x=100;p.y=174;p.level=1;sim.scrollLimit=216;return sim;}

test('exported original movement/animation tables match retained byte-derived fixtures',async()=>{const f=JSON.parse(await readFile(new URL('tests/fixtures/original-tables.json',root)));for(const k of ['vx','vy','stateDuration','nextState','animationSlots'])assert.deepEqual(LOGIC[k],f.tables[k]);});
test('native SAR arithmetic retains negative rounding and timer catch-up bounds',()=>{
 assert.equal(nativeScale(-3,0),-2);assert.equal(nativeScale(3,0),1);assert.equal(nativeScale(2,1),2);
 assert.equal(nativeScale(2,2),3);assert.equal(nativeScale(6,20),27);
});
test('original direction and floor/wall/level bits are not inferred from sprite art',()=>{
 assert.equal(directionFromInput({right:true}),2);assert.equal(directionFromInput({up:true}),0);
 assert.equal(directionFromInput({down:true,left:true}),5);assert.equal(directionFromInput({}),8);
 assert.deepEqual(mapFlags(0x8800),{wall:false,floor:true,level:1});
 assert.deepEqual(mapFlags(0x5000),{wall:true,floor:false,level:2});
});
test('standing jump follows original velocity14/gravity2 sequence and lands without drift',()=>{
 const sim=scenario(),p=sim.state.player;const heights=[];
 for(let i=0;i<15;i++){sim.step(i===0?{jump:true}:{},1);heights.push(174-(p.y-p.z));}
 assert.deepEqual(heights,[14,26,36,44,50,54,56,56,54,50,44,36,26,14,0]);
 assert.equal(p.x,100);assert.equal(p.y,174);assert.equal(p.vz,0);
});
test('a native wall bit blocks motion at its original level',()=>{
 const sim=scenario(),p=sim.state.player;sim.assets={...assets,maps:{'1':{width:200,height:28,cells:new Uint16Array(200*28).fill(0xc800)}}};
 p.state=1;p.direction=2;sim.refresh(p);p.transition=0;sim.step({right:true},1);
 assert.equal(p.x,100);assert.equal(p.y,174);
});
test('stage1 spawns exact types/coordinates/health at original player thresholds',()=>{
 const sim=new Simulation({assets}),p=sim.state.player;p.x=65;sim.step({},1);
 assert.equal(sim.scriptWait.op,0);assert.equal(sim.scriptWait.x,192);
 p.x=191;sim.step({},1);assert.equal(sim.state.entities.length,1);
 p.x=192;sim.step({},1);let e=sim.state.entities.find(a=>!a.isPlayer);assert.equal(e.type,'heninger');assert.equal(e.maxHealth,8);assert.equal(e.y,176);
 assert.equal(sim.scriptWait.x,208);p.x=208;sim.step({},1);
 assert.equal(sim.state.entities.filter(a=>!a.isPlayer)[1].type,'longmoan');
 assert.deepEqual(LOGIC.scripts.arcade['0'].filter(c=>c.op===1).slice(0,2).map(c=>[c.type,c.x,c.y,c.health]),[[4,376,176,8],[5,376,152,8]]);
});
test('native hit rects require depth<=7 and damage comes from original actor/state byte table',()=>{
 const sim=scenario(),a=sim.state.player,b=sim.createActor({type:4,x:120,y:174,health:8});sim.state.entities.push(b);
 a.state=5;a.direction=6;a.animationSlot=6;a.frame=0;a.hitActive=true;b.invulnerability=0;
 const m={duration:1,attackRect:[0,-60,60,60],collisionRect:[-10,-60,20,60]};
 sim.metadata=()=>m;b.y=182;sim.resolveHits();assert.equal(b.health,8);
 b.y=181;sim.resolveHits();assert.equal(b.health,8-LOGIC.damage[1*16+5]);
 const once=b.health;sim.resolveHits();assert.equal(b.health,once,'same attack is not applied repeatedly');
});

test('recorded native walking and airborne updates reproduce positions with recorded timer deltas',async()=>{
 const samples=JSON.parse(await readFile(new URL('tests/fixtures/movement-samples.json',root)));
 let walking=0,airborne=0;
 for(let i=0;i+1<samples.length;i++){
  const before=samples[i],after=samples[i+1];if(before.label!==after.label)continue;
  const raw=Buffer.from(before.entity,'hex'),state=raw.readInt16LE(0x33);
  if(!(['right','up','down'].includes(before.label)&&state===1&&after.state===1)&&!(state===3&&after.state===3&&before.z>0))continue;
  const sim=scenario(),p=sim.state.player;Object.assign(p,{x:before.x,y:before.y,z:before.z,vz:before.vz,state,
    level:raw.readInt16LE(0x18),direction:raw.readInt16LE(2),controlDirection:raw[0xf],fallSpeed:raw.readInt16LE(0x22),transition:raw.readInt16LE(0x35)});
  if(state===1){const input=Buffer.from(after.entity,'hex');p.transition=0;p.direction=input.readInt16LE(2);p.controlDirection=input[0xf];}
  sim.timerTicks=after.d63;sim.state.camera={x:0,y:8};sim.move(p);
  assert.deepEqual([p.x,p.y,p.z,p.vz],[after.x,after.y,after.z,after.vz],`${before.label} ${before.frame}→${after.frame}, dt=${after.d63}`);
  if(state===1)walking++;else airborne++;
 }
 assert.ok(walking>=10);assert.ok(airborne>=5);
});

test('recorded first close attack matches attack animation and both health sequences',async()=>{
 const rows=JSON.parse(await readFile(new URL('tests/fixtures/close-attack-samples.json',root)));
 const sim=scenario(),p=sim.state.player;Object.assign(p,{x:124,y:174,state:0,health:10,level:1});sim.refresh(p);
 const enemy=sim.createActor({type:4,x:156,y:176,health:4});enemy.direction=7;sim.refresh(enemy);
 sim.state.entities=[p,enemy];sim.state.camera={x:38,y:8};
 // The captured target stood still. This isolates the ported attack from AI and IRQ timer phase.
 sim.enemyControl=()=>({direction:8,attack:false});
 for(let i=1;i<rows.length;i++){
  sim.step(i===1?{attack:true}:{},rows[i].d63);
  const [a,b]=rows[i].actors,frame=Buffer.from(a.entity,'hex').readUInt16LE(0x37);
  assert.deepEqual([p.state,p.frame,p.health,enemy.health],[a.state,frame,a.hp,b.hp],`native sample ${i}`);
 }
});
test('Arcade and Beginner progression inserts original bonus maps and preserves stats',()=>{
 const sim=scenario();sim.state.player.health=7;sim.state.player.magicPots=3;sim.state.status='stage-complete';
 assert.equal(sim.advanceStage(),true);assert.equal(sim.state.stageIndex,16);assert.equal(sim.state.stage,'1');assert.equal(sim.state.player.health,7);assert.equal(sim.state.player.magicPots,3);
 sim.state.status='stage-complete';sim.advanceStage();assert.equal(sim.state.stageIndex,1);assert.equal(sim.state.stage,'2');
 const beginner=new Simulation({assets,mode:'beginner',stageIndex:2});beginner.state.status='stage-complete';beginner.advanceStage();assert.equal(beginner.state.stageIndex,18);
 beginner.state.status='stage-complete';assert.equal(beginner.advanceStage(),false);assert.equal(beginner.state.status,'ending-incomplete');
});
test('original magic consumes pots and applies native whole-screen damage after the spell',()=>{
 const sim=scenario(),p=sim.state.player,e=sim.createActor({type:4,x:250,y:174,health:8});sim.state.entities.push(e);p.magicPots=2;
 sim.step({magic:true},1);assert.ok(sim.magic);assert.equal(e.health,8);
 let count=0;while(sim.magic&&count++<120)sim.step({},1);
 assert.ok(count<120);assert.equal(p.magicPots,0);assert.equal(e.health,4);
});

test('boarding and mounted movement use original attachment offsets and preserve rider identity',()=>{
 const sim=scenario(),p=sim.state.player,m=sim.createActor({type:10,x:100,y:174,health:4});sim.state.entities.push(m);
 sim.tryMounts();assert.equal(p.mountID,m.id);assert.equal(m.riderID,p.id);assert.equal(p.state,20);
 p.state=19;sim.refresh(p);const x=m.x;for(let i=0;i<4;i++)sim.step({right:true},1);
 assert.ok(m.x>x);assert.equal(p.y,m.y+1);assert.equal(p.level,m.level);assert.equal(p.mountID,m.id);
 sim.step({magic:true},1);assert.equal(p.mountID,null);assert.equal(m.riderID,null);assert.ok(sim.magic);
});
test('thief drops a native potion and collection respects original per-character cap',()=>{
 const sim=scenario(),p=sim.state.player,t=sim.createActor({type:12,x:100,y:174,health:8});sim.state.entities.push(t);
 assert.equal(t.magicPots,2);sim.dropPickup(t);assert.equal(t.magicPots,1);
 const item=sim.state.entities.find(a=>a.typeId===18);assert.equal(item.vz,22);assert.equal(item.state,13);
 item.z=0;item.x=p.x;item.y=p.y;item.level=p.level;p.magicPots=LOGIC.maxPots[p.typeId]-1;sim.collectPickups();assert.equal(p.magicPots,LOGIC.maxPots[p.typeId]);assert.equal(item.removed,true);
});
test('life loss respawns on actual map floor while knockdown alone does not cost a life',()=>{
 const sim=scenario(),p=sim.state.player;p.state=14;p.health=10;sim.refresh(p);sim.step({},1);assert.equal(sim.state.lives,3);
 p.removed=true;sim.step({},1);assert.equal(sim.state.lives,2);assert.equal(p.health,LOGIC.playerHealth);assert.ok(sim.tile(p.x,p.y).floor);
});

test('native 2ee2 rectangle edges are inclusive and a one-pixel gap misses',()=>{
 function attempt(targetX){const sim=scenario(),p=sim.state.player,e=sim.createActor({type:4,x:targetX,y:174,health:8});sim.state.entities.push(e);
  p.state=5;p.direction=6;p.hitActive=true;e.invulnerability=0;
  sim.metadata=()=>({attackRect:[0,-60,60,60],collisionRect:[-10,-60,20,60]});sim.resolveHits();return e.health;}
 assert.equal(attempt(170),8-LOGIC.damage[21]);assert.equal(attempt(171),8);
});
test('native wall layers block at equal level but do not block an actor above them',()=>{
 const sim=scenario(),p=sim.state.player;sim.assets={...assets,maps:{'1':{width:200,height:28,cells:new Uint16Array(5600).fill(0xc000)}}};
 p.state=1;p.direction=2;p.level=1;p.transition=0;sim.timerTicks=1;sim.move(p);assert.equal(p.x,102);
 p.x=100;p.level=0;sim.move(p);assert.equal(p.x,100);
});

test('two players have original starts and independent inputs and resources',()=>{
 const sim=new Simulation({assets,players:2,character:'hero',character2:'amazon'});assert.equal(sim.state.players.length,2);
 const [a,b]=sim.state.players;assert.deepEqual([a.x,a.y,b.x,b.y],[8,174,8,188]);sim.script=[];sim.scriptWait=null;
 a.x=100;b.x=120;sim.scrollLimit=216;sim.step({players:[{right:true},{up:true}]},1);
 assert.equal(a.x,102);assert.equal(b.x,120);assert.equal(b.y,186);assert.equal(a.y,174);
 a.magicPots=3;assert.equal(b.magicPots,1);a.removed=true;sim.step({players:[{},{}]},1);assert.equal(a.lives,2);assert.equal(b.lives,3);
});
test('Duel uses MAP5 arena and original HP/positions instead of forest stage1',()=>{
 const sim=new Simulation({assets,mode:'duel',players:2});assert.equal(sim.state.stage,'5');assert.deepEqual(sim.state.camera,{x:536,y:152});
 assert.deepEqual(sim.state.players.map(p=>[p.x,p.y,p.health,p.lives,p.magicPots]),[[560,320,32,1,0],[832,320,32,1,0]]);
 assert.equal(sim.script,LOGIC.scripts.duel['15']);
});
test('continue consumes one original shared credit and restores three lives at safe floor',()=>{
 const sim=scenario(),p=sim.state.player;p.lives=1;p.removed=true;sim.step({},1);assert.equal(sim.state.status,'continue');assert.equal(sim.state.credits,3);
 assert.equal(sim.continueGame(true),true);assert.equal(sim.state.credits,2);assert.equal(p.lives,3);assert.equal(sim.state.status,'playing');assert.ok(sim.tile(p.x,p.y).floor);
});
test('original result formula reproduces native zero-score / used3 / strength30.0',()=>{
 const sim=scenario(),p=sim.state.player;p.killPoints=0;p.deaths=2;assert.deepEqual(sim.calculateResults()[0].totalTenths,0);assert.equal(sim.state.results[0].usedPlayers,3);assert.equal(sim.state.results[0].strengthTenths,300);
 p.killPoints=300;p.deaths=1;const r=sim.calculateResults()[0];assert.equal(r.totalTenths,300);assert.equal(r.strengthTenths,450);
});

test('IDDQD blocks enemy damage and restores a falling player without life loss',()=>{
 const sim=scenario(),p=sim.state.player,e=sim.createActor({type:4,x:120,y:174,health:8});sim.state.entities.push(e);
 e.direction=6;e.state=5;e.hitActive=true;p.hitActive=false;p.invulnerability=0;sim.metadata=()=>({attackRect:[-40,-60,80,60],collisionRect:[-10,-60,20,60]});
 sim.setGodMode(true);sim.resolveHits();assert.equal(p.health,12);assert.equal(p.state,0);
 sim.setGodMode(false);sim.resolveHits();assert.ok(p.health<12);
 sim.setGodMode(true);p.lastSafe={x:100,y:174,level:1};p.y=1000;p.z=0;p.vz=0;p.fallSpeed=8;const health=p.health,lives=p.lives;sim.timerTicks=1;sim.move(p);
 assert.equal(p.y,174);assert.equal(p.health,health);assert.equal(p.lives,lives);assert.equal(p.fallSpeed,0);
});
test('MAP teleport rejects void/wall/outside and accepts actual floor with its native level',()=>{
 const sim=scenario(),p=sim.state.player,x=p.x,y=p.y;
 assert.equal(sim.teleport(0,-1,174).ok,false);assert.deepEqual([p.x,p.y],[x,y]);
 const m=sim.map(),copy={...m,cells:Uint16Array.from(m.cells)};sim.assets={...assets,maps:{...assets.maps,'1':copy}};
 copy.cells[(160>>3)*m.width+(200>>3)]=0;assert.equal(sim.teleport(0,200,160).ok,false);
 copy.cells[(160>>3)*m.width+(200>>3)]=0xc800;assert.equal(sim.teleport(0,200,160).ok,false);
 copy.cells[(160>>3)*m.width+(200>>3)]=0x9000;assert.equal(sim.teleport(0,200,160).ok,true);assert.deepEqual([p.x,p.y,p.z,p.level],[200,160,0,2]);
});

// Native 54d5 sets facing before common control; without it the flee state
// incorrectly collapsed into walk and op2(255) never completed.
test('all four original bonus thief waits finish using idle input without bypassing scripts',()=>{
 for(const stageIndex of [16,17,18,19]){const sim=new Simulation({assets,stageIndex});let updates=0;
  while(sim.state.status==='playing'&&updates++<1500)sim.step({});
  assert.equal(sim.state.status,'stage-complete',`bonus ${stageIndex}`);
  assert.equal(sim.state.entities.filter(a=>!a.removed&&[12,13].includes(a.typeId)).length,0);
 }
});
test('native 4dcc chooses nearest goal residual, not nearest player position, and P1 wins ties',()=>{
 const sim=new Simulation({assets,players:2});sim.aiSlots=[[],[]];const [p1,p2]=sim.state.players;
 Object.assign(p1,{x:100,y:174,snapshotX:100,snapshotY:174,snapshotLevel:1});
 Object.assign(p2,{x:160,y:174,snapshotX:160,snapshotY:174,snapshotLevel:1});
 const a=sim.createActor({type:4,x:125,y:174,health:8});
 const near=LOGIC.aiNearDistance[4];assert.ok(near>0);
 sim.aiSlots[0]=[sim.createActor({type:4,x:110,y:174,health:8})];
 const g1=sim.enemyGoal(a,p1),g2=sim.enemyGoal(a,p2);assert.equal(g1.rank,1);
 assert.equal(g1.dx,125-(100-near));assert.equal(g2.dx,125-(160-near));
 assert.ok(g2.distance<g1.distance);sim.enemyControl(a,p1);assert.equal(a.targetPlayerID,p2.id);
 assert.equal(sim.state.credits,4);
 sim.aiSlots=[[],[]];Object.assign(p2,{x:p1.x,y:p1.y,snapshotX:p1.snapshotX,snapshotY:p1.snapshotY});sim.enemyControl(a,p1);assert.equal(a.targetPlayerID,p1.id);
});

test('native thrown actor follows owner then releases with VZ12 on the next movement update',()=>{
 const sim=scenario(),owner=sim.state.player,victim=sim.createActor({type:4,x:120,y:174,health:8});
 sim.state.entities.push(victim);Object.assign(owner,{state:16,x:110,y:174,z:2,frame:0});sim.refresh(owner);
 Object.assign(victim,{state:17,frame:0,followActorID:owner.id,vz:0});sim.timerTicks=1;sim.move(victim);
 assert.deepEqual([victim.x,victim.y,victim.z,victim.vz],[110,173,34,0]);
 owner.frame=sim.frames(owner).length-1;sim.move(victim);assert.equal(victim.frame,1);assert.equal(victim.vz,12);assert.equal(victim.z,34);
});

test('native Options CL health multiplier governs initial HP, healing, respawn and score denominator',()=>{
 const sim=new Simulation({assets,healthBars:5});assert.equal(sim.state.player.health,20);
 const p=sim.state.player;p.health=18;sim.takePickup(sim.createActor({type:19,x:p.x,y:p.y,health:1}),p);assert.equal(p.health,20);
 p.killPoints=100;assert.equal(sim.calculateResults()[0].totalTenths,60);sim.respawn(p);assert.equal(p.health,20);
 const duel=new Simulation({assets,mode:'duel',healthBars:5});assert.equal(duel.state.player.health,32);
});
test('native 4dcc evaluates navigation side effects for both player candidates',()=>{
 const sim=new Simulation({assets,players:2});sim.aiSlots=[[],[]];const a=sim.createActor({type:4,x:200,y:174,health:8});
 let calls=0;sim.navigate=(actor,bits,faceBits)=>{calls++;actor.navigationDelay=(actor.navigationDelay||0)+1;return{bits,faceBits,jump:false};};
 sim.enemyControl(a,sim.state.player);assert.equal(calls,2);assert.equal(a.navigationDelay,2);
});
test('native 2e41 forward hit skips reciprocal hit and reverse hit ends the candidate row',()=>{
 const sim=scenario(),a=sim.state.player,b=sim.createActor({type:4,x:110,y:174,health:8}),c=sim.createActor({type:5,x:120,y:174,health:8});sim.state.entities=[a,b,c];
 const visited=[];sim.tryHit=(from,to)=>{visited.push([from.id,to.id]);return from===b&&to===a;};sim.resolveHits();
 assert.deepEqual(visited,[[a.id,b.id],[b.id,a.id],[b.id,c.id],[c.id,b.id]]);
});
test('native pickup eligibility supports attack overlap and exhausted thieves reject hits',()=>{
 const sim=scenario(),p=sim.state.player,item=sim.createActor({type:18,x:110,y:174,health:1}),thief=sim.createActor({type:12,x:110,y:174,health:8});
 sim.metadata=()=>({attackRect:[-40,-40,80,80],collisionRect:[-10,-40,20,80]});
 const before=p.magicPots;assert.equal(sim.tryHit(p,item),false);assert.equal(item.removed,true);assert.equal(p.magicPots,before+1);
 thief.nativeWait=0;assert.equal(sim.tryHit(p,thief),false);assert.equal(thief.health,8);
});
test('an eliminated 2P actor stays absent after stage transition',()=>{
 const sim=new Simulation({assets,players:2});const p2=sim.state.players[1];p2.eliminated=true;p2.removed=true;p2.health=0;
 sim.state.status='stage-complete';sim.advanceStage();assert.equal(sim.state.players[1].eliminated,true);assert.equal(sim.state.players[1].removed,true);
});

test('original two-player Duel advances two rounds and resets defeated fighter for round two',()=>{
 const sim=new Simulation({assets,mode:'duel',players:2});const p2=sim.state.players[1];p2.removed=true;p2.eliminated=true;p2.health=0;p2.lives=0;
 sim.state.status='duel-result';assert.equal(sim.advanceStage(),true);assert.equal(sim.state.stageIndex,1);
 assert.deepEqual(sim.state.players.map(p=>[p.health,p.lives,p.removed,p.eliminated]),[[32,1,false,false],[32,1,false,false]]);
 sim.state.status='duel-result';assert.equal(sim.advanceStage(),false);assert.equal(sim.state.status,'ending-incomplete');
});

test('native Life Meter Options cycles exactly three, four and five stars',()=>{
 assert.deepEqual(LOGIC.options.healthBars,[3,4,5]);assert.deepEqual(LOGIC.options.healthDisplay,['***','****','*****']);
 assert.equal(LOGIC.options.defaultHealthBars,3);assert.throws(()=>new Simulation({assets,healthBars:2}),RangeError);
 for(const healthBars of LOGIC.options.healthBars)assert.equal(new Simulation({assets,healthBars}).state.player.health,healthBars*4);
});

test('native unsigned FFFF rank sentinel caps high score at rank seven',()=>{
 assert.equal(LOGIC.scoreRankThresholds[7],65535);const sim=scenario();sim.state.player.killPoints=9999;
 assert.equal(sim.calculateResults()[0].rank,7);
});

test('native lethal lifecycle stays FF until knockback transition, then FE blink/voice and FD cleanup',()=>{
 const sim=scenario(),e=sim.createActor({type:4,x:120,y:174,health:0});sim.state.entities.push(e);
 Object.assign(e,{dead:true,lifecycle:255,state:13,transition:1,z:0,vz:0});sim.animate(e);
 assert.equal(e.state,14);assert.equal(e.lifecycle,254);assert.equal(e.removed,false);
 assert.ok(sim.state.events.some(v=>v.kind==='sfx'&&v.id===1));
 sim.prepareDrawAndCleanup();assert.equal(e.blinkHidden,true);assert.equal(e.removed,false);
 sim.prepareDrawAndCleanup();assert.equal(e.blinkHidden,false);
 e.frameTimer=0;e.transition=0;sim.animate(e);assert.equal(e.lifecycle,253);sim.prepareDrawAndCleanup();assert.equal(e.removed,true);
});
test('original death voice distinguishes amazon/evillady, male combatants and silent mounts',()=>{
 const sim=scenario();for(const [type,id] of [[0,0],[9,0],[1,1],[8,1],[11,null]]){sim.state.events=[];sim.deathVoice({typeId:type,id:99});assert.equal(sim.state.events[0]?.id??null,id);}
});
test('native magic1e35 frees mounted rider and cleanup2d1f clears stale mount references',()=>{
 const sim=scenario(),p=sim.state.player,m=sim.createActor({type:11,x:150,y:174,health:4}),r=sim.createActor({type:9,x:150,y:175,health:2});sim.state.entities.push(r,m);
 Object.assign(r,{state:19,mountID:m.id});m.riderID=r.id;p.magicPots=1;sim.step({magic:true},1);
 for(let i=0;i<2000&&sim.magic;i++)sim.step({},1);assert.equal(r.mountID,null);assert.equal(m.riderID,null);assert.equal(r.health,0);
 r.removed=true;m.riderID=r.id;sim.prepareDrawAndCleanup();assert.equal(m.riderID,null);
});

test('native active thief viewport bounds hold loot on-screen until its original escape countdown expires',()=>{
 const sim=scenario(),a=sim.createActor({type:12,x:57,y:174,health:8});sim.state.entities.push(a);
 Object.assign(a,{state:2,direction:6,nativeWait:100,transition:0});sim.timerTicks=1;sim.move(a);assert.equal(a.x,57);
 a.nativeWait=0;a.transition=0;sim.move(a);assert.ok(a.x<57);
 const bonus=new Simulation({assets,stageIndex:16}),p=bonus.state.player;p.x=bonus.state.camera.x+10;p.y=174;p.state=1;p.direction=6;p.transition=0;bonus.assets={...assets,maps:{...assets.maps,'1':{width:200,height:28,cells:new Uint16Array(5600).fill(0x8800)}}};bonus.timerTicks=1;bonus.move(p);assert.equal(p.x,bonus.state.camera.x+8);
});

test('mounted chicken and native flag5 flame attacks use original rectangles to hurt enemies and drop thief pots',()=>{
 for(const type of [10,11])for(const enemyType of [4,12]){const sim=scenario(),p=sim.state.player;p.x=150;
  const m=sim.createActor({type,x:150,y:174,health:4,flag:5}),e=sim.createActor({type:enemyType,x:195,y:174,health:12});m.direction=2;
  sim.state.entities.push(m,e);sim.enemyControl=()=>({direction:8});const originalPots=e.magicPots;
  for(let i=0;i<120;i++)sim.step({attack:i%25===0},1);assert.equal(p.state,19);
  if(enemyType===4)assert.ok(e.health<12,`mount type${type} original HP changes`);else assert.ok(e.magicPots<originalPots,`mount type${type} thief drop`);
 }
});
test('each original spell starts and stops SND10 loop at its phase boundary',()=>{
 for(const character of ['hero','dwarf','amazon']){const sim=new Simulation({assets,character});sim.script=[];sim.scriptWait=null;const events=[];
  sim.step({magic:true},1);for(let i=0;i<1000&&sim.magic;i++){sim.step({},1);events.push(...sim.state.events);}
  assert.equal(events.filter(e=>e.kind==='sfx-loop-start'&&e.id===10).length,1);assert.equal(events.filter(e=>e.kind==='sfx-stop').length,1);
 }
});

test('native flag4 dragon fireball preserves native VZ0 and two-probe airborne passage, then hits real frameboxes',()=>{
 for(const enemyType of [9,12]){const sim=scenario(),p=sim.state.player;p.x=150;
  const m=sim.createActor({type:11,x:150,y:174,health:4,flag:4}),e=sim.createActor({type:enemyType,x:230,y:174,health:12});m.direction=2;sim.state.entities.push(m,e);sim.enemyControl=()=>({direction:8});
  for(let i=0;i<120;i++)sim.step({attack:i%25===0},1);
  // Finished projectiles are compacted by original298c rather than retained forever.
  
  if(enemyType===9)assert.ok(e.health<12);else assert.equal(e.magicPots,3,'native fixed-height fireball passes above the short thief rectangle');
 }
 const sim=scenario(),p=sim.state.player,m=sim.createActor({type:11,x:150,y:174,health:4,flag:4});m.direction=2;sim.spawnProjectile(m,p);const f=sim.state.entities.at(-1);assert.equal(f.vz,0);assert.equal(f.y,173);
});

test('native thief15dd/15ef velocities and rejected void reset decision timer',()=>{
 assert.deepEqual(LOGIC.thiefVX,[0,12,12,12,0,-12,-12,-12,0]);
 const sim=scenario(),a=sim.createActor({type:12,x:100,y:174,health:8});Object.assign(a,{state:1,direction:2,transition:0,decisionTimer:4});
 sim.timerTicks=1;sim.move(a);assert.equal(a.x,112);
 sim.assets={...assets,maps:{'1':{width:200,height:28,cells:new Uint16Array(5600)}}};sim.move(a);assert.equal(a.x,112);assert.equal(a.decisionTimer,0);
});
test('native Beginner halves script actor HP except potion and food thieves',()=>{
 const sim=new Simulation({assets,mode:'beginner'});sim.scriptWait=null;sim.script=[{op:1,type:4,x:120,y:174,health:8},{op:1,type:12,x:140,y:174,health:12},{op:3}];sim.scriptPC=0;sim.runScript();
 assert.equal(sim.state.entities.find(a=>a.typeId===4).health,4);assert.equal(sim.state.entities.find(a=>a.typeId===12).health,12);
});

test('native2d85 wraps 16-bit row search instead of failing below the final visible floor',()=>{
 const sim=new Simulation({assets,stageIndex:2,character:'dwarf',healthBars:5});sim.state.camera={x:258,y:132};const p=sim.state.player;p.removed=true;p.health=0;
 sim.respawn(p);assert.equal(p.removed,false);assert.equal(p.health,20);assert.ok(sim.tile(p.x,p.y).floor);assert.ok(p.y<242,'native word-wrap finds a floor above the initial row');
});
test('magic1e35 uses original impact3 and thief drop8 cues while preserving thief HP',()=>{
 const sim=scenario(),p=sim.state.player,e=sim.createActor({type:12,x:150,y:174,health:12});sim.state.entities.push(e);const events=[];
 sim.step({magic:true},1);for(let i=0;i<1000&&sim.magic;i++){sim.step({},1);events.push(...sim.state.events);}
 assert.equal(e.health,12);assert.equal(e.magicPots,2);assert.ok(events.some(v=>v.kind==='sfx'&&v.id===3));assert.ok(events.some(v=>v.kind==='sfx'&&v.id===8));
});

test('native mounted4051 prioritizes attack over jump and has no generic special12/airattack8',()=>{
 const sim=scenario(),p=sim.state.player,m=sim.createActor({type:10,x:100,y:174,health:4});sim.state.entities.push(m);m.riderID=p.id;p.mountID=m.id;p.state=19;m.state=0;
 sim.controlRider(p,{attack:true,jump:true,direction:2});assert.equal(m.state,5);assert.equal(m.vz,0);
 m.state=3;m.z=10;m.vz=4;sim.controlRider(p,{attack:true,direction:2});assert.equal(m.state,3);
});

test('native4114 selector maps sprite spawn flag4 to fireball16 and flag5 to flame17',()=>{
 const sim=scenario(),p=sim.state.player;for(const [flag,type]of [[4,16],[5,17]]){const m=sim.createActor({type:11,x:150,y:174,health:4,flag});sim.spawnProjectile(m,p);assert.equal(sim.state.entities.at(-1).typeId,type);}
});

test('native rooftop thief keeps refused candidate floor probe and falls in place instead of softlocking',()=>{
 const sim=scenario(),p=sim.state.player;sim.state.camera={x:946,y:4};sim.scrollLimit=944;sim.maxCameraY=199;Object.assign(p,{x:1208,y:164,level:1,snapshotX:1208,snapshotY:164,snapshotLevel:1});
 const t=sim.createActor({type:12,x:1243,y:104,health:4,variant:3});Object.assign(t,{level:2,direction:2,state:1,transition:0,nativeWait:0,magicPots:0,decisionTimer:0});sim.state.entities.push(t);
 const samples=[];for(let i=0;i<25;i++){sim.step({},1);samples.push({x:t.x,y:t.y,fall:t.fallSpeed,level:t.level});}
 assert.equal(samples[2].fall,2);assert.equal(samples[3].y,106);assert.ok(samples.some(s=>s.y>=160&&s.level===1));
});
test('explicit native-device run input skips keyboard doubletap while existing inputs retain it',()=>{
 function twice(explicitRun){const sim=scenario();sim.step({right:true,explicitRun},1);sim.step({},1);sim.step({right:true,explicitRun},1);return sim.state.player.state;}
 assert.equal(twice(false),2);assert.equal(twice(true),1);
});

test('native6602/6e4c reload only map and current stage sprite palette banks',()=>{
 const sim=scenario();sim.state.paletteRecords=[26,44,12,55];sim.loadStage(6);
 assert.equal(sim.state.stage,'7');assert.equal(sim.state.paletteRecords.includes(26),false);assert.equal(sim.state.paletteRecords.includes(44),false);
 assert.ok(sim.state.paletteRecords.includes(12));assert.equal(sim.state.paletteRecords.includes(55),false);
 assert.deepEqual(LOGIC.stageSpriteLoads.arcade['6'].map(v=>v.record),[60,13,41]);assert.ok(sim.state.paletteRecords.includes(41));
});

test('hero and dwarf loop onset waits for prior speaker bits without stopping magic graphics',()=>{
 for(const character of ['hero','dwarf']){const sim=new Simulation({assets,character});sim.script=[];sim.scriptWait=null;sim.speakerClock.play(0);sim.step({magic:true},1);const events=[];
  for(let i=0;i<10;i++){sim.step({},1);events.push(...sim.state.events);}assert.equal(sim.speakerClock.effect,0);assert.equal(events.some(e=>e.kind==='sfx-loop-start'),false);
  assert.ok(character==='hero'?sim.magic.timer<90:sim.magic.x>-32);
  for(let i=0;i<200&&sim.magic;i++){sim.step({},1);events.push(...sim.state.events);}assert.equal(events.filter(e=>e.kind==='sfx-loop-start').length,1);
 }
});
test('Amazon native phase0→1 loop onset overrides an existing speaker effect unconditionally',()=>{
 const sim=new Simulation({assets,character:'amazon'});sim.script=[];sim.scriptWait=null;sim.speakerClock.play(0);sim.step({magic:true},1);
 for(let i=0;i<12;i++)sim.step({},1);assert.equal(sim.magic.phase,1);assert.equal(sim.speakerClock.effect,10);assert.equal(sim.speakerClock.loop,true);
});
test('speaker PIT cursor advances during Continue and deep-cloned lookahead clock stays independent',()=>{
 const sim=scenario();sim.speakerClock.play(0);sim.state.status='continue';sim.state.continueTicks=1000;const before=sim.speakerClock.remainingBits;sim.step({},1);assert.ok(sim.speakerClock.remainingBits<before);
 const clone=structuredClone(sim.speakerClock);Object.setPrototypeOf(clone,Object.getPrototypeOf(sim.speakerClock));const unchanged=sim.speakerClock.remainingBits;clone.advancePIT(170);assert.equal(sim.speakerClock.remainingBits,unchanged);assert.equal(clone.remainingBits,unchanged-1);
});

test('native3132 projectile victim facing uses creator/rider X and drops pot toward that owner',()=>{
 const sim=new Simulation({assets,stageIndex:2,character:'dwarf'}),p=sim.state.player;Object.assign(p,{x:88,y:209,z:33,level:3,state:19,magicPots:0});
 const m=sim.createActor({type:11,x:89,y:208,health:4,flag:5}),t=sim.createActor({type:12,x:129,y:208,health:12});m.direction=2;m.riderID=p.id;p.mountID=m.id;t.direction=6;sim.refresh(t);sim.state.entities=[p,m,t];sim.spawnProjectile(m,p);const flame=sim.state.entities.at(-1);
 assert.equal(flame.x,131);assert.equal(sim.tryHit(flame,t),true);assert.equal(t.direction,6);assert.equal(t.magicPots,2);const pot=sim.state.entities.find(a=>a.typeId===18);assert.equal(pot.direction,2);assert.equal(pot.y,208);assert.equal(pot.level,3);assert.equal(pot.vz,22);
});
test('native276a/26d4/271f clone pickup and projectile layer/Z/snapshot instead of inferring floor layer',()=>{
 const sim=scenario(),p=sim.state.player;for(const type of [12,13]){const t=sim.createActor({type,x:129,y:174,health:12});Object.assign(t,{z:11,level:4,direction:6});sim.dropPickup(t);const a=sim.state.entities.at(-1);assert.equal(a.typeId,type===12?18:19);assert.deepEqual([a.y,a.z,a.level,a.snapshotY,a.snapshotZ,a.snapshotLevel],[174,11,4,174,11,4]);}
 const m=sim.createActor({type:11,x:150,y:174,health:4,flag:5});Object.assign(m,{level:4,z:11,direction:2});sim.spawnProjectile(m,p);const a=sim.state.entities.at(-1);assert.deepEqual([a.y,a.z,a.level,a.snapshotY,a.snapshotZ,a.snapshotLevel],[173,55,4,173,55,4]);
});
test('native pickup SAR horizontal speed matches19 recorded conditional native pot flight/landing updates',async()=>{
 const archive=JSON.parse(await readFile(new URL('tests/fixtures/native-pot-archive-extract.json',root))),samples=archive.samples.filter(s=>s.sample>=7&&s.sample<=26),sim=new Simulation({assets,stageIndex:2}),first=samples[0];
 const a=sim.createActor({type:18,x:first.x,y:first.y});Object.assign(a,{level:first.level,z:first.z,vz:first.vz,direction:first.direction,state:first.state,transition:0});sim.refresh(a);
 for(const expected of samples.slice(1)){sim.timerTicks=expected.d63;sim.move(a);for(const key of ['x','y','z','level','vz'])assert.equal(a[key],expected[key],`native sample${expected.sample} ${key}`);}
 assert.deepEqual([a.x,a.y,a.z,a.level],[54,208,0,3]);
});
test('native1e99/1eb0 magic drop cue8 occurs only for a nonempty potion or food thief',()=>{
 for(const type of [12,13])for(const pots of [0,1]){const sim=scenario(),e=sim.createActor({type,x:150,y:174,health:12});e.magicPots=pots;e.nativeWait=pots?1080:0;sim.state.entities.push(e);const events=[];sim.step({magic:true},1);events.push(...sim.state.events);for(let i=0;i<1000&&sim.magic;i++){sim.step({},1);events.push(...sim.state.events);}assert.equal(events.filter(v=>v.kind==='sfx'&&v.id===8).length,pots);assert.equal(e.magicPots,0);assert.equal(e.health,12);assert.equal(sim.state.entities.filter(a=>a.typeId===type+6).length,pots);}
});
