import test from 'node:test';
import assert from 'node:assert/strict';
import {CheatInput} from '../dist/js/cheats.js';
test('IDDQD recognizes repeated physical D presses once per complete sequence',()=>{
  const c=new CheatInput(),type=s=>[...s].map(key=>c.feed({code:'Key'+key},true));
  assert.deepEqual(type('IDDQD'),[false,false,false,false,true]);
  assert.deepEqual(type('IDDQD'),[false,false,false,false,true]);
  c.feed({code:'KeyI'},true);c.feed({code:'KeyD'},true);
  c.feed({code:'KeyD',repeat:true},true);
  assert.deepEqual(type('DQD'),[false,false,true]);
});
test('cheat input rejects menus, shortcuts, interrupted sequences and resets',()=>{
  const c=new CheatInput();
  for(const stop of [{code:'KeyD',ctrlKey:true},{code:'Space'},{code:'KeyD',metaKey:true}]){
    c.feed({code:'KeyI'},true);c.feed(stop,true);
    for(const key of 'DDQD')assert.equal(c.feed({code:'Key'+key},true),false);
  }
  for(const key of 'IDDQD')assert.equal(c.feed({code:'Key'+key},false),false);
  c.feed({code:'KeyI'},true);c.reset();
  for(const key of 'DDQD')assert.equal(c.feed({code:'Key'+key},true),false);
});
