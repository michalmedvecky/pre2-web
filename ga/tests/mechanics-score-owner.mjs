import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
import{Simulation}from'../dist/js/simulation.js';
const assets=JSON.parse(await readFile(new URL('../dist/assets/game.json',import.meta.url))),native=JSON.parse(await readFile(new URL('./fixtures/native-score-32b4.json',import.meta.url)));
for(const m of Object.values(assets.maps)){const b=await readFile(new URL('../dist/assets/'+m.cellsFile,import.meta.url));m.cells=Uint16Array.from({length:b.length/2},(_,i)=>b.readUInt16LE(i*2));}
function scenario(players=1){const s=new Simulation({assets,character:'dwarf',players,character2:'hero'});s.script=[];s.scriptWait=null;s.state.entities=[...s.state.players];for(const p of s.state.players)Object.assign(p,{x:100,y:174,z:0,level:1});return s;}
test('AXE32b4 native executed eight-case score vectors match owner selection and 16-bit addition',()=>{
 assert(native.allPass);assert.equal(native.routineHex,'56833c10740f833c11740a833c0a7405833c0b75038b74468b452a01440b5ec3');
 for(const row of native.cases){const s=scenario(),owner=s.state.player,a=s.createActor({type:row.type,x:120,y:174,health:4}),victim=s.createActor({type:4,x:160,y:174,parameter:row.points});owner.killPoints=row.ownerInitial;a.killPoints=row.initial;a.riderID=owner.id;s.state.entities.push(a,victim);s.awardKill(a,victim);assert.equal(a.killPoints,row.actualAttacker,'attacker type'+row.type);assert.equal(owner.killPoints,row.actualOwner,'owner type'+row.type);}
});
test('actual original attack headers credit chicken, dragon, fireball and flame kills to the owning P2 only',()=>{
 for(const type of[10,11,16,17]){const s=scenario(2),[p1,p2]=s.state.players,m=s.createActor({type,x:150,y:174,health:4}),e=s.createActor({type:4,x:type===11?105:145,y:174,health:1,parameter:7});
  p1.killPoints=10;p2.killPoints=20;m.direction=6;m.riderID=p2.id;m.ownerID=p1.id; // native+46 is authoritative, not the unrelated convenience ownerID.
  m.state=type===10?5:type===17?0:9;s.refresh(m);m.frame=type===10?1:0;if(type===17)m.z=44;s.state.entities.push(m,e);
  assert(s.tryHit(m,e),'native attack overlaps type'+type);assert.equal(e.health,0);assert.equal(p1.killPoints,10);assert.equal(p2.killPoints,27);assert.equal(s.state.score,27);assert.equal(m.killPoints,undefined);assert(!s.tryHit(m,e),'dead knockback cannot award twice');assert.equal(p2.killPoints,27);
 }
});
test('ordinary nonlethal hits do not grant kill points and player direct kills still do',()=>{
 const s=scenario(),p=s.state.player,e=s.createActor({type:4,x:140,y:174,health:2,parameter:7});p.x=150;p.direction=6;p.state=5;s.refresh(p);p.frame=1;s.state.entities.push(e);assert(s.tryHit(p,e));assert.equal(e.health,1);assert.equal(p.killPoints,0);e.state=0;s.refresh(e);assert(s.tryHit(p,e));assert.equal(e.health,0);assert.equal(p.killPoints,7);
});
test('missing projectile owner never credits a different player, while native NPC score stays off player HUD',()=>{
 const s=scenario(),p=s.state.player,a=s.createActor({type:16,x:150,y:174,health:4});p.killPoints=10;a.riderID=999;s.state.entities.push(a);s.awardKill(a,{parameter:7});assert.equal(p.killPoints,10);assert.equal(s.state.score,0);const npc=s.createActor({type:4,x:150,y:174,health:4});s.awardKill(npc,{parameter:7});assert.equal(npc.killPoints,7);assert.equal(p.killPoints,10);assert.equal(s.state.score,0);
});
test('spell-completion caller uses the same native 16-bit kill score arithmetic',()=>{
 const s=scenario(),p=s.state.player,e=s.createActor({type:4,x:140,y:174,health:1,parameter:7});s.state.entities.push(e);s.enemyControl=()=>({direction:8});s.state.godMode=true;p.killPoints=65530;p.magicPots=1;s.step({magic:true},1);assert(s.magic);for(let i=0;i<3000&&s.magic;i++)s.step({},1);assert.equal(s.magic,null);assert.equal(e.health,0);assert.equal(p.killPoints,1);assert.equal(s.state.score,1);
});

test('AXE30cb original native fragment vectors retain first-hit spacing and byte-wrap repeated combos',async()=>{
 const vectors=JSON.parse(await readFile(new URL('./fixtures/native-combo-30cb.json',import.meta.url)));
 for(const row of vectors.cases){const s=scenario(),p=s.state.player,e=s.createActor({type:row.victimType,x:row.victimX,y:174,health:20});Object.assign(p,{x:row.x,combo:row.combo,lastTarget:row.lastTarget,lastDistance:row.distance});Object.assign(e,{id:0x400,state:row.state});s.recordComboHit(p,e);assert.equal(p.combo,row.actualCombo,row.label);assert.equal(p.lastDistance,row.actualDistance,row.label);assert.equal(p.lastTarget,row.actualLastTarget,row.label);}
});
test('actual repeat hurt hit keeps native far-chain finisher when current spacing becomes close',()=>{
 const s=scenario(),p=s.state.player,e=s.createActor({type:4,x:140,y:174,health:20});s.state.entities.push(e);Object.assign(p,{x:150,direction:6,state:5,combo:1,lastTarget:e.id,lastDistance:40});s.refresh(p);p.frame=1;e.state=15;s.refresh(e);assert(s.tryHit(p,e));assert.equal(p.combo,2);assert.equal(p.lastDistance,40);assert.equal(s.playerControl(p,{attack:true,pressed:{attack:true}}).combo,6,'source far-chain third hit remains state11, not close throw16');
});
