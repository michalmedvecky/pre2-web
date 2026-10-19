import test from 'node:test';
import assert from 'node:assert/strict';
import {Presentation} from '../dist/js/presentation.js';
const world=()=>({map:new Uint8Array(1),camera:{x:0,y:0},player:{x:100,y:100},actors:[{x:200,y:100}],sceneFlash:0});
test('between-tick motion and weapon attachment do not mutate simulation state',()=>{
 const w=world(),p=new Presentation();p.beforeStep(w);w.player.x+=8;w.actors[0].x-=4;w.playerWeapon={x:120,y:90,sprite:58};
 const before=JSON.stringify(w),v=p.sample(w,.5,1/60);
 assert.equal(v.player.x,104);assert.equal(v.actors[0].x,198);assert.equal(v.playerWeapon.x,116);assert.equal(JSON.stringify(w),before);
 assert.equal(p.sample(w,.75,1/60).player.x,106);
});
test('16px camera steps are spread over display frames with refresh-independent decay',()=>{
 const run=hz=>{const w=world(),p=new Presentation();p.reset(w);w.camera.x=16;const xs=[];for(let i=0;i<hz/10;i++)xs.push(p.sample(w,1,1/hz).camera.x);return xs;};
 const a=run(60),b=run(120);assert.equal(a.at(-1),b.at(-1));assert.ok(a[0]>0&&a[0]<16);assert.ok(Math.max(...a.map((v,i)=>v-(a[i-1]||0)))<=4);
});
test('teleports cut immediately, including when several simulation ticks share a display frame',()=>{
 const w=world(),p=new Presentation();p.beforeStep(w);w.player.x=1800;w.camera.x=1600;p.afterStep(w);
 p.beforeStep(w);w.player.x+=4;const v=p.sample(w,.5,1/60);assert.equal(v.camera.x,1600);assert.equal(v.player.x,1802);
 w.sceneFlash=4;w.player.x+=32;w.camera.x+=16;p.afterStep(w);assert.equal(p.sample(w,0,1/60).player.x,w.player.x);
});
test('level reloads and new entities have no interpolation from the previous scene',()=>{
 const w=world(),p=new Presentation();p.beforeStep(w);w.map=new Uint8Array(1);w.player={x:12,y:20};w.camera.x=8;
 assert.equal(p.sample(w,0,1/60).player.x,12);assert.equal(p.sample(w,0,1/60).camera.x,8);
 p.beforeStep(w);w.actors.push({x:300,y:40});assert.equal(p.sample(w,.5,1/60).actors[1].x,300);
});
test('recreated boss and rope geometry interpolate; rope pixels remain integer coordinates',()=>{
 const w=world(),p=new Presentation();w.bossParts=[{x:200,y:50}];w.ropePoints=[{x:201,y:51}];p.beforeStep(w);
 w.bossParts=[{x:208,y:54}];w.ropePoints=[{x:208,y:54}];const v=p.sample(w,.5,1/60);
 assert.equal(v.bossParts[0].x,204);assert.deepEqual(v.ropePoints,[{x:205,y:53}]);
});
