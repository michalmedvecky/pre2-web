// Derive note onsets and pitch from the actual recovered mixer, not assumed ProTracker tempo.
import{readFile,writeFile,mkdir}from'node:fs/promises';import{createHash}from'node:crypto';import{parseModule,OriginalMixer,AUDIO_RATE,AUDIO_BLOCK}from'../dist/js/audio.js';
const out='art/music-faithful-v1',raw=await readFile('dist/assets/music/PRES.mod'),song=parseModule(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),m=new OriginalMixer();m.setSong(song);const duration=31.547376,excerptStart=8.516592,dt=AUDIO_BLOCK/AUDIO_RATE,events=[],rows=[],active=Array(4).fill(null),root={3:36,4:60,5:72,6:53},blocks=[],lastStep=Array(4).fill(0),channels=Array(4).fill(null);
function close(c,t){if(active[c]){active[c].end=t;active[c]=null;}}
for(let tick=0;tick*dt<duration;tick++){
 const time=tick*dt,selected=m.countdown===1?{order:m.order,pattern:song.orders[m.order]||0,row:m.row}:null;
 let rawEvents;if(selected){const p=selected.pattern*1024+selected.row*16;rawEvents=Array.from({length:4},(_,c)=>song.events.slice(p+c*4,p+c*4+4));rows.push({...selected,time,tick});}
 const nativeBlock=m.block();blocks.push(nativeBlock);
 for(let c=0;c<4;c++){
  const v=m.voices[c],i=v.instrument+1,e=rawEvents?.[c],inst=e?((e[0]&240)|(e[2]>>>4)):0,period=e?((e[0]&15)<<8)|e[1]:0,pitched=i in root;
  if(!pitched||v.volume===0||v.position<0){close(c,time);channels[c]=null;continue;}
  const changed=inst||period&&v.step!==lastStep[c];
  if(changed||!active[c]&&e&&(inst||period)){
   close(c,time);const signed=v.step>32767?v.step-65536:v.step,ratio=1+signed/256,pitch=root[i]+12*Math.log2(ratio);
   const note={channel:c,instrument:i,time,end:duration,pitch,midi:Math.round(pitch),velocity:v.volume,step:v.step,order:selected?.order,row:selected?.row,period};events.push(note);active[c]=note;channels[c]=i;
  }
  if(active[c]){active[c].volumeAutomation??=[];const a=active[c].volumeAutomation;if(a.at(-1)?.volume!==v.volume)a.push({time,volume:v.volume});}
  lastStep[c]=v.step;
 }
}
for(let c=0;c<4;c++)close(c,duration);
await mkdir(out,{recursive:true});const timeline={source:'dist/assets/music/PRES.mod',sourceSHA256:createHash('sha256').update(raw).digest('hex'),duration,excerptStart,excerptDuration:duration-excerptStart,tickSeconds:dt,instrumentRoots:root,rootExplanation:'Fundamental of source samples at native step0: bass C2, xylo C4, glock C5, vocoder F3. Pitch follows actual fixed-point step ratios. Original percussion and bird effects omitted, no new pitched notes added.',rows,events:events.filter(e=>e.end>e.time)};await writeFile(out+'/timeline.json',JSON.stringify(timeline,null,2)+'\n');console.log({notes:timeline.events.length,ranges:Object.fromEntries(Object.keys(root).map(i=>[i,[Math.min(...events.filter(e=>e.instrument==i).map(e=>e.midi)),Math.max(...events.filter(e=>e.instrument==i).map(e=>e.midi))]]))});

// Paired reference uses exactly the same passage and recovered mixer output.
const rate=48000,n=Math.round((duration-excerptStart)*rate),source=Uint8Array.from(blocks.flatMap(b=>[...b])),wav=Buffer.alloc(44+n*4);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(n*4,40);let prev=0,dc=0;const warm=Math.round(.5*rate),pole=Math.exp(-2*Math.PI*20/rate);for(let i=-warm;i<n;i++){const p=(i/rate+excerptStart)*AUDIO_RATE,j=Math.floor(p),f=p-j,x=((source[j]*(1-f)+(source[j+1]??source[j])*f)/128-1)*.65;dc=pole*(dc+x-prev);prev=x;if(i<0)continue;const y=Math.round(Math.max(-1,Math.min(1,dc))*32767);wav.writeInt16LE(y,44+i*4);wav.writeInt16LE(y,46+i*4);}await writeFile(out+'/output/PRES-source-excerpt.wav',wav);
