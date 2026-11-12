import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {RemasterMusic,remasterOffset,remasterPlan,remasterFramePlan} from '../dist/js/remaster-music.js';
import {OriginalAudio} from '../dist/js/audio.js';
import {frameForTick} from '../dist/js/opl-trace.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
function replace(t,key,value){const descriptor=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});t.after(()=>descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key]);}
const bytes=new Uint8Array([1,2,3,4]).buffer,sha256=createHash('sha256').update(new Uint8Array(bytes)).digest('hex');
const track={file:'track.flac',sha256,duration:12,firstCycleEnd:10,startupEnd:2,steadySkipAtStartup:2,logicalLoopStart:0,sourceLoopDuration:10,loopStart:2,loopEnd:12};
const opening={...track,firstCycleEnd:10,startupEnd:5,logicalLoopStart:3,sourceLoopDuration:7,loopStart:5,steadySkipAtStartup:2};
function context(){
 const c={currentTime:0,state:'running',sampleRate:48000,destination:{},sources:[],gains:[],decodeCalls:0,decodeAudioData:async()=>{c.decodeCalls++;return{duration:12,sampleRate:48000,length:576000,numberOfChannels:2};},createGain(){const gain={value:0,setValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;}};const n={gain,connect(){},disconnect(){}};c.gains.push(n);return n;},createBiquadFilter(){return{frequency:{value:0},connect(){}};},createBufferSource(){const n={buffer:null,loop:false,starts:[],stopped:0,stopTimes:[],disconnected:0,connect(){},start(...args){n.starts.push(args);},stop(...args){n.stopped++;n.stopTimes.push(args);},disconnect(){n.disconnected++;},onended:null};c.sources.push(n);return n;},resume(){c.state='running';return Promise.resolve();},suspend(){c.state='suspended';return Promise.resolve();},close(){c.state='closed';return Promise.resolve();}};return c;
}
function fetches(t,tracks={a:track,b:track,c:track}){replace(t,'fetch',async url=>String(url).endsWith('manifest.json')?{ok:true,json:async()=>({version:1,tracks})}:{ok:true,arrayBuffer:async()=>bytes.slice(0)});}
const wait=()=>new Promise(resolve=>setImmediate(resolve));
test('logical seek preserves the opening prefix and steady phase after many loops',()=>{
 assert.equal(remasterOffset(4,opening),4);assert.equal(remasterOffset(5,opening),7);assert.equal(remasterOffset(10,opening),5);assert.equal(remasterOffset(31,opening),5);assert.equal(remasterOffset(8,opening,false),10);assert.equal(remasterOffset(10,opening,false),null);
 assert.deepEqual(remasterPlan(4,opening),[{delay:0,offset:4,duration:1,loop:false},{delay:1,offset:7,duration:undefined,loop:true}]);
 assert.deepEqual(remasterPlan(4,opening,false),[{delay:0,offset:4,duration:1,loop:false},{delay:1,offset:7,duration:5,loop:false}]);
});
test('cold head and steady loop are scheduled on one audio clock and share one decoded buffer',async t=>{
 fetches(t);const c=context();c.currentTime=.5;const a=new RemasterMusic({context:c,destination:{}});assert.equal(await a.select('a',{startedAt:0}),true);assert.equal(c.sources.length,2);assert.equal(c.sources[0].buffer,c.sources[1].buffer);assert.deepEqual(c.sources[0].starts,[[.5,.5]]);assert.deepEqual(c.sources[0].stopTimes,[[2]]);assert.deepEqual(c.sources[1].starts,[[2,4]]);assert.equal(c.sources[1].loop,true);assert.equal(c.decodeCalls,1);a.stop();assert.equal(c.sources[0].stopped,2);assert.equal(c.sources[1].stopped,1);
});
test('late loading starts at the current clock phase and pause never advances that clock',async t=>{
 const ready=deferred();replace(t,'fetch',async url=>String(url).endsWith('manifest.json')?{ok:true,json:async()=>({version:1,tracks:{a:opening}})}:{ok:true,arrayBuffer:()=>ready.promise});const c=context(),a=new RemasterMusic({context:c,destination:{}}),pending=a.select('a',{startedAt:0});await wait();c.currentTime=17;c.state='suspended';ready.resolve(bytes.slice(0));assert.equal(await pending,true);assert.deepEqual(c.sources[0].starts,[[17,5]]);assert.equal(c.state,'suspended');a.dispose();
});
test('a future exact original start is retained rather than beginning the remaster early',async t=>{
 fetches(t);const c=context();c.currentTime=4;const a=new RemasterMusic({context:c,destination:{}});await a.select('a',{startedAt:4.0005});assert.equal(c.sources[0].starts[0][0],4.0005);assert.equal(c.sources[0].starts[0][1],0);a.dispose();
});
test('non-loop music stops at its first original cycle rather than playing the stored steady copy',async t=>{
 fetches(t,{a:opening});const c=context();c.currentTime=8;const a=new RemasterMusic({context:c,destination:{}});await a.select('a',{startedAt:0,loop:false});assert.equal(c.sources.length,1);assert.deepEqual(c.sources[0].starts,[[8,10]]);assert.deepEqual(c.sources[0].stopTimes,[[10]]);assert.equal(c.sources[0].loop,false);a.stop();c.currentTime=11;assert.equal(await a.select('a',{startedAt:0,loop:false}),false);assert.equal(c.sources.length,1);a.dispose();
});
test('cancelled downloads cannot decode or start an obsolete track',async t=>{
 const ready=deferred();let signal;replace(t,'fetch',async(url,options)=>String(url).endsWith('manifest.json')?{ok:true,json:async()=>({version:1,tracks:{a:track}})}:(signal=options.signal,{ok:true,arrayBuffer:()=>ready.promise}));const c=context(),a=new RemasterMusic({context:c,destination:{}}),pending=a.select('a',{startedAt:0});await wait();a.stop();assert.equal(signal.aborted,true);ready.resolve(bytes.slice(0));assert.equal(await pending,false);assert.equal(c.decodeCalls,0);assert.equal(c.sources.length,0);a.dispose();
});
test('one held decode serializes newer requests and skips the superseded middle selection',async t=>{
 fetches(t);const c=context(),first=deferred(),entered=deferred(),a=new RemasterMusic({context:c,destination:{}});let active=0,maximum=0,calls=0;
 c.decodeAudioData=async()=>{calls++;active++;maximum=Math.max(maximum,active);if(calls===1){entered.resolve();await first.promise;}active--;return{duration:12,sampleRate:48000,length:576000,numberOfChannels:2};};
 const p1=a.select('a',{startedAt:0});await entered.promise;assert.equal(calls,1);const p2=a.select('b',{startedAt:0});await wait();const p3=a.select('c',{startedAt:0});await wait();assert.equal(calls,1);first.resolve();assert.deepEqual(await Promise.all([p1,p2,p3]),[false,false,true]);assert.equal(calls,2);assert.equal(maximum,1);assert.equal(a.bufferId,'c');a.dispose();
});
test('dispose during an unabortable decode never revives audio or retains the decoded PCM',async t=>{
 fetches(t);const c=context(),ready=deferred();c.decodeAudioData=()=>ready.promise;const a=new RemasterMusic({context:c,destination:{}}),pending=a.select('a',{startedAt:0});await wait();a.dispose();ready.resolve({duration:12,sampleRate:48000,length:576000,numberOfChannels:2});assert.equal(await pending,false);assert.equal(a.buffer,null);assert.equal(a.sources.length,0);assert.equal(a.state,'closed');
});
test('wrong bytes and oversized decoded PCM fail closed while keeping the original available',async t=>{
 fetches(t,{bad:{...track,sha256:'0'.repeat(64)},a:track});const c=context(),a=new RemasterMusic({context:c,destination:{}});assert.equal(await a.select('bad',{startedAt:0}),false);assert.equal(c.decodeCalls,0);assert.match(a.error,/úplná/);c.decodeAudioData=async()=>({duration:12,sampleRate:48000,length:10_000_000,numberOfChannels:2});assert.equal(await a.select('a',{startedAt:0}),false);assert.match(a.error,/velká/);assert.equal(a.active,false);a.dispose();
});
test('original is the default, MUSIC retains the original source and F3 state, and restore never reselects it',async t=>{
 fetches(t);const c=context(),a=new OriginalAudio();a.context=c;a.master=c.createGain();a.musicGain=c.createGain();a.currentTrack='a';a.currentTrackOptions={};a.trackStartedAt=0;const enabled=[];let selected=0;a.liveMusic={node:{},setEnabled:value=>enabled.push(value),play:async()=>{selected++;return true;},stop(){}};a.musicSource=a.liveMusic.node;
 assert.equal(a.musicEdition,'original');assert.equal(a.remasterMusic,null);assert.equal(await a.setMusicEdition('remaster'),true);assert.equal(a.getMusicEditionStatus().effective,'remaster');assert.equal(a.musicGain.gain.value,0);assert.equal(a.remasterGain.gain.value,1);a.setMusicEnabled(false);assert.deepEqual(enabled,[false]);assert.equal(a.remasterGain.gain.value,0);await a.setMusicEdition('original');assert.equal(a.musicGain.gain.value,1);assert.equal(a.musicSource,a.liveMusic.node);assert.equal(selected,0);assert.equal(a.trackStartedAt,0);a.setMusicEnabled(true);assert.deepEqual(enabled,[false,true]);a.stop();
});
test('MUSIC switched back during loading never mutes or replaces the original source',async t=>{
 const ready=deferred();replace(t,'fetch',async()=>ready.promise);const c=context(),a=new OriginalAudio();a.context=c;a.master=c.createGain();a.musicGain=c.createGain();a.currentTrack='a';a.currentTrackOptions={};a.trackStartedAt=0;a.liveMusic={node:{},stop(){}};a.musicSource=a.liveMusic.node;const pending=a.setMusicEdition('remaster');await wait();await a.setMusicEdition('original');ready.resolve({ok:true,json:async()=>({version:1,tracks:{a:track}})});assert.equal(await pending,false);assert.equal(a.musicGain.gain.value,1);assert.equal(a.getMusicEditionStatus().effective,'original');assert.equal(c.sources.length,0);a.stop();
});
test('OPL selection acknowledgement reports the first actual sample frame without changing the native selector',async t=>{
 let Processor;const messages=[];replace(t,'AudioWorkletProcessor',class{constructor(){this.port={postMessage:m=>messages.push(m),onmessage:null};}});replace(t,'registerProcessor',(_name,value)=>{Processor=value;});replace(t,'sampleRate',48000);replace(t,'currentTime',10);await import('../dist/js/opl-sequence-worklet.js?remaster-start-test');const p=new Processor();let selected=null;p.player={cursor:4096,sequence:{baseTick:87},selectProgram(name,options){selected={name,options};}};await p.command({type:'select',request:5,name:'opening',options:{loop:true}});assert.deepEqual(selected,{name:'opening',options:{loop:true}});assert.equal(messages[0].type,'selected');assert.equal(messages[0].startTime,10+(frameForTick(87,48000)-4096)/48000);
});
test('pausing releases only retired fading sources and preserves the current paused track',async t=>{
 fetches(t);const c=context(),a=new OriginalAudio();a.context=c;a.master=c.createGain();a.musicGain=c.createGain();a.currentTrack='a';a.currentTrackOptions={};a.trackStartedAt=0;a.liveMusic={node:{},stop(){}};await a.setMusicEdition('remaster');await a.setMusicEdition('original');assert.equal(a.remasterMusic.released.size,2);await a.setMusicEdition('remaster');assert.equal(a.remasterMusic.sources.length,2);await a.setPaused(true);assert.equal(a.remasterMusic.released.size,0);assert.equal(a.remasterMusic.sources.length,2);assert.equal(a.remasterMusic.active,true);await a.setMusicEdition('original');assert.equal(a.remasterMusic.released.size,0);a.stop();
});

test('cold handoff uses the identical absolute stop/start frame at 48k and44.1k for fractional seek positions',()=>{
 for(const rate of [48000,44100])for(const elapsed of [1.98,1.99999,1.99995,1.995,1.98+3/rate]){
  const plan=remasterFramePlan(0,-elapsed,track,true,rate);
  if(plan.parts.length===2){assert.equal(plan.parts[0].stopFrame,plan.parts[1].startFrame);assert(Number.isInteger(plan.parts[0].stopFrame));assert(Math.abs(plan.parts[0].stopFrame-(2-elapsed)*rate)<=.500001);}
  else{assert.equal(plan.parts.length,1);assert.equal(plan.parts[0].startFrame,0);assert((2-elapsed)*rate<=.500001);}
 }
});
