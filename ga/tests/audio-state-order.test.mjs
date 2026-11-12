import test from 'node:test';
import assert from 'node:assert/strict';
import {OriginalAudio} from '../dist/js/audio.js';
const turn=()=>new Promise(resolve=>setImmediate(resolve));
function context(state){
  const c={state,commands:[],pending:[],currentTime:0};
  for(const[name,target]of[['resume','running'],['suspend','suspended']])c[name]=()=>{
    c.commands.push(name);if(c.state===target)return Promise.resolve();
    return new Promise(resolve=>c.pending.push(()=>{c.state=target;resolve();}));
  };
  c.finish=()=>{assert(c.pending.length);c.pending.shift()();};return c;
}
test('a newer resume waits for an older in-flight suspend instead of losing its final intent',async()=>{
  const a=new OriginalAudio(),c=context('running');a.context=c;
  const pause=a.setPaused(true),resume=a.setPaused(false);
  c.finish();await turn();if(c.pending.length)c.finish();await Promise.all([pause,resume]);
  assert.equal(a.paused,false);assert.equal(c.state,'running');assert.deepEqual(c.commands,['suspend','resume']);
});
test('a newer pause wins over a pending resume and shared transitions settle without reviving playback',async()=>{
  const a=new OriginalAudio(),c=context('suspended');a.context=c;
  const resume=a.setPaused(false);assert.deepEqual(c.commands,['resume'],'first resume is called synchronously in the gesture');
  const pause=a.setPaused(true);c.finish();await turn();if(c.pending.length)c.finish();await Promise.all([pause,resume]);
  assert.equal(a.paused,true);assert.equal(c.state,'suspended');assert.deepEqual(c.commands,['resume','suspend']);
});
