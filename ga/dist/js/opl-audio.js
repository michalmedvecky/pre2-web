// Browser adapter. The processor owns one persistent original voice/chip clock.
export class OriginalOPLAudio {
  static async create({context,destination,baseURL=new URL('../assets/audio/opl/',import.meta.url),enabled=true,signal,onError}={}){
    if(!context.audioWorklet||typeof globalThis.AudioWorkletNode!=='function'||typeof WebAssembly!=='object')throw new Error('AudioWorklet/WASM unavailable.');
    const load=async(file,json=false)=>{const response=await fetch(new URL(file,baseURL),{signal});if(!response.ok)throw new Error('Original OPL asset HTTP'+response.status+': '+file);return json?response.json():response.arrayBuffer();};
    const [wasm,tables,catalog]=await Promise.all([load('nuked-opl3.wasm'),load('gold-tables.json',true),load('catalog.json',true)]);
    const scores=Object.fromEntries(await Promise.all(Object.entries(catalog.scores).map(async([name,record])=>[name,await load(record.file,true)])));
    await context.audioWorklet.addModule(new URL('./opl-sequence-worklet.js',import.meta.url));
    signal?.throwIfAborted();
    const instance=new OriginalOPLAudio(context,destination,catalog,onError),abort=()=>{instance.dispose().catch(()=>{});};signal?.addEventListener('abort',abort,{once:true});
    try{await instance.request('init',{wasm,tables,catalog,scores,enabled},[wasm]);signal?.throwIfAborted();return instance;}
    catch(error){await instance.dispose();throw error;}finally{signal?.removeEventListener('abort',abort);}
  }
  constructor(context,destination,catalog,onError){
    this.context=context;this.catalog=catalog;this.onError=onError;this.disposed=false;this.nextRequest=0;this.pending=new Map();this.messages=[];this.generation=0;
    this.node=new AudioWorkletNode(context,'golden-axe-original-opl',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[1]});this.node.connect(destination);
    this.node.port.onmessage=e=>{const m=e.data;this.messages.push(m);if(this.messages.length>64)this.messages.shift();const pending=this.pending.get(m.request);if(pending){this.pending.delete(m.request);clearTimeout(pending.timer);if(m.type==='error')pending.reject(new Error(m.message));else pending.resolve(m);}};
    this.node.onprocessorerror=()=>{this.error='Original OPL AudioWorklet processor failed.';for(const pending of this.pending.values()){clearTimeout(pending.timer);pending.reject(new Error(this.error));}this.pending.clear();this.onError?.(new Error(this.error));};
  }
  request(type,data={},transfer=[]){
    if(this.error&&type!=='dispose')return Promise.reject(new Error(this.error));
    if(this.disposed&&type!=='dispose')return Promise.reject(new Error('Original OPL disposed.'));const request=++this.nextRequest;
    return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(request);reject(new Error('Original OPL '+type+' timeout.'));},10000);this.pending.set(request,{resolve,reject,timer});this.node.port.postMessage({type,request,...data},transfer);});
  }
  async play(name,options={}){const generation=++this.generation;await this.request('select',{name,options:{loop:options.loop??true}});return !this.disposed&&generation===this.generation;}
  setEnabled(enabled){if(!this.disposed)this.node.port.postMessage({type:'enabled',enabled:!!enabled});}
  stop(){this.generation++;if(!this.disposed)this.node.port.postMessage({type:'stop'});}
  status(){return this.request('status');}
  async dispose({waitForAck=true}={}){
    if(this.disposePromise)return this.disposePromise;
    this.disposed=true;this.generation++;
    for(const pending of this.pending.values()){clearTimeout(pending.timer);pending.reject(new Error('Original OPL disposed.'));}this.pending.clear();
    this.disposePromise=(async()=>{if(!this.error){if(waitForAck)await this.request('dispose').catch(()=>{});else this.node.port.postMessage({type:'dispose'});}this.node.disconnect();this.node.port.onmessage=null;this.node.port.close();this.node.onprocessorerror=null;this.onError=null;})();return this.disposePromise;
  }
}
