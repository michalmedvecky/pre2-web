import {GoldVoice} from './opl-gold-voice.js';
import {GoldSequence} from './opl-sequence.js';
import {frameForTick,NATIVE_MUSIC_TICK_PIT,PIT_HZ} from './opl-trace.js';
export class OriginalOPLSequencePlayer {
  constructor(engine,tables,catalog,scores,{sampleRate=48000,onWrite=null}={}){
    this.engine=engine;this.sampleRate=sampleRate;this.cursor=0;this.disposed=false;this.controls=[];engine.reset(sampleRate);
    this.voice=new GoldVoice(tables,(reg,value)=>{engine.write(reg,value);onWrite?.({frame:this.cursor,reg,value});});this.sequence=new GoldSequence(this.voice,catalog,scores);
  }
  get tick(){return this.cursor*PIT_HZ/(this.sampleRate*NATIVE_MUSIC_TICK_PIT);}
  selectProgram(name,options={}){
    // A request is applied at the renderer quantum boundary. The next music
    // callback lies on the persistent clock grid; original071b sets1710=1.
    this.sequence.tick=Math.max(this.sequence.tick,this.tick);this.sequence.select(name,options);
  }
  setEnabled(enabled){this.voice.setEnabled(enabled);}
  stop(){this.sequence.stop();}
  schedule(frame,action){if(!Number.isInteger(frame)||frame<this.cursor)throw new Error('Control precedes chip cursor.');this.controls.push({frame,action});this.controls.sort((a,b)=>a.frame-b.frame);}
  renderInto(pcm,offset=0,count=pcm.length-offset){
    if(this.disposed){pcm.fill(0,offset,offset+count);return;}
    const end=this.cursor+count;let dst=offset;
    while(this.cursor<end){
      while(this.controls.length&&this.controls[0].frame<=this.cursor)this.controls.shift().action(this);
      this.sequence.advanceTo(this.tick);
      const boundary=Math.min(end,frameForTick(this.sequence.nextTick,this.sampleRate),this.controls[0]?.frame??Infinity);const n=boundary-this.cursor;
      if(n<=0)throw new Error('Original OPL schedule did not advance.');this.engine.renderInto(pcm,dst,n);this.cursor+=n;dst+=n;
    }
  }
  status(){return{frame:this.cursor,tick:this.tick,event:this.sequence.eventIndex,index:this.sequence.index,completed:this.sequence.completed,name:this.sequence.name??null,active:this.sequence.active,enabled:this.voice.enabled};}
  dispose(){this.disposed=true;this.controls.length=0;}
}
