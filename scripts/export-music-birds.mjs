// Preserve the native bird cue locations; musical piccolo replacement is authored separately.
import{readFile,writeFile,mkdir}from'node:fs/promises';import{OriginalMixer,parseModule,AUDIO_RATE,AUDIO_BLOCK}from'../dist/js/audio.js';
const base='art/music-faithful-v1',out='art/music-faithful-v2',t=JSON.parse(await readFile(base+'/timeline.json')),raw=await readFile('dist/assets/music/PRES.mod'),song=parseModule(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),m=new OriginalMixer();m.setSong(song);const birds=[];
for(let tick=0;tick*AUDIO_BLOCK/AUDIO_RATE<t.duration;tick++){
 const time=tick*AUDIO_BLOCK/AUDIO_RATE,read=m.countdown===1,p=(song.orders[m.order]||0)*1024+m.row*16,order=m.order,row=m.row,events=read?Array.from({length:4},(_,c)=>song.events.slice(p+c*4,p+c*4+4)):[];m.block();
 for(let c=0;c<events.length;c++){const[a,b,d,param]=events[c],inst=(a&240)|(d>>>4);if(inst!==7||time<t.excerptStart)continue;const step=m.voices[c].step,signed=step>32767?step-65536:step,ratio=1+signed/256;birds.push({time:time-t.excerptStart,sourceTime:time,order,row,channel:c,period:((a&15)<<8)|b,step,relativeSemitones:12*Math.log2(ratio),sourceDuration:song.instruments[6].length/(AUDIO_RATE*ratio),volume:m.voices[c].volume});}
}
await mkdir(out,{recursive:true});await writeFile(out+'/bird-cues.json',JSON.stringify({sourceSHA256:t.sourceSHA256,excerptStart:t.excerptStart,duration:t.excerptDuration,cues:birds},null,2)+'\n');console.log(birds);
