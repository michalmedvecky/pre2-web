// AXE1ef3/1f4d/74fd..75ce: one shared SND cursor, one bit per PIT IRQ divisor170.
// No AudioContext or wall clock: callers supply integer PIT counts.
export const SND_BYTE_LENGTHS=Object.freeze([736,721,128,165,44,89,367,155,232,173,611,152,597,495,406]);
export const SPEAKER_PIT_DIVISOR=170;
export class OriginalSpeakerClock {
  constructor({pitRemainder=0}={}) {
    if(!Number.isInteger(pitRemainder)||pitRemainder<0||pitRemainder>=SPEAKER_PIT_DIVISOR)throw new RangeError('Invalid speaker PIT phase.');
    this.pitRemainder=pitRemainder;this.effect=null;this.remainingBits=0;this.loop=false;
  }
  get isIdle(){return this.remainingBits===0;}
  play(id,{loop=false}={}) {
    if(!Number.isInteger(id)||id<0||id>=SND_BYTE_LENGTHS.length)return false;
    this.effect=id;this.remainingBits=SND_BYTE_LENGTHS[id]*8;this.loop=!!loop;return true;
  }
  stop(){this.effect=null;this.remainingBits=0;this.loop=false;}
  advancePIT(counts) {
    if(!Number.isSafeInteger(counts)||counts<0)throw new RangeError('Speaker needs nonnegative integer PIT counts.');
    const total=this.pitRemainder+counts,bitTicks=Math.floor(total/SPEAKER_PIT_DIVISOR);
    this.pitRemainder=total%SPEAKER_PIT_DIVISOR;
    if(this.remainingBits>0){
      if(bitTicks<this.remainingBits)this.remainingBits-=bitTicks;
      else if(this.loop){
        const length=SND_BYTE_LENGTHS[this.effect]*8;
        this.remainingBits=length-((bitTicks-this.remainingBits)%length);
      }else {this.remainingBits=0;this.effect=null;}
    }
    return bitTicks;
  }
  snapshot(){return {effect:this.effect,remainingBits:this.remainingBits,loop:this.loop,pitRemainder:this.pitRemainder};}
}
