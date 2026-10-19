import test from 'node:test';
import assert from 'node:assert/strict';
import {secretTargets,hintMarkers} from '../dist/js/secrets.js';
const block=(index,x,y)=>({index,pos:y*256+x,active:true});
test('hints group concealed connected tiles and disappear only when discovered',()=>{
 const w={blocks:[block(0,4,6),block(1,5,7),block(2,12,6)],items:[],gates:[],player:{x:64,y:100},camera:{x:0,y:0}};
 const before=JSON.stringify(w),h=secretTargets(w);assert.equal(h.length,2);assert.equal(h[0].cells.length,2);assert.equal(JSON.stringify(w),before);
 w.blocks[0].active=w.blocks[1].active=false;assert.equal(secretTargets(w).length,1);
});
test('hints distinguish passages and bonus exits, omit normal exits and collected items',()=>{
 const w={blocks:[],gates:[{active:true,triggerTile:256+3},{active:true,triggerTile:256+3},{active:false,triggerTile:256+9}],levelIndex:0,items:[{active:true,sprite:311,x:90,y:20},{active:false,sprite:311},{active:true,sprite:279,x:100,y:20}]};
 assert.deepEqual(secretTargets(w).map(h=>h.kind),['passage','bonus']);w.levelIndex=2;assert.equal(secretTargets(w).length,3);
});
test('offscreen hint markers clamp above HUD and order by proximity',()=>{
 const w={blocks:[block(0,1,4),block(1,100,80)],player:{x:20,y:64},camera:{x:0,y:0}};
 const [near,far]=hintMarkers(w);assert.equal(near.visible,true);assert.equal(far.visible,false);assert.ok(far.distance>near.distance);assert.equal(far.screenX,311);assert.equal(far.screenY,161);
});
