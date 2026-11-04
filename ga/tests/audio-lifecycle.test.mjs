import test from 'node:test';
import assert from 'node:assert/strict';
import {OriginalAudio} from '../dist/js/audio.js';
import {OriginalOPLAudio} from '../dist/js/opl-audio.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
function replace(t,key,value){const descriptor=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});t.after(()=>descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key]);}
function audioContext(t,{pendingResume=false,pendingSuspend=false}={}){
 const contexts=[];
 class Context{
  constructor(){this.state='suspended';this.destination={};this.currentTime=0;this.waits=[];this.closeCalls=0;this.pendingResume=pendingResume;this.pendingSuspend=pendingSuspend;contexts.push(this);}
  createGain(){return{gain:{value:0,setValueAtTime(){},setTargetAtTime(){}},connect(){}};}
  createBiquadFilter(){return{frequency:{value:0},connect(){}};}
  resume(){if(this.pendingResume){const d=deferred();this.waits.push(d);return d.promise;}this.state='running';return Promise.resolve();}
  suspend(){if(this.pendingSuspend){const d=deferred();this.waits.push(d);return d.promise;}this.state='suspended';return Promise.resolve();}
  close(){this.closeCalls++;this.state='closed';for(const d of this.waits)d.reject(new DOMException('AudioContext closed before pending state change','InvalidStateError'));this.waits=[];return Promise.resolve();}
 }
 replace(t,'AudioContext',Context);return contexts;
}
const manifest={faithfulSupported:true,tracks:{},effects:{}};
function readyFetch(t){replace(t,'fetch',async()=>({ok:true,json:async()=>manifest}));}
test('closing during concurrent pending unlocks resolves false without fetching or resurrecting audio',async t=>{
 const contexts=audioContext(t,{pendingResume:true});let fetches=0;replace(t,'fetch',async()=>{fetches++;throw Error('must not fetch after close');});const a=new OriginalAudio({musicBackend:'flac'}),first=a.unlock(),second=a.unlock();await a.dispose();assert.deepEqual(await Promise.all([first,second]),[false,false]);assert.equal(contexts.length,1);assert.equal(contexts[0].closeCalls,1);assert.equal(fetches,0);assert.equal(a.status,'closed');assert.equal(a.error,null);assert.equal(a.context,null);
});
test('close cancels pending pause/resume state changes without rejected caller promises',async t=>{
 const contexts=audioContext(t);readyFetch(t);const a=new OriginalAudio({musicBackend:'flac'});assert.equal(await a.unlock(),true);contexts[0].pendingSuspend=true;const pause=a.setPaused(true);contexts[0].pendingResume=true;const resume=a.setPaused(false);await a.dispose();assert.deepEqual(await Promise.all([pause,resume]),[false,false]);assert.equal(a.status,'closed');assert.equal(a.error,null);
});
test('late manifest response after dispose does not initialize a backend',async t=>{
 audioContext(t);const entered=deferred(),response=deferred();replace(t,'fetch',()=>{entered.resolve();return response.promise;});const a=new OriginalAudio({musicBackend:'flac'});let backendCalls=0;a.ensureLiveMusic=async()=>{backendCalls++;};const pending=a.unlock();await entered.promise;await a.dispose();response.resolve({ok:true,json:async()=>manifest});assert.equal(await pending,false);assert.equal(a.manifest,null);assert.equal(backendCalls,0);assert.equal(a.status,'closed');
});
test('late manifest JSON after dispose cannot replace closed state',async t=>{
 audioContext(t);const entered=deferred(),json=deferred();replace(t,'fetch',async()=>({ok:true,json:()=>{entered.resolve();return json.promise;}}));const a=new OriginalAudio({musicBackend:'flac'}),pending=a.unlock();await entered.promise;await a.dispose();json.resolve(manifest);assert.equal(await pending,false);assert.equal(a.manifest,null);assert.equal(a.status,'closed');
});
test('real resume failure remains diagnosable but does not reject unlock',async t=>{
 const contexts=audioContext(t);const a=new OriginalAudio({musicBackend:'flac'});a.paused=true;readyFetch(t);assert.equal(await a.unlock(),true);a.paused=false;contexts[0].resume=()=>Promise.reject(new DOMException('device unavailable','NotSupportedError'));assert.equal(await a.unlock(),false);assert.equal(a.status,'unavailable');assert.match(a.error,/device unavailable/);await a.dispose();
});
test('dispose is idempotent and late calls never recreate a context or queue music',async t=>{
 const contexts=audioContext(t);readyFetch(t);const a=new OriginalAudio({musicBackend:'flac'});assert.equal(await a.unlock(),true);const first=a.dispose(),second=a.dispose();assert.equal(first,second);await first;assert.equal(await a.unlock(),false);assert.equal(await a.playTrack('opening'),false);assert.equal(a.pendingTrack,null);assert.equal(contexts.length,1);assert.equal(contexts[0].closeCalls,1);assert.equal(a.status,'closed');
});
test('terminal worklet shutdown releases outstanding RPC and port without waiting for a suspended processor',async t=>{
 const messages=[];let disconnected=0,closed=0;
 replace(t,'AudioWorkletNode',class{constructor(){this.port={onmessage:null,postMessage:m=>messages.push(m),close:()=>closed++};}connect(){}disconnect(){disconnected++;}});
 const live=new OriginalOPLAudio({state:'suspended'},{},{},()=>{}),pending=live.request('status').then(()=>null,e=>e.message);await live.dispose({waitForAck:false});assert.match(await pending,/disposed/);assert.equal(live.pending.size,0);assert.equal(disconnected,1);assert.equal(closed,1);assert.equal(live.node.port.onmessage,null);assert.equal(live.node.onprocessorerror,null);assert.deepEqual(messages.map(m=>m.type),['status','dispose']);
});
test('disposed processor stops its active-source lifetime and clears the final output quantum',async t=>{
 let Processor;replace(t,'AudioWorkletProcessor',class{constructor(){this.port={postMessage(){},onmessage:null};}});replace(t,'registerProcessor',(_name,value)=>{Processor=value;});await import('../dist/js/opl-sequence-worklet.js?lifecycle-test');const p=new Processor(),out=new Float32Array(128).fill(.5);assert.equal(p.process([],[[out]]),true);assert(out.every(n=>n===0));let disposed=0;p.player={dispose(){disposed++;}};await p.command({type:'dispose',request:1});out.fill(.5);assert.equal(p.process([],[[out]]),false);assert(out.every(n=>n===0));assert.equal(p.process([],[]),false);assert.equal(disposed,1);
});
test('stale music download failure after close never overwrites terminal closed status',async t=>{
 audioContext(t);readyFetch(t);const a=new OriginalAudio({musicBackend:'flac'});assert.equal(await a.unlock(),true);a.manifest={...manifest,tracks:{opening:{file:'opening.flac'}}};const entered=deferred(),response=deferred();replace(t,'fetch',()=>{entered.resolve();return response.promise;});const pending=a.playTrack('opening');await entered.promise;await a.dispose();response.reject(Error('late network failure'));assert.equal(await pending,false);assert.equal(a.status,'closed');assert.equal(a.error,null);assert.equal(a.musicSource,null);
});
test('successful stale effect download after close never decodes on a dead context',async t=>{
 const contexts=audioContext(t);readyFetch(t);const a=new OriginalAudio({musicBackend:'flac'});assert.equal(await a.unlock(),true);a.manifest={...manifest,effects:{1:{file:'effect.wav'}}};let decoded=0;contexts[0].decodeAudioData=async()=>{decoded++;return{};};const entered=deferred(),response=deferred();replace(t,'fetch',()=>{entered.resolve();return response.promise;});const pending=a.triggerEffect(1);await entered.promise;await a.dispose();response.resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)});assert.equal(await pending,false);assert.equal(decoded,0);assert.equal(a.status,'closed');assert.equal(a.error,null);
});
