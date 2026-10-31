// Standalone one-track AudioWorklet proof; not the application audio default.
export async function createOriginalOPLProof({context,muted=true}={}){
  if(!context)throw new Error('Supply a user-gesture AudioContext.');
  const base=new URL('../assets/audio/opl/',import.meta.url);const [wasm,tables,events]=await Promise.all([fetch(new URL('nuked-opl3.wasm',base)).then(r=>r.arrayBuffer()),fetch(new URL('gold-tables.json',base)).then(r=>r.json()),fetch(new URL('intro.events.json',base)).then(r=>r.json())]);
  await context.audioWorklet.addModule(new URL('./opl-worklet.js',import.meta.url));
  const node=new AudioWorkletNode(context,'golden-axe-original-opl-proof',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[1]});const gain=context.createGain();gain.gain.value=muted?0:1;node.connect(gain).connect(context.destination);
  const replies=[];let resolveReady,rejectReady;const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
  node.port.onmessage=e=>{replies.push(e.data);if(e.data.type==='ready')resolveReady(e.data);if(e.data.type==='error')rejectReady(new Error(e.data.message));};node.port.postMessage({type:'init',wasm,tables,events},[wasm]);await ready;
  return {node,gain,replies,setEnabled:enabled=>node.port.postMessage({type:'enabled',enabled}),status:()=>node.port.postMessage({type:'status'}),dispose(){node.port.postMessage({type:'dispose'});node.disconnect();gain.disconnect();}};
}
