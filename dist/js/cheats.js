// Browser-only cheat. Physical key codes work across keyboard layouts.
export class CheatInput {
  constructor(){this.reset();}
  reset(){this.buffer='';}
  feed(event,playing){
    if(!playing||event.ctrlKey||event.metaKey||event.altKey){this.reset();return false;}
    if(event.repeat)return false;
    if(!/^Key[A-Z]$/.test(event.code)){this.reset();return false;}
    this.buffer=(this.buffer+event.code.slice(3)).slice(-5);
    if(this.buffer!=='IDDQD')return false;
    this.reset();return true;
  }
}
