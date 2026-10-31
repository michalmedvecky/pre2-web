// Original GOLD08b9 playlist controller. Logical ticks are AXE music callbacks;
// the chip itself is never reset by select/stop/EOT/loop/F3.
export class GoldSequence {
  constructor(voice,catalog,scores){this.voice=voice;this.catalog=catalog;this.scores=scores;this.tick=0;this.active=false;this.program=null;this.index=0;this.eventIndex=0;this.baseTick=0;this.completed=0;}
  select(name,{loop=true,firstTick=Math.floor(this.tick)+1}={}){
    const p=this.catalog.programs[name];if(!p||p.sequence.some(id=>!this.scores[id]))throw new Error('Original OPL program not loaded: '+name);
    this.name=name;this.program=p;this.index=0;this.eventIndex=0;this.baseTick=firstTick;this.loop=!!loop;this.active=true;this.completed=0;this.voice.start();
  }
  get score(){return this.scores[this.program?.sequence[this.index]];}
  get nextTick(){if(!this.active)return Infinity;return Math.min(this.score.events[this.eventIndex]?.tick??Infinity,this.score.endTick)+this.baseTick;}
  advanceTo(tick){
    if(tick<this.tick)throw new Error('Music clock cannot run backwards.');
    while(this.nextTick<=tick){
      this.tick=this.nextTick;const score=this.score,local=this.tick-this.baseTick;
      while(this.eventIndex<score.events.length&&score.events[this.eventIndex].tick<=local)this.voice.event(score.events[this.eventIndex++]);
      if(local>=score.endTick){
        this.completed++;
        // EOT only stops parser. INT82 separately dispatches08b9 at this tick.
        if(!this.loop&&this.index+1===this.program.sequence.length){this.active=false;break;}
        this.index++;if(this.index===this.program.sequence.length)this.index=this.program.loopStart;
        this.eventIndex=0;this.baseTick=this.tick+1;this.voice.start();
      }
    }
    this.tick=tick;
  }
  stop(){ // GOLD0166(1001): volume/dekey regardless of13e; preserve13e/caches.
    for(let ch=0;ch<11;ch++){this.voice.setVolume(ch,0);this.voice.noteOff(ch);}this.active=false;
  }
}
