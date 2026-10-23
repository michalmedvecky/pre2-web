// Native mixer supplies note clock, row flow, fixed-point tuning and one-shot endings.
import{readFile,writeFile,mkdir}from'node:fs/promises';import{createHash}from'node:crypto';import{OriginalMixer,parseModule,AUDIO_RATE,AUDIO_BLOCK}from'../dist/js/audio.js';
const root='art/music-remaster-v1',plans=JSON.parse(await readFile(root+'/instruments.json')),dt=AUDIO_BLOCK/AUDIO_RATE,summaries=[];
for(const[name,plan]of Object.entries(plans)){
 const raw=await readFile(`dist/assets/music/${name}.mod`),song=parseModule(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),m=new OriginalMixer();m.setSong(song);const seen=new Map(),events=[],rows=[],birds=[],active=Array(4).fill(null),previousStep=Array(4).fill(0);let loopStart=0,duration=0,loopState;
 const close=(c,t)=>{if(active[c]){active[c].end=t;active[c]=null;}};
 for(let tick=0;tick<50000;tick++){
  if(m.order>=song.length){m.order=0;m.row=0;}
  const time=tick*dt,read=m.countdown===1,key=`${m.order}:${m.row}:${m.speed}`;let data,selected;
  if(read){if(seen.has(key)){loopStart=seen.get(key);duration=time;loopState=key;break;}seen.set(key,time);selected={order:m.order,pattern:song.orders[m.order]||0,row:m.row,time,tick};rows.push(selected);const p=selected.pattern*1024+selected.row*16;data=Array.from({length:4},(_,c)=>song.events.slice(p+c*4,p+c*4+4));}
  m.block();
  for(let c=0;c<4;c++){
   const v=m.voices[c],i=v.instrument+1,spec=plan[i],e=data?.[c],inst=e?((e[0]&240)|(e[2]>>>4)):0,period=e?((e[0]&15)<<8)|e[1]:0,delta=12*Math.log2(1+(v.step>32767?v.step-65536:v.step)/256);
   if(spec?.role==='bird'&&inst&&v.volume>0)birds.push({time,step:v.step,pitch:spec.root+delta,duration:song.instruments[i-1].length/(AUDIO_RATE*2**(delta/12)),instrument:i,channel:c,volume:v.volume});
   if(!spec||spec.role==='bird'||v.volume===0||v.position<0){close(c,time);previousStep[c]=v.step;continue;}
   if(inst||period&&v.step!==previousStep[c]){close(c,time);const note={time,end:null,pitch:spec.root+delta,instrument:i,channel:c,step:v.step,role:spec.role,chord:spec.chord||[0],velocity:v.volume,order:selected?.order,row:selected?.row,volumeAutomation:[]};events.push(note);active[c]=note;}
   if(active[c]&&active[c].volumeAutomation.at(-1)?.volume!==v.volume)active[c].volumeAutomation.push({time,volume:v.volume});previousStep[c]=v.step;
  }
 }
 if(!duration)throw Error('No bounded loop: '+name);for(let c=0;c<4;c++)close(c,duration);
 const result={name,sourceSHA256:createHash('sha256').update(raw).digest('hex'),duration,loopStart,loopEnd:duration,loopState,tickSeconds:dt,rows,events:events.filter(e=>e.end>e.time),birds};await mkdir(root+'/timelines',{recursive:true});await writeFile(`${root}/timelines/${name}.json`,JSON.stringify(result,null,2)+'\n');summaries.push({name,duration,loopStart,events:result.events.length,birds:birds.length});
}
await writeFile(root+'/timeline-summary.json',JSON.stringify(summaries,null,2)+'\n');console.log(summaries);
