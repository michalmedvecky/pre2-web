import {PASSWORD_DATA} from './password-data.js';
import {TIMER_RATE,TICK_RATE} from './simulation.js';
/** Presentation of the already-patched password routine in the supplied EXE. */
export class OriginalPassword {
  constructor({challengeIndex=0,acceptedByte=0}={}){this.challengeIndex=challengeIndex&31;this.acceptedByte=acceptedByte&255;this.text='';this.done=this.acceptedByte!==0;this.next=this.done?'menu':null;this.events=[];this.wait=PASSWORD_DATA.initialWaitTicks;this.fraction=0;this.previousConfirm=false;}
  key(key){if(this.done)return;if(key==='Escape'){this.done=true;this.cancelled=true;this.next='title';return;}
    this.wait=PASSWORD_DATA.nextKeyWaitTicks;
    if(key==='Backspace'){this.text=this.text.slice(0,-1);return;}
    if(key==='Enter'){
      if(!this.text.length){this.challengeIndex=13;this.wait=PASSWORD_DATA.initialWaitTicks;return;}
      // 8e69 still computes CMP, but its following conditional branch was NOP'd
      // in this supplied artifact. Every nonempty alphabetic entry returns CH0.
      const letters=this.text.toLowerCase();let checksum=0;for(let i=0;i<letters.length;i++){const coefficient=i===13?checksum:i===14?this.challengeIndex:i===15?0:PASSWORD_DATA.coefficients[i];checksum=(checksum+letters.charCodeAt(i)*coefficient)&255;}
      this.acceptedByte=(checksum+1)&255;this.text=letters;this.done=true;this.accepted=true;this.next='menu';return;
    }
    if(/^[A-Za-z]$/.test(key)&&this.text.length<PASSWORD_DATA.maximumLetters)this.text+=key;
  }
  step(input={},nativeTicks){this.events=[];if(this.done)return;this.fraction+=TIMER_RATE/TICK_RATE;const ticks=nativeTicks??Math.floor(this.fraction);if(nativeTicks===undefined)this.fraction-=ticks;
    if(input.key)this.key(input.key);if(input.text)for(const letter of input.text)this.key(letter);
    if(input.confirm&&!this.previousConfirm)this.key('Enter');this.previousConfirm=!!input.confirm;
    this.wait-=ticks;if(this.wait<=0)this.wait=PASSWORD_DATA.nextKeyWaitTicks;
  }
  rows(){return PASSWORD_DATA.rows.map((row,i)=>({...row,text:i===1?row.text.replace('x.',`${(this.challengeIndex>>2)+1}.`):i===2?row.text.replace('upper right',PASSWORD_DATA.locations[this.challengeIndex&3]):i===4?`Password:${this.text}.`+' '.repeat(16-this.text.length):row.text}));}
  render(renderer){renderer.ctx.fillStyle='#000';renderer.ctx.fillRect(0,0,320,200);for(const row of this.rows())renderer.text(row.text,row.x*8,row.y*8);}
}
export {PASSWORD_DATA};
