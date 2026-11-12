import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Simulation} from '../dist/js/simulation.js';

const root=new URL('../',import.meta.url);
const assets=JSON.parse(await readFile(new URL('dist/assets/game.json',root)));
for(const map of Object.values(assets.maps)){
  const bytes=await readFile(new URL('dist/assets/'+map.cellsFile,root));
  map.cells=Array.from({length:bytes.length/2},(_,i)=>bytes.readUInt16LE(i*2));
}
const fixture=JSON.parse(await readFile(new URL('tests/fixtures/stage2-mount-recovery.json',root)));
function scene(){
  const s=new Simulation({assets,...fixture.initial});s.script=[];s.scriptWait=null;
  s.scrollLimit=fixture.initial.scrollLimit;s.state.camera={...fixture.initial.camera};
  const player=s.state.player;Object.assign(player,{...fixture.initial.player,level:s.tile(fixture.initial.player.x,fixture.initial.player.y).level});s.refresh(player);
  const rider=s.createActor(fixture.initial.rider),mount=s.createActor(fixture.initial.mount);s.state.entities=[player,rider,mount];
  return{s,player,rider,mount};
}
function probe({type=11,state=0,direction=6,sx=200,sy=100,...extra}={}){
  const s=new Simulation({assets});s.script=[];s.scriptWait=null;s.state.entities=[s.state.player];
  s.tile=()=>({floor:true,wall:false,level:1});
  const mount=s.createActor({type,x:150,y:174,health:4,nativeWait:0,...extra});
  Object.assign(mount,{state,direction,level:1,cachedScreenX:sx,cachedScreenY:sy});s.refresh(mount);s.state.entities.push(mount);
  return{s,mount,player:s.state.player};
}

test('Stage2 ordinary input knocks off a backward-walking rider and the expired dragon escapes',()=>{
  const{s,player,rider,mount}=scene();let boarded=false,knockedOff=false;
  for(const row of fixture.inputs)for(let i=0;i<row.count;i++){
    const wasMounted=rider.mountID===mount.id;s.step(row.input,1);
    boarded||=s.state.events.some(e=>e.kind==='mount'&&e.rider===rider.id);
    knockedOff||=wasMounted&&rider.mountID===null&&s.state.events.some(e=>e.kind==='hit'&&e.target===rider.id);
  }
  assert(boarded&&knockedOff);assert.equal(s.state.tick,354);assert.equal(player.health,4);assert.equal(rider.health,10);
  assert.equal(mount.health,4);assert.equal(mount.riderID,null);assert.equal(mount.nativeWait,0);assert.equal(mount.backward,true);
  const x=mount.x;s.step({},1);assert.equal(mount.backward,false);assert(mount.x<x);
  for(let i=0;i<200&&!mount.removed;i++)s.step({},1);
  assert.equal(mount.removed,true);assert.equal(mount.lifecycle,253);assert.equal(rider.mountID,null);
});

test('native539d uses cached escape side and writes direction before run control',()=>{
  for(const[sx,oldDirection,expected]of[[200,6,2],[100,2,6]]){
    const{s,mount,player}=probe({state:2,direction:oldDirection,sx,backward:true});
    // Actual x150 is on the left half: the right case must use the cached word.
    const control=s.enemyControl(mount,player);
    assert.equal(control.direction,expected);assert.equal(mount.direction,expected);assert.equal(control.run,true);assert.equal(mount.backward,false);
    s.control(mount,control);assert.equal(mount.state,2,'native direction write prevents an invented turn-to-walk transition');
  }
});

test('native539d preserves the wait and occupied early returns',()=>{
  const{s,mount,player}=probe({nativeWait:1,backward:true});
  assert.equal(s.enemyControl(mount,player).direction,8);assert.equal(mount.nativeWait,0);assert.equal(mount.backward,true);
  mount.riderID=player.id;assert.equal(s.enemyControl(mount,player).direction,8);assert.equal(mount.backward,true);
  mount.riderID=null;s.enemyControl(mount,player);assert.equal(mount.backward,false);
});

test('native blocked escape probes down12 and refreshes walk in the new direction',()=>{
  for(const blocked of[{floor:false,wall:false,level:1},{floor:true,wall:true,level:0},{floor:true,wall:true,level:2}]){
    const{s,mount,player}=probe({state:5,direction:6});
    s.tile=(x,y)=>x===mount.x&&y===mount.y+12?{floor:true,wall:true,level:1}:blocked;
    const control=s.enemyControl(mount,player);
    assert.equal(control.direction,4);assert.equal(control.run,false);assert.equal(control.jump,false);
    assert.equal(mount.direction,4);assert.equal(mount.state,1);assert.equal(mount.animationSlot,1);
  }
});

test('native both-blocked escape retains horizontal run and requests the original jump',()=>{
  const{s,mount,player}=probe({state:2,direction:6});s.tile=()=>({floor:false,wall:false,level:1});
  const control=s.enemyControl(mount,player);assert.equal(control.direction,2);assert.equal(control.run,true);assert.equal(control.jump,true);
  s.control(mount,control);assert.equal(mount.state,3);assert.equal(mount.vz,18);
});

test('native floor probe allows a different height without a wall and rejects missing floor',()=>{
  const{s,mount,player}=probe();s.tile=()=>({floor:true,wall:false,level:7});
  let control=s.enemyControl(mount,player);assert.equal(control.direction,2);assert.equal(control.jump,false);
  s.tile=()=>({floor:false,wall:false,level:0});control=s.enemyControl(mount,player);assert.equal(control.jump,true);
});

test('native escape removal uses strict cached screen bounds including airborne height',()=>{
  for(const[sx,sy]of[[8,100],[312,100],[100,8],[100,192]]){
    const{s,mount,player}=probe({sx,sy});s.enemyControl(mount,player);
    assert.equal(mount.lifecycle,253);assert.equal(mount.removed,false);s.prepareDrawAndCleanup();assert.equal(mount.removed,true);
  }
  const{s,mount,player}=probe({sx:200,sy:148});mount.y=350;mount.z=50;s.state.camera.y=152;
  s.enemyControl(mount,player);assert.equal(mount.lifecycle,0,'cached y-camera-z148 remains inside despite ground y-camera198');
});

test('waiting free mounts remain boardable by walking, expired or occupied mounts do not',()=>{
  for(const type of[10,11]){
    const{s,mount,player}=probe({type,nativeWait:40});Object.assign(player,{x:mount.x,y:mount.y,level:mount.level,state:1});
    s.tryMounts();assert.equal(player.state,20);assert.equal(player.mountID,mount.id);assert.equal(mount.riderID,player.id);
    s.detachRider(player);mount.nativeWait=0;s.tryMounts();assert.equal(player.mountID,null);
    mount.nativeWait=40;mount.riderID=999;s.tryMounts();assert.equal(player.mountID,null);
    mount.riderID=null;player.state=3;s.tryMounts();assert.equal(player.mountID,null);
  }
});
