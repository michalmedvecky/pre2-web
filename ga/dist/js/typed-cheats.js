// Bare cheat words share the combat keyboard. Only L is a combat binding:
// reserve it briefly, then deliver one magic edge if LEVEL was not completed.
export class TypedCheats {
  constructor({commands=()=>[],context=()=>null,onCommand=()=>{},onMagic=()=>{},delay=300,setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id)}={}){
    this.commands=commands;this.context=context;this.onCommand=onCommand;this.onMagic=onMagic;
    this.delay=delay;this.setTimer=setTimer;this.clearTimer=clearTimer;
    this.word='';this.origin=null;this.magic=false;this.timer=null;this.consumed=new Set();this.disposed=false;
  }
  sameContext(a,b){return Array.isArray(a)&&Array.isArray(b)?a.length===b.length&&a.every((v,i)=>Object.is(v,b[i])):Object.is(a,b);}
  reset(){if(this.timer!==null)this.clearTimer(this.timer);this.timer=null;this.word='';this.origin=null;this.magic=false;}
  cancel(){this.reset();this.consumed.clear();}
  flush(){const valid=this.magic&&this.origin!=null&&this.sameContext(this.origin,this.context());this.reset();if(valid)this.onMagic();}
  arm(){if(this.timer!==null)this.clearTimer(this.timer);this.timer=this.setTimer(()=>this.flush(),this.delay);}
  keydown(event,{allowMagic=true}={}){
    if(this.disposed)return false;
    if(event.ctrlKey||event.metaKey||event.altKey||event.target?.closest?.('input,select,textarea,[contenteditable="true"]')){this.cancel();return false;}
    if(event.repeat)return this.consumed.has(event.code);
    if(event.code==='ShiftRight'){this.reset();return false;}
    if(['ShiftLeft','CapsLock'].includes(event.code))return false;
    if(['Escape','Space','Enter'].includes(event.code)){this.reset();return false;}
    const letter=/^[a-z]$/i.test(event.key||'')?event.key.toUpperCase():null;
    const available=this.commands();
    if(this.word){
      const next=this.word+(letter||''),matches=letter&&available.filter(word=>word.startsWith(next));
      if(matches?.length){
        this.word=next;this.consumed.add(event.code);
        if(matches.includes(next)){this.reset();this.onCommand(next);}else this.arm();
        return true;
      }
      this.flush();
    }
    if(letter&&available.some(word=>word.startsWith(letter))){
      this.word=letter;this.magic=allowMagic&&event.code==='KeyL';this.origin=this.magic?this.context():null;
      this.consumed.add(event.code);this.arm();return true;
    }
    return false;
  }
  keyup(event){const consumed=this.consumed.delete(event.code);return consumed;}
  dispose(){this.cancel();this.disposed=true;}
}
