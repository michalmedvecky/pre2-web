import test from 'node:test';
import assert from 'node:assert/strict';
import {TypedCheats} from '../dist/js/typed-cheats.js';
function setup(){
  let now=0,id=0,context=['world','player',3];const timers=new Map(),commands=[],magic=[];
  const cheat=new TypedCheats({commands:()=>['LEVEL','MUSIC','MAP','IDDQD','HD'],context:()=>context,onCommand:w=>commands.push(w),onMagic:()=>magic.push(now),setTimer:(fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id;},clearTimer:id=>timers.delete(id)});
  const advance=ms=>{now+=ms;for(const[key,timer]of[...timers])if(timer.at<=now){timers.delete(key);timer.fn();}};
  const event=(key,code='Key'+key.toUpperCase(),extra={})=>({key,code,...extra});
  return{cheat,commands,magic,advance,event,setContext:value=>{context=value;}};
}
test('LEVEL typing at 200ms intervals consumes every letter without casting magic',()=>{
  const t=setup();for(const key of'level'){assert(t.cheat.keydown(t.event(key)));t.cheat.keyup(t.event(key));t.advance(200);}
  t.advance(1000);assert.deepEqual(t.commands,['LEVEL']);assert.equal(t.magic.length,0);
});
test('standalone L commits exactly one magic edge after300ms; repeat does not cast again',()=>{
  const t=setup();t.cheat.keydown(t.event('l'));t.advance(299);assert.equal(t.magic.length,0);t.advance(1);assert.equal(t.magic.length,1);
  assert(t.cheat.keydown(t.event('l','KeyL',{repeat:true})));t.advance(600);assert.equal(t.magic.length,1);t.cheat.keyup(t.event('l'));
});
test('an invalid next action commits L once while preserving that ordinary action',()=>{
  const t=setup();t.cheat.keydown(t.event('l'));assert.equal(t.cheat.keydown(t.event('ArrowRight','ArrowRight')),false);assert.equal(t.magic.length,1);t.advance(1000);assert.equal(t.magic.length,1);
});
test('pause/life change, blur cancellation and text editing cannot replay deferred magic',()=>{
  for(const action of[t=>t.setContext(null),t=>t.setContext(['world','player',2]),t=>t.cheat.cancel(),t=>t.cheat.keydown(t.event('x','KeyX',{target:{closest:()=>({})}}))]){
    const t=setup();t.cheat.keydown(t.event('l'));action(t);t.advance(1000);assert.equal(t.magic.length,0);
  }
});
test('Right Shift bypasses and cancels an L prefix without a second magic edge',()=>{
  const t=setup();t.cheat.keydown(t.event('l'));assert.equal(t.cheat.keydown(t.event('Shift','ShiftRight')),false);t.advance(1000);assert.equal(t.magic.length,0);
});
test('other cheat words consume their movement/attack letters and use typed characters independently of layout',()=>{
  for(const word of['music','map','iddqd','hd']){const t=setup();for(const key of word){assert(t.cheat.keydown(t.event(key)));t.cheat.keyup(t.event(key));t.advance(100);}assert.deepEqual(t.commands,[word.toUpperCase()]);assert.equal(t.magic.length,0);}
  const t=setup();t.cheat.keydown(t.event('l','KeyP'));t.advance(300);assert.equal(t.magic.length,0,'a typed L on another physical key is not the L magic binding');
});
