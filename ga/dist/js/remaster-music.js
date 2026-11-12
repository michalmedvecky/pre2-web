// One lazy PCM remaster beside the original OPL clock. No gameplay waits for it.
export function remasterOffset(elapsed, record, loop = true) {
  const time = Math.max(0, elapsed);
  if (!loop && time >= record.firstCycleEnd) return null;
  if (time < record.startupEnd) return time;
  return record.loopStart + (time - record.logicalLoopStart) % record.sourceLoopDuration;
}

export function remasterPlan(elapsed, record, loop = true) {
  const time=Math.max(0,elapsed);
  if(!loop&&time>=record.firstCycleEnd)return [];
  const remaining=loop?undefined:record.firstCycleEnd-time;
  if(time<record.startupEnd){
    const head=Math.min(record.startupEnd-time,remaining??Infinity);
    const plan=[{delay:0,offset:time,duration:head,loop:false}];
    if(loop||remaining>head)plan.push({delay:head,offset:record.loopStart+record.steadySkipAtStartup,duration:loop?undefined:remaining-head,loop});
    return plan;
  }
  return [{delay:0,offset:record.loopStart+(time-record.logicalLoopStart)%record.sourceLoopDuration,duration:remaining,loop}];
}

// All scheduled node boundaries share absolute context frames. In particular,
// do not pass the cold head as start(..., duration): browsers ceil the computed
// grain duration, so 2 - 1.98 can otherwise overlap the steady node by one frame.
export function remasterFramePlan(now, startedAt, record, loop, sampleRate, bufferFrames=Infinity) {
  const trackFrame=Math.round(startedAt*sampleRate),whenFrame=Math.max(Math.round(now*sampleRate),trackFrame),elapsed=whenFrame-trackFrame;
  const startup=Math.round(record.startupEnd*sampleRate),intro=Math.round(record.logicalLoopStart*sampleRate);
  const loopStart=Math.round(record.loopStart*sampleRate),loopEnd=Math.min(bufferFrames,Math.round(record.loopEnd*sampleRate)),period=loopEnd-loopStart;
  const end=trackFrame+Math.round(record.firstCycleEnd*sampleRate),parts=[];
  if(!loop&&whenFrame>=end)return {parts,loopStart,loopEnd};
  if(elapsed<startup){
    const join=trackFrame+startup,headEnd=loop?join:Math.min(join,end);
    parts.push({startFrame:whenFrame,offsetFrame:elapsed,stopFrame:headEnd,loop:false});
    if(loop||end>join)parts.push({startFrame:join,offsetFrame:loopStart+startup-intro,stopFrame:loop?null:end,loop});
  }else parts.push({startFrame:whenFrame,offsetFrame:loopStart+(elapsed-intro)%period,stopFrame:loop?null:end,loop});
  return {parts,loopStart,loopEnd};
}

function validateRecord(record) {
  if (!record || typeof record.file !== 'string' || !/^[A-Za-z0-9_-]+\.flac$/.test(record.file) || !/^[a-f0-9]{64}$/.test(record.sha256)) throw Error('Invalid remastered track.');
  if (![record.duration,record.loopStart,record.loopEnd,record.firstCycleEnd,record.startupEnd,record.logicalLoopStart,record.sourceLoopDuration,record.steadySkipAtStartup].every(Number.isFinite) || record.loopStart < 0 || record.loopEnd <= record.loopStart || record.loopEnd > record.duration + 1 / 48000 || record.firstCycleEnd <= 0 || record.firstCycleEnd > record.loopEnd || record.steadySkipAtStartup<0 || record.steadySkipAtStartup>=record.sourceLoopDuration || Math.abs(record.startupEnd-record.loopStart)>1/48000 || Math.abs(record.sourceLoopDuration-(record.loopEnd-record.loopStart))>1/48000 || Math.abs(record.startupEnd-record.logicalLoopStart-record.steadySkipAtStartup)>1/48000) throw Error('Invalid remastered music loop.');
  return record;
}

export class RemasterMusic {
  constructor({context,destination,manifestURL = new URL('../assets/audio/remaster/manifest.json',import.meta.url),onChange = ()=>{}}) {
    this.context=context;this.destination=destination;this.manifestURL=manifestURL;this.onChange=onChange;
    this.manifest=null;this.buffer=null;this.bufferId=null;this.sources=[];this.controller=null;this.outputGain=null;this.released=new Map();
    this.decodeTail=Promise.resolve();
    this.generation=0;this.disposed=false;this.active=false;this.state='idle';this.error=null;
  }
  alive(generation) {return !this.disposed && this.context.state !== 'closed' && generation === this.generation;}
  notify() {this.onChange(this);}
  releaseRetired() {
    for(const [source,gate] of this.released){source.onended=null;try{source.stop();}catch{}source.disconnect();gate.disconnect();}
    this.released.clear();
  }
  stop({clearBuffer=false,fadeSeconds=.015}={}) {
    if(this.context.state!=='running')this.releaseRetired();
    this.generation++;this.controller?.abort();this.controller=null;
    this.active=false;
    const gate=this.outputGain;this.outputGain=null;
    const fade=gate&&this.context.state==='running'?Math.max(0,fadeSeconds):0;
    let remaining=this.sources.length;
    if(fade&&remaining){gate.gain.cancelScheduledValues?.(this.context.currentTime);gate.gain.setValueAtTime(gate.gain.value,this.context.currentTime);gate.gain.linearRampToValueAtTime(0,this.context.currentTime+fade);}
    for(const source of this.sources){
      if(fade){
        this.released.set(source,gate);
        source.onended=()=>{source.disconnect();this.released.delete(source);if(--remaining===0)gate.disconnect();};
        try{source.stop(this.context.currentTime+fade);}catch{source.disconnect();this.released.delete(source);if(--remaining===0)gate.disconnect();}
      }else{source.onended=null;try{source.stop();}catch{}source.disconnect();}
    }
    if(gate&&(!fade||!remaining))gate.disconnect();
    this.sources=[];
    if(clearBuffer){this.buffer=null;this.bufferId=null;}
    if(!this.disposed)this.state='idle';
    this.notify();
  }
  async select(id,{startedAt,loop=true}={}) {
    this.stop({clearBuffer:this.bufferId!==id});
    if(this.disposed||this.context.state==='closed'||!Number.isFinite(startedAt))return false;
    const generation=this.generation,controller=new AbortController();this.controller=controller;
    this.state='loading';this.error=null;this.notify();
    try {
      if(!this.manifest){
        const response=await fetch(this.manifestURL,{signal:controller.signal});
        if(!this.alive(generation))return false;
        if(!response.ok)throw Error(`The music remaster is unavailable (${response.status}).`);
        const manifest=await response.json();if(!this.alive(generation))return false;
        if(manifest.version!==1||!manifest.tracks)throw Error('Invalid remastered music catalog.');
        this.manifest=manifest;
      }
      const record=validateRecord(this.manifest.tracks[id]);
      if(!this.buffer){
        const response=await fetch(new URL(record.file,this.manifestURL),{signal:controller.signal});
        if(!this.alive(generation))return false;
        if(!response.ok)throw Error(`The remastered track is unavailable (${response.status}).`);
        const bytes=await response.arrayBuffer();if(!this.alive(generation))return false;
        if(!globalThis.crypto?.subtle)throw Error('Audio integrity verification is unavailable in this browser.');
        const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
        if(!this.alive(generation))return false;
        if([...hash].map(n=>n.toString(16).padStart(2,'0')).join('')!==record.sha256)throw Error('The downloaded remastered track failed integrity verification.');
        // Browser decode cannot be aborted. Serialize it, and skip superseded
        // selections before they allocate another large decoded PCM buffer.
        const decoded=this.decodeTail.then(()=>this.alive(generation)?this.context.decodeAudioData(bytes):null);
        this.decodeTail=decoded.then(()=>undefined,()=>undefined);
        const buffer=await decoded;if(!this.alive(generation)||!buffer)return false;
        if(buffer.length*buffer.numberOfChannels*4>64*1024*1024)throw Error('The remastered track exceeds the player memory limit.');
        if(Math.abs(buffer.duration-record.duration)>Math.max(2/buffer.sampleRate,.002))throw Error('The remastered track duration does not match.');
        this.buffer=buffer;this.bufferId=id;
      }
      const rate=this.context.sampleRate||this.buffer.sampleRate,plan=remasterFramePlan(this.context.currentTime,startedAt,record,loop,rate,this.buffer.length);
      if(!plan.parts.length){this.state='ended';this.notify();return false;}
      const gate=this.context.createGain();gate.gain.value=1;gate.connect(this.destination);this.outputGain=gate;
      for(const part of plan.parts){
        const source=this.context.createBufferSource();source.buffer=this.buffer;source.loop=part.loop;source.loopStart=plan.loopStart/rate;source.loopEnd=plan.loopEnd/rate;source.connect(gate);
        source.onended=()=>{const i=this.sources.indexOf(source);if(i<0)return;this.sources.splice(i,1);source.disconnect();if(!this.sources.length){gate.disconnect();if(this.outputGain===gate)this.outputGain=null;this.active=false;this.state='ended';this.notify();}};
        this.sources.push(source);
        source.start(part.startFrame/rate,part.offsetFrame/rate);
        if(part.stopFrame!==null)source.stop(part.stopFrame/rate);
      }
      this.active=true;this.state='playing';this.notify();return true;
    } catch(error) {
      if(!this.alive(generation)||controller.signal.aborted)return false;
      this.error=String(error.message||error);this.state='failed';this.active=false;this.notify();return false;
    } finally {if(this.controller===controller)this.controller=null;}
  }
  dispose() {if(this.disposed)return;this.disposed=true;this.stop({clearBuffer:true,fadeSeconds:0});this.releaseRetired();this.manifest=null;this.state='closed';this.onChange=()=>{};}
}
