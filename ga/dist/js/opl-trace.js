// Original offline GOLD output log: uint32 native tick + uint8 register/value.
export const NATIVE_MUSIC_TICK_PIT=1190;
export const PIT_HZ=1193182;
export function parseOPLTrace(bytes){
  const view=new DataView(bytes.buffer||bytes,bytes.byteOffset||0,bytes.byteLength);if(view.byteLength===0||view.byteLength%6)throw new Error('Invalid original OPL trace.');
  const rows=Array.from({length:view.byteLength/6},(_,i)=>({tick:view.getUint32(i*6,true),reg:view.getUint8(i*6+4),value:view.getUint8(i*6+5)}));
  if(rows.some((r,i)=>i&&r.tick<rows[i-1].tick))throw new Error('Original trace is not chronological.');return rows;
}
export function frameForTick(tick,rate){return Math.ceil(tick*NATIVE_MUSIC_TICK_PIT/PIT_HZ*rate);}
export function renderOriginalTrace(engine,rows,{sampleRate=48000,releaseFrames=48000}={}){
  const frames=Math.floor(rows.at(-1).tick*NATIVE_MUSIC_TICK_PIT/PIT_HZ*sampleRate)+releaseFrames;
  const pcm=new Int16Array(frames);engine.reset(sampleRate);let frame=0;
  for(const row of rows){const next=Math.min(frames,frameForTick(row.tick,sampleRate));if(next>frame){engine.renderInto(pcm,frame,next-frame);frame=next;}engine.write(row.reg,row.value);}
  if(frame<frames)engine.renderInto(pcm,frame,frames-frame);return pcm;
}
