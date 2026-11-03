// Yield without the nested-timer 4ms clamp during bounded artwork preparation.
// Browser task scheduling keeps input/painting responsive; Node keeps its normal
// timer fallback so test runners do not retain MessagePorts or exit prematurely.
let channel,queue=[];
export function yieldHDTask(){
  if(typeof globalThis.scheduler?.yield==='function')return globalThis.scheduler.yield();
  if(typeof document!=='undefined'&&typeof MessageChannel==='function'){
    if(!channel){channel=new MessageChannel();channel.port1.onmessage=()=>queue.shift()?.();}
    return new Promise(resolve=>{queue.push(resolve);channel.port2.postMessage(0);});
  }
  return new Promise(resolve=>setTimeout(resolve,0));
}
