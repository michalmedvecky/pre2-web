import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTIONS,BindingStore,MenuPad,DEFAULT_KEYS,assignPads,detectPadToken,isBindableKey,keyActions,keyLabel,loadDevices,padLabel,padStartPressed,readPad,sanitizeBindings,saveDevices,snapshotPad} from '../dist/js/bindings.js';
import {Input,legacyStandIns} from '../dist/js/input.js';
import {playerControls} from '../dist/js/controls-help.js';

const memory=()=>{const map=new Map();return{getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),map};};
const pad=({index=0,buttons=[],axes=[0,0,0,0],connected=true}={})=>({index,connected,id:`Pad ${index}`,axes,buttons:Array.from({length:17},(_,i)=>({pressed:buttons.includes(i),value:buttons.includes(i)?1:0}))});

test('defaults mirror the existing web layout and cover every action for both players',()=>{
  const store=new BindingStore(memory());
  for(const player of[0,1])for(const action of ACTIONS){assert.ok(store.keys[player][action].length,`keys ${player} ${action}`);assert.ok(store.pads[player][action].length,`pads ${player} ${action}`);}
  assert.deepEqual(keyActions(store.keys[0],'KeyJ'),['attack']);assert.deepEqual(keyActions(store.keys[1],'Tab'),['jump']);assert.deepEqual(keyActions(store.keys[0],'KeyR'),['run']);
});
test('bindings persist, sanitize reserved/garbage values and reset per player',()=>{
  const storage=memory(),store=new BindingStore(storage);
  store.set('keys',0,'attack',['KeyZ']);store.set('pads',1,'jump',['b1']);
  const again=new BindingStore(storage);assert.deepEqual(again.keys[0].attack,['KeyZ']);assert.deepEqual(again.pads[1].jump,['b1']);
  const dirty=sanitizeBindings({keys:[{attack:['Escape','Space','F2','KeyQ',42,'KeyQ'],jump:'nope'}],pads:[{attack:['b9','b2','zz']}]});
  assert.deepEqual(dirty.keys[0].attack,['KeyQ']);assert.deepEqual(dirty.keys[0].jump,DEFAULT_KEYS[0].jump);assert.deepEqual(dirty.pads[0].attack,['b2']);
  storage.setItem('ga.bindings.v1','{broken');assert.deepEqual(new BindingStore(storage).keys[0].attack,['KeyJ']);
  again.reset(0);assert.deepEqual(again.keys[0].attack,['KeyJ']);assert.deepEqual(again.pads[1].jump,['b1']);
  assert.equal(isBindableKey('Enter'),false);assert.equal(isBindableKey('KeyA'),true);
});
test('conflicts include duplicate keys within a player and keys used by the other player',()=>{
  const store=new BindingStore(memory());store.set('keys',0,'jump',['KeyJ']);
  assert.deepEqual([...store.keyConflicts(0)],['KeyJ']);
  assert.ok(store.keyConflicts(1,code=>code==='KeyS').has('KeyS'));
});
test('gamepad reading: D-pad, stick threshold, opposite directions cancel, Start is separate',()=>{
  const table=new BindingStore(memory()).pads[0];
  assert.equal(readPad(pad({buttons:[14]}),table).left,true);
  assert.equal(readPad(pad({axes:[0.3,0]}),table).right,false);assert.equal(readPad(pad({axes:[0.8,0]}),table).right,true);
  const both=readPad(pad({buttons:[14],axes:[0.9,0]}),table);assert.equal(both.left,false);assert.equal(both.right,false);
  const actions=readPad(pad({buttons:[0,2,3,5]}),table);assert.deepEqual([actions.jump,actions.attack,actions.magic,actions.run],[true,true,true,true]);
  assert.equal(padStartPressed(pad({buttons:[9]})),true);assert.equal(readPad(null,table).attack,false);
});
test('capture detects only newly pressed buttons or newly deflected axes',()=>{
  const held=pad({buttons:[0]}),baseline=snapshotPad(held);
  assert.equal(detectPadToken(held,baseline),null);
  assert.equal(detectPadToken(pad({buttons:[0,4]}),baseline),'b4');
  assert.equal(detectPadToken(pad({buttons:[0],axes:[0,-0.9,0,0]}),baseline),'a1-');
  assert.equal(padLabel('b4'),'LB');assert.equal(padLabel('a1-'),'levá páčka ↑');assert.equal(keyLabel('KeyQ'),'Q');assert.equal(keyLabel('ArrowLeft'),'←');
});
test('pads go to Gamepad players in order and skip pads owned by original joysticks',()=>{
  const pads=[pad({index:0}),pad({index:1}),pad({index:2})];
  assert.deepEqual(assignPads(['gamepad','gamepad'],pads).map(p=>p?.index??null),[0,1]);
  assert.deepEqual(assignPads(['joystick1','gamepad'],pads).map(p=>p?.index??null),[null,1]);
  assert.deepEqual(assignPads(['gamepad','joystick2'],pads,[null,0]).map(p=>p?.index??null),[1,null]);
  assert.deepEqual(assignPads(['keypad','gamepad'],[null,pad({index:3,connected:false})]),[null,null]);
});
test('device choice persists; duplicate original devices are rejected but shared modern ones allowed',()=>{
  const ids=['keypad','keyboard','joystick1','joystick2','mouse','custom','gamepad'],storage=memory();
  assert.equal(loadDevices(ids,storage),null);
  saveDevices(['custom','gamepad'],storage);assert.deepEqual(loadDevices(ids,storage),['custom','gamepad']);
  saveDevices(['gamepad','gamepad'],storage);assert.deepEqual(loadDevices(ids,storage),['gamepad','gamepad']);
  saveDevices(['keypad','keypad'],storage);assert.equal(loadDevices(ids,storage),null);
  saveDevices(['keypad','unknown'],storage);assert.equal(loadDevices(ids,storage),null);
});
test('original devices keep their exact key actions; custom uses only the player table',()=>{
  const bindings=new BindingStore(memory());bindings.set('keys',0,'attack',['KeyZ']);
  const original={devices:['keypad','keyboard'],playerCount:2,bindings};
  assert.deepEqual(Input.prototype.actions.call(original,'KeyJ',0),['attack']);assert.deepEqual(Input.prototype.actions.call(original,'KeyZ',1),['down','left']);
  const custom={devices:['custom','keyboard'],playerCount:2,bindings};
  assert.deepEqual(Input.prototype.actions.call(custom,'KeyZ',0),['attack']);assert.deepEqual(Input.prototype.actions.call(custom,'KeyJ',0),[]);
  assert.deepEqual(Input.prototype.actions.call(custom,'KeyR',0),['heldRun']);assert.deepEqual(Input.prototype.actions.call(custom,'ShiftRight',0),['magic']);
  assert.equal(Input.prototype.runBinding.call(custom,'ArrowLeft',0),0);assert.equal(Input.prototype.runBinding.call(custom,'ArrowRight',0),1);assert.equal(Input.prototype.runBinding.call(custom,'KeyZ',0),-1);
});
test('modern devices get distinct original stand-ins for LegacyControls',()=>{
  assert.deepEqual(legacyStandIns(['custom','gamepad']),['keypad','keyboard']);
  assert.deepEqual(legacyStandIns(['gamepad','keypad']),['keyboard','keypad']);
  assert.deepEqual(legacyStandIns(['mouse','custom']),['mouse','keypad']);
});
test('help lists the saved table for Vlastní klávesy and Gamepad',()=>{
  const bindings=new BindingStore(memory());bindings.set('keys',0,'jump',['Space']);bindings.set('keys',0,'jump',['KeyZ']);
  const custom=playerControls(0,'custom',1,bindings);assert.equal(custom.jump,'Z');assert.match(custom.label,/Vlastní klávesy/);assert.match(custom.movement,/←/);
  const gamepad=playerControls(1,'gamepad',2,bindings);assert.equal(gamepad.movement,'D-pad nebo levá páčka');assert.equal(gamepad.attack,'X');assert.match(gamepad.magic,/levý Shift/);
  bindings.set('pads',1,'left',['b4']);assert.match(playerControls(1,'gamepad',2,bindings).movement,/Vlevo LB/);
});
test('menu pad: edges only, first sight records state, bound attack confirms and B is back unless bound',()=>{
  const menu=new MenuPad();
  assert.deepEqual(menu.edges([pad({buttons:[0]})]),[]);
  assert.deepEqual(menu.edges([pad({buttons:[0]})]),[]);
  assert.deepEqual(menu.edges([pad({buttons:[0,13]})]),['down']);
  assert.deepEqual(menu.edges([pad()]),[]);
  assert.deepEqual(menu.edges([pad({axes:[0,-0.9,0,0]})]),['up']);
  assert.deepEqual(menu.edges([pad({buttons:[2,1]})],['b2']),['confirm','back']);
  menu.reset();menu.edges([pad()]);assert.deepEqual(menu.edges([pad({buttons:[1]})],['b1']),['confirm']);
  menu.edges([]);assert.deepEqual(menu.edges([pad({buttons:[0]})]),[]);
});
