import{RemasteredMusic}from'./remastered-music.js';
// Original Sound Blaster digital path: 0x12229, 0x1236B, 0x1241A, 0x124AF.
// No ProTracker BPM semantics or interpolation are substituted into this mixer.
export const AUDIO_RATE = 1000000 / 119;
export const AUDIO_BLOCK = 168;
export const SAMPLE_LENGTHS = [6286,7296,9054,6630,2738,2322,0,13778,1732,7302,3630];
// Byte-exact tables from inner.raw.bin, DS:E73 and DS:EBB (DS module offset A030).
export const PERIODS = [856,808,762,720,678,640,604,570,538,508,480,453,428,404,381,360,339,320,302,285,269,254,240,226,214,202,190,180,170,160,151,143,135,127,120,113];
export const PHASE_STEPS = [65407,65415,65423,65432,65441,65451,65461,65472,65483,65495,65508,65521,0,15,31,48,67,86,106,128,151,175,200,228,256,286,320,352,388,428,469,510,555,606,657,713];

export function parseModule(buffer) {
  const b = new Uint8Array(buffer), view = new DataView(b.buffer,b.byteOffset,b.byteLength);
  if (b.length < 600) throw new Error('Truncated music module');
  const modern = String.fromCharCode(...b.subarray(1080,1084)) === 'M.K.';
  const count = modern ? 31 : 15, orderOffset = 20 + count * 30;
  const length = b[orderOffset], orders = Array.from(b.subarray(orderOffset+2,orderOffset+130));
  if (!length || length > 128) throw new Error('Invalid module order count');
  const patternOffset = modern ? 1084 : 600;
  const patterns = 1 + Math.max(...orders.slice(0,length));
  let sampleOffset = patternOffset + patterns * 1024;
  if (sampleOffset > b.length) throw new Error('Truncated module patterns');
  const instruments = [];
  // Keep one contiguous bank: the original mixer can read one byte at an end boundary.
  const samples = Array.from(b.subarray(sampleOffset), x => ((x + 128) & 255) >>> 2);
  let start = 0;
  for (let i=0;i<count;i++) {
    const o = 20+i*30, size = view.getUint16(o+22)*2;
    if (start + size > samples.length) throw new Error('Truncated module samples');
    instruments.push({start,length:size,volume:Math.min(64,b[o+25]),loopStart:view.getUint16(o+26)*2,loopLength:view.getUint16(o+28)*2});
    start += size;
  }
  return {length,orders,instruments,samples,events:Array.from(b.subarray(patternOffset,patternOffset+patterns*1024))};
}

// Self-contained so the same tested kernel runs inside an AudioWorklet.
export class OriginalMixer {
  constructor(periods = PERIODS, steps = PHASE_STEPS) {
    this.periods=periods; this.steps=steps; this.song=null; this.effect=null;
    this.setSong(null);
  }
  setSong(song) {
    this.song=song; this.order=0; this.row=0; this.speed=6; this.countdown=1;
    this.voices=Array.from({length:4},()=>({instrument:0,position:-1,end:0,volume:0,slide:0,phase:0,step:0}));
  }
  setEffect(samples) { this.effect={samples,position:0}; }
  tick() {
    if (!this.song) return;
    for (const v of this.voices) v.volume=Math.max(0,Math.min(64,v.volume+v.slide));
    this.countdown=(this.countdown-1)&255;
    if (this.countdown) return;
    this.countdown=this.speed;
    // Read all four events from the row selected before effects B/D alter counters.
    const offset=(this.song.orders[this.order] || 0)*1024+this.row*16;
    for (let c=0;c<4;c++) {
      const v=this.voices[c], e=this.song.events, o=offset+c*4;
      const a=e[o]||0,b=e[o+1]||0,d=e[o+2]||0,p=e[o+3]||0;
      v.slide=0;
      if (!(a||b||d||p)) continue;
      const inst=(a&240)|(d>>>4), period=((a&15)<<8)|b;
      if (inst && this.song.instruments[inst-1]) {
        v.instrument=inst-1; v.position=0; v.phase=0;
        v.end=this.song.instruments[inst-1].length; v.volume=this.song.instruments[inst-1].volume;
      }
      if (period) { const index=this.periods.indexOf(period); if(index>=0) v.step=this.steps[index]; }
      switch (d&15) {
        case 10: v.slide=p>>>4 || -p; break;
        case 11: this.order=p; this.row=-1; break;
        case 12: v.volume=Math.min(64,p); break;
        case 13: this.row=((p-1)<<24)>>24; this.order++; break;
        case 15: this.speed=p; break;
      }
    }
    this.row++;
    if (this.row===64) { this.row=0; this.order++; if(this.order>this.song.length)this.order=0; }
  }
  block() {
    this.tick();
    const out=new Uint8Array(168);
    if (this.effect) {
      const count=Math.min(168,this.effect.samples.length-this.effect.position);
      out.set(this.effect.samples.subarray(this.effect.position,this.effect.position+count));
      this.effect.position+=count;
      if (this.effect.position>=this.effect.samples.length) this.effect=null;
    }
    if (!this.song) return out;
    for(let c=0;c<(this.effect?3:4);c++) {
      const v=this.voices[c], instrument=this.song.instruments[v.instrument];
      if(v.position<0 || !instrument)continue;
      for(let i=0;i<168;i++) {
        const sample=this.song.samples[instrument.start+v.position] || 0;
        out[i]=(out[i]+Math.floor(v.volume*sample/64))&255;
        // LODSB increments SI first; ADD DX,BP then signed DH adjusts that increment.
        const phase=(v.phase+v.step)&65535;
        const high=phase>>>8;
        v.position+=1+(high>=128?high-256:high); v.phase=phase&255;
        if(v.position>v.end)break;
      }
      if(v.position>=v.end) {
        v.position=-1;
        if(instrument.loopLength>=12) {v.position=instrument.loopStart;v.end=instrument.loopStart+instrument.loopLength;}
      }
    }
    return out;
  }
}

export class GameAudio {
  constructor(base = new URL('../assets/',import.meta.url)) {
    this.base=base; this.context=null; this.node=null; this.muted=false;
    this.musicMode='original';this.remastered=null;this.track=null; this.trackToken=0; this.modules=new Map(); this.sampleBank=null;
  }
  async unlock() {
    if (!this.context) {
      const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
      if(!Context)return false;
      this.context=new Context();
      // A private module avoids a separate worklet URL and retains the exact kernel.
      const source=`const PERIODS=${JSON.stringify(PERIODS)},PHASE_STEPS=${JSON.stringify(PHASE_STEPS)};
${OriginalMixer.toString()}
class Pre2Processor extends AudioWorkletProcessor {
 constructor(){super();this.mixer=new OriginalMixer();this.block=null;this.position=0;this.fraction=0;this.muted=false;
 this.port.onmessage=({data:d})=>{if(d.type==='song'){this.mixer.setSong(d.song);this.block=null;this.position=0;}if(d.type==='effect')this.mixer.setEffect(new Uint8Array(d.samples));if(d.type==='mute')this.muted=d.muted;};}
 process(inputs,outputs){const out=outputs[0][0];for(let i=0;i<out.length;i++){
 if(!this.block){this.block=this.mixer.block();this.position=0;}
 out[i]=this.muted?0:(this.block[this.position]/128-1)*0.65;
 this.fraction+=${AUDIO_RATE}/sampleRate;
 while(this.fraction>=1){this.fraction--;this.position++;if(this.position>=168){this.block=this.mixer.block();this.position=0;}}
 }return true;}
}registerProcessor('prehistorik-original',Pre2Processor);`;
      const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
      try {
        await this.context.audioWorklet.addModule(url);
        this.node=new AudioWorkletNode(this.context,'prehistorik-original',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[1]});
        // Sound Blaster analog output is AC coupled; remove unsigned-buffer DC.
        const dc=this.context.createBiquadFilter();dc.type='highpass';dc.frequency.value=20;
        this.node.connect(dc);dc.connect(this.context.destination);this.remastered=new RemasteredMusic(this.context,{base:this.base});this.remastered.setMuted(this.muted);
        this.node.port.postMessage({type:'mute',muted:this.muted});
      } finally { URL.revokeObjectURL(url); }
      if(this.track) await this.setTrack(this.track);
    }
    await this.context.resume(); return true;
  }
  async setMusicMode(mode){if(!['original','orchestral'].includes(mode))throw Error('Invalid music mode');this.musicMode=mode;return this.setTrack(this.track);}
  async setTrack(name) {
    if(name&&!/^[A-Za-z0-9_-]+$/.test(name))throw Error('Invalid music name');
    this.track=name;const token=++this.trackToken;this.remastered?.stop();if(!this.node)return 'original';
    if(!name){this.node.port.postMessage({type:'song',song:null});return 'original';}
    if(!this.modules.has(name))this.modules.set(name,fetch(new URL(`music/${name}.mod`,this.base)).then(r=>{if(!r.ok)throw Error(`Music ${name}: ${r.status}`);return r.arrayBuffer();}).then(parseModule).catch(e=>{this.modules.delete(name);throw e;}));
    const song=await this.modules.get(name);if(token!==this.trackToken)return null;
    // Original plays while the optional arrangement loads, and remains the failure fallback.
    this.node.port.postMessage({type:'song',song});
    if(this.musicMode==='orchestral')try{const playing=await this.remastered.play(name);if(playing&&token===this.trackToken&&this.musicMode==='orchestral'){this.node.port.postMessage({type:'song',song:null});return 'orchestral';}}catch{if(token!==this.trackToken)return null;return 'original';}
    return token===this.trackToken?'original':null;
  }
  async sfx(index) {
    if(!this.node||index<0||index>=SAMPLE_LENGTHS.length)return;
    if(!this.sampleBank)this.sampleBank=fetch(new URL('sfx.bin',this.base)).then(r=>{if(!r.ok)throw new Error(`SFX: ${r.status}`);return r.arrayBuffer();}).then(b=>new Uint8Array(b));
    const bank=await this.sampleBank;
    const start=SAMPLE_LENGTHS.slice(0,index).reduce((a,b)=>a+b,0);
    const samples=Uint8Array.from(bank.subarray(start,start+SAMPLE_LENGTHS[index]),x=>((x+128)&255)>>>2);
    this.node.port.postMessage({type:'effect',samples});
  }
  setMuted(muted) {this.muted=!!muted;this.remastered?.setMuted(this.muted);this.node?.port.postMessage({type:'mute',muted:this.muted});}
  stop() {this.remastered?.stop();this.track=null;this.trackToken++;this.node?.port.postMessage({type:'song',song:null});this.node?.port.postMessage({type:'effect',samples:new Uint8Array()});}
}
