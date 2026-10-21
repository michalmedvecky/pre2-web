export const WEAPON_CHEATS={IDCLUB:0,IDHAMMER:1,IDTOMAHAWK:2,IDAXE:3};
const CODES=['IDDQD','IDKFA','MAP',...Object.keys(WEAPON_CHEATS)];
const MAX_CODE=Math.max(...CODES.map(c=>c.length));
// Browser-only cheat. Physical key codes work across keyboard layouts.
export class CheatInput {
  constructor(){this.reset();}
  reset(){this.buffer='';}
  get pending(){return CODES.some(code=>Array.from({length:code.length-1},(_,i)=>i+1).some(n=>this.buffer.endsWith(code.slice(0,n))));}
  feed(event,playing){
    if(!playing||event.ctrlKey||event.metaKey||event.altKey){this.reset();return null;}
    if(event.repeat)return null;
    if(!/^Key[A-Z]$/.test(event.code)){this.reset();return null;}
    this.buffer=(this.buffer+event.code.slice(3)).slice(-MAX_CODE);
    const code=CODES.find(code=>this.buffer.endsWith(code));if(!code)return null;
    this.reset();return code;
  }
}
