import test from 'node:test';
import assert from 'node:assert/strict';
import {CheatInput} from '../dist/js/cheats.js';
test('IDDQD recognizes repeated physical D presses once per complete sequence',()=>{
  const c=new CheatInput(),type=s=>[...s].map(key=>c.feed({code:'Key'+key},true));
  assert.deepEqual(type('IDDQD'),[null,null,null,null,'IDDQD']);
  assert.deepEqual(type('IDDQD'),[null,null,null,null,'IDDQD']);
  c.feed({code:'KeyI'},true);c.feed({code:'KeyD'},true);
  c.feed({code:'KeyD',repeat:true},true);
  assert.deepEqual(type('DQD'),[null,null,'IDDQD']);
});
test('cheat input rejects menus, shortcuts, interrupted sequences and resets',()=>{
  const c=new CheatInput();
  for(const stop of [{code:'KeyD',ctrlKey:true},{code:'Space'},{code:'KeyD',metaKey:true}]){
    c.feed({code:'KeyI'},true);c.feed(stop,true);
    for(const key of 'DDQD')assert.equal(c.feed({code:'Key'+key},true),null);
  }
  for(const key of 'IDDQD')assert.equal(c.feed({code:'Key'+key},false),null);
  c.feed({code:'KeyI'},true);c.reset();
  for(const key of 'DDQD')assert.equal(c.feed({code:'Key'+key},true),null);
});
test('IDKFA is a separate toggle sequence and does not activate IDDQD',()=>{
  const c=new CheatInput();
  assert.deepEqual([...'IDKFA'].map(k=>c.feed({code:'Key'+k},true)),[null,null,null,null,'IDKFA']);
  assert.deepEqual([...'IDDQD'].map(k=>c.feed({code:'Key'+k},true)),[null,null,null,null,'IDDQD']);
});
test('partial cheats reserve D/F/A controls until recognition so IDKFA cannot trigger fullscreen',()=>{const c=new CheatInput();for(const key of 'XIDKF'){c.feed({code:'Key'+key},true);assert.equal(c.pending,key!=='X');}assert.equal(c.feed({code:'KeyA'},true),'IDKFA');assert.equal(c.pending,false);c.feed({code:'KeyF'},true);assert.equal(c.pending,false);c.feed({code:'KeyI'},true);assert.equal(c.pending,true);c.feed({code:'ArrowRight'},true);assert.equal(c.pending,false);});
