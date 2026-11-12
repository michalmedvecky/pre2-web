// A small, predecoded source-derived bank. No remaster download starts on a hit.
export class RemasterEffects {
  constructor({context,manifestURL,originalEffects,onChange=()=>{}}) {
    this.context=context;this.manifestURL=manifestURL;this.originalEffects=originalEffects;
    this.onChange=onChange;this.buffers=new Map();this.failures=new Map();
    this.state='idle';this.error=null;this.disposed=false;this.generation=0;
    this.pending=null;this.controller=null;this.decodeTail=Promise.resolve();
  }
  get readyCount(){return this.buffers.size;}
  get(id){return this.buffers.get(String(id))||null;}
  alive(generation){return !this.disposed&&this.context.state!=='closed'&&generation===this.generation;}
  notify(){if(!this.disposed)this.onChange(this);}
  prepare({retry=false}={}) {
    if(this.disposed||this.context.state==='closed')return Promise.resolve(false);
    if(this.pending)return this.pending;
    if(this.state!=='idle'&&!retry)return Promise.resolve(this.readyCount===15);
    const generation=++this.generation,controller=new AbortController();this.controller=controller;
    this.state='loading';this.error=null;this.failures.clear();this.notify();
    const task=Promise.resolve().then(async()=>{
      try {
        if(!this.alive(generation))return false;
        const response=await fetch(this.manifestURL,{signal:controller.signal});
        if(!this.alive(generation))return false;
        if(!response.ok)throw Error('Remastered effects manifest HTTP '+response.status);
        const manifest=await response.json();if(!this.alive(generation))return false;
        if(manifest.version!==1||!manifest.effects||Object.keys(manifest.effects).length!==15)throw Error('Invalid remastered effects catalog.');
        await Promise.all(Array.from({length:15},async(_,index)=>{
          const id=String(index);if(this.buffers.has(id))return;
          try {
            const record=manifest.effects[id],original=this.originalEffects[id];
            if(!original||!record||!/^[a-f0-9]{64}$/.test(record.sha256)||record.file!=='effect-'+id+'-'+record.sha256.slice(0,16)+'.wav'||record.sourceSHA256!==original.sha256||record.sampleRate!==48000||record.frames!==Math.ceil(original.nativeDurationSeconds*48000)||record.frames<=0||record.frames>480000||![record.duration,record.nativeDurationSeconds,record.loopEnd].every(Number.isFinite)||Math.abs(record.duration-record.frames/48000)>1e-9||Math.abs(record.nativeDurationSeconds-original.nativeDurationSeconds)>1e-9||record.loopStart!==0||Math.abs(record.loopEnd-original.nativeDurationSeconds)>1e-9)throw Error('Invalid remastered effect '+id);
            const response=await fetch(new URL(record.file,this.manifestURL),{signal:controller.signal});
            if(!this.alive(generation))return;if(!response.ok)throw Error('Remastered effect HTTP '+response.status);
            const bytes=await response.arrayBuffer();if(!this.alive(generation))return;
            if(!globalThis.crypto?.subtle)throw Error('Audio integrity verification is unavailable.');
            const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));if(!this.alive(generation))return;
            if([...hash].map(x=>x.toString(16).padStart(2,'0')).join('')!==record.sha256)throw Error('Remastered effect checksum mismatch.');
            const decoded=this.decodeTail.then(()=>this.alive(generation)?this.context.decodeAudioData(bytes):null);
            this.decodeTail=decoded.then(()=>undefined,()=>undefined);
            const buffer=await decoded;if(!this.alive(generation)||!buffer)return;
            if(buffer.numberOfChannels!==1||buffer.length*4>2*1024*1024||Math.abs(buffer.duration-record.duration)>2/buffer.sampleRate)throw Error('Invalid decoded remastered effect.');
            this.buffers.set(id,{buffer,record});this.notify();
          } catch(error){if(this.alive(generation)&&!controller.signal.aborted)this.failures.set(id,String(error.message||error));}
        }));
        if(!this.alive(generation))return false;
        this.state=this.readyCount===15?'ready':this.readyCount?'partial':'failed';
        this.error=this.failures.size?'Some remastered effects are unavailable; originals will be used.':null;
        this.notify();return this.readyCount===15;
      } catch(error){if(this.alive(generation)){this.state='failed';this.error=String(error.message||error);this.notify();}return false;}
      finally{if(this.pending===task)this.pending=null;if(this.controller===controller)this.controller=null;}
    });this.pending=task;return task;
  }
  dispose(){if(this.disposed)return;this.disposed=true;this.generation++;this.controller?.abort();this.controller=null;this.buffers.clear();this.failures.clear();this.state='closed';this.onChange=()=>{};}
}
