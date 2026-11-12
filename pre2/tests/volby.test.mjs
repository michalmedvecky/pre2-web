import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {CheatInput} from '../dist/js/cheats.js';
import {volbyHeroPose,volbyActor} from '../dist/js/volby.js';

test('VOLBY recognizes physical keys and reserves partial sequences',()=>{
 const c=new CheatInput();for(const key of 'VOLB'){assert.equal(c.feed({code:'Key'+key},true),null);assert.equal(c.pending,true);}assert.equal(c.feed({code:'KeyY'},true),'VOLBY');assert.equal(c.pending,false);
});
test('VOLBY selects attacks in all directions, crouch, airborne, hurt and defeat',()=>{
 const w={frame:4,player:{vx:0,vy:0,grounded:true}};
 assert.equal(volbyHeroPose(w),'idle-0');w.player.vx=20;assert.equal(volbyHeroPose(w),'run-2');
 w.player.downTimer=1;assert.equal(volbyHeroPose(w),'crouch');w.player.downTimer=0;w.player.grounded=false;w.player.vy=-20;assert.equal(volbyHeroPose(w),'jump');
 w.player.vy=20;assert.equal(volbyHeroPose(w),'fall');w.player.attackFrame=true;
 for(const [attackAction,pose]of [[6,'attack-up'],[7,'attack-down'],[3,'attack-swing']]){Object.assign(w.player,{attackAction,attackTimer:3});assert.equal(volbyHeroPose(w),pose);}
 w.player.invulnerable=30;assert.equal(volbyHeroPose(w),'hurt');w.deathTimer=3;assert.equal(volbyHeroPose(w),'defeat');
});
test('actor replacement follows authored identities, stage, death, emergence and transformations',()=>{
 const w={levelIndex:0,frame:0},bear={def:{sprite:313},sprite:313,type:9,state:0,vx:32,age:2};
 const original=structuredClone(bear);assert.deepEqual(volbyActor(w,bear),{atlas:'bear-replacement',id:'walk-1'});assert.deepEqual(bear,original);
 const cat={def:{sprite:397},sprite:399,type:8,state:10};assert.deepEqual(volbyActor(w,cat),{atlas:'tiger-replacement',id:'pounce'});
 assert.equal(volbyActor({...w,levelIndex:1},cat),null);
 cat.state=255;assert.equal(volbyActor(w,cat).id,'defeat');
 assert.equal(volbyActor({...w,assets:{game:{sprites:{381:{height:5}}}}},{...bear,type:10,state:0,sprite:381,def:{sprite:381}}).reveal,1/6);
 assert.ok(volbyActor(w,{...bear,type:10,state:2,def:{sprite:381}}));
 assert.equal(volbyActor({...w,enemyPowerTimer:10},{...bear,sprite:115}),null);
 assert.equal(volbyActor(w,{def:{sprite:349},sprite:349}),null);
});
test('all 48 shipped VOLBY frames match source hashes and remain inside transparent atlases',async()=>{
 const base=new URL('../dist/assets/volby/',import.meta.url),m=JSON.parse(await readFile(new URL('manifest.json',base)));let count=0;
 assert.equal(m.cheat,'VOLBY');assert.equal(m.integratedIntoGame,true);
 for(const a of Object.values(m.atlases)){
  const png=await readFile(new URL(a.file,base));assert.equal(createHash('sha256').update(png).digest('hex'),a.sha256);
  assert.equal(png.readUInt32BE(16),a.width);assert.equal(png.readUInt32BE(20),a.height);assert.equal(png[25],6);
  for(const f of Object.values(a.frames)){const[x,y,w,h]=f.rect;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=a.width&&y+h<=a.height);count++;}
 }
 assert.equal(count,48);
});
