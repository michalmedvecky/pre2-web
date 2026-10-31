import {GoldVoice} from './opl-gold-voice.js';
import {frameForTick} from './opl-trace.js';
// One-track proof. Event timestamps are original parser delta ticks under the
// existing AXE1190-PIT-count music clock. No PCM looping or EXE interpretation.
export class OriginalOPLPlayer {
  constructor(engine,tables,events,{sampleRate=48000,onWrite=null}={}){
    this.engine=engine;this.events=events;this.sampleRate=sampleRate;this.cursor=0;this.eventIndex=0;this.controls=[];this.disposed=false;this.onWrite=onWrite;
    engine.reset(sampleRate);this.voice=new GoldVoice(tables,(reg,value)=>{engine.write(reg,value);onWrite?.({frame:this.cursor,reg,value});});this.voice.start();
  }
  scheduleEnabled(frame,enabled){if(!Number.isInteger(frame)||frame<this.cursor)throw new Error('Control precedes renderer cursor.');this.controls.push({frame,enabled:!!enabled});this.controls.sort((a,b)=>a.frame-b.frame);}
  setEnabled(enabled){this.voice.setEnabled(enabled);}
  renderInto(pcm,offset=0,count=pcm.length-offset){
    if(this.disposed){pcm.fill(0,offset,offset+count);return;}
    const end=this.cursor+count;let dst=offset;
    while(this.cursor<end){
      // Native control before the corresponding parser event at equal timestamp.
      while(this.controls.length&&this.controls[0].frame<=this.cursor)this.setEnabled(this.controls.shift().enabled);
      while(this.eventIndex<this.events.length&&frameForTick(this.events[this.eventIndex].tick,this.sampleRate)<=this.cursor)this.voice.event(this.events[this.eventIndex++]);
      const nextEvent=this.events[this.eventIndex];const boundary=Math.min(end,nextEvent?frameForTick(nextEvent.tick,this.sampleRate):Infinity,this.controls[0]?.frame??Infinity);
      const n=boundary-this.cursor;if(n>0){this.engine.renderInto(pcm,dst,n);this.cursor+=n;dst+=n;}
    }
  }
  dispose(){this.disposed=true;this.controls.length=0;this.onWrite=null;}
}
