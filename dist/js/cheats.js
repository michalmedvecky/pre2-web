// Browser-only cheat. Physical key codes work across keyboard layouts.
export class CheatInput {
  constructor(){this.reset();}
  reset(){this.buffer='';}
  get pending(){return ['IDDQD','IDKFA'].some(code=>[1,2,3,4].some(n=>this.buffer.endsWith(code.slice(0,n))));}
  feed(event,playing){
    if(!playing||event.ctrlKey||event.metaKey||event.altKey){this.reset();return null;}
    if(event.repeat)return null;
    if(!/^Key[A-Z]$/.test(event.code)){this.reset();return null;}
    this.buffer=(this.buffer+event.code.slice(3)).slice(-5);
    if(!['IDDQD','IDKFA'].includes(this.buffer))return null;
    const code=this.buffer;this.reset();return code;
  }
}
