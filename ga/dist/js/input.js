const p1 = new Map([
  ['ArrowLeft',['left']],['ArrowRight',['right']],['ArrowUp',['up']],['ArrowDown',['down']],
  ['Numpad7',['up','left']],['Numpad8',['up']],['Numpad9',['up','right']],
  ['Numpad4',['left']],['Numpad6',['right']],['Numpad1',['down','left']],['Numpad2',['down']],['Numpad3',['down','right']],
  ['Backquote',['up']],['Backslash',['left']],['NumpadSubtract',['down']],['NumpadAdd',['right']],
  ['KeyJ',['attack']],['Numpad5',['attack']],['KeyK',['jump']],['Insert',['jump']],['KeyL',['magic']],['ShiftRight',['magic']],
]);
// Original second-player DS20dd directions: QWE / A S D / ZXC, S is attack.
const p2 = new Map([
  ['KeyQ',['up','left']],['KeyW',['up']],['KeyE',['up','right']],
  ['KeyA',['left']],['KeyD',['right']],['KeyZ',['down','left']],['KeyX',['down']],['KeyC',['down','right']],
  ['KeyS',['attack']],['Tab',['jump']],['ShiftLeft',['magic']],
]);
const onePlayerAliases = new Map([['KeyA',['left']],['KeyD',['right']],['KeyW',['up']],['KeyS',['down']]]);
const empty = () => ({left:false,right:false,up:false,down:false,attack:false,jump:false,magic:false});
// Optional web run shortcut feeds the existing native run state. If run and
// jump arrive in one poll, retain the fresh jump until native WALK→RUN has
// completed (at most four polls). Ordinary/native doubletap input is untouched.
export function adaptRunShortcut(value,actor,pending=null) {
  const direction=value.right&&!value.left&&!value.up&&!value.down?2:value.left&&!value.right&&!value.up&&!value.down?6:8;
  if(!value.heldRun||!actor||direction===8)return null;
  value.run=true;value.explicitRun=true;
  if(value.attack||value.magic||actor.state===19)return null;
  const grounded=actor.z===0&&actor.vz===0&&actor.fallSpeed===0;
  const settlingLanding=actor.state===3&&actor.transition===1;
  if(value.pressed?.jump&&grounded&&([0,1].includes(actor.state)||settlingLanding))pending={direction,polls:4};
  if(!pending)return null;
  if(!grounded||!([0,1,2].includes(actor.state)||settlingLanding)||pending.direction!==direction)return null;
  value.jump=false;value.pressed.jump=false;
  if(actor.state===2){value.jump=true;value.pressed.jump=true;return null;}
  return pending.polls>1?{...pending,polls:pending.polls-1}:null;
}
export class Input {
  constructor({onPause,onStart,cheatCommands=()=>[],cheatContext=()=>null,onCheat=()=>{}}) {
    this.keyboard = new Set(); this.pendingKeys = new Set(); this.pendingActions = new Set(); this.pointers = new Map(); this.pulses = new Map();
    this.playerCount = 1; this.active = false; this.runJumps=[null,null];
    this.devices=['keypad','keyboard'];
    this.legacy=new LegacyControls({element:document.querySelector('#game'),devices:this.devices});
    this.typedCheats=new TypedCheats({commands:cheatCommands,context:cheatContext,onCommand:onCheat,onMagic:()=>this.pulse('magic',1)});
    const cancelTypedOnUI=event=>{if(event.target?.closest?.('button,input,select,textarea,a[href],[contenteditable="true"]'))this.typedCheats.cancel();};
    window.addEventListener('pointerdown',cancelTypedOnUI,true);
    window.addEventListener('focusin',cancelTypedOnUI,true);
    window.addEventListener('keydown',e=>{const interactive=!!e.target?.closest?.('button,input,select,textarea,a[href]');if(this.typedCheats.keydown(e,{allowMagic:this.active&&!interactive})){e.preventDefault();e.stopImmediatePropagation();}},true);
    window.addEventListener('keyup',e=>{if(this.typedCheats.keyup(e)){this.keyboard.delete(e.code);e.preventDefault();e.stopImmediatePropagation();}},true);
    window.addEventListener('keydown',e => {
      const interactive=!!e.target?.closest?.('button,input,select,textarea,a[href]');
      const browserShortcut=['KeyR','KeyF'].includes(e.code)&&(e.ctrlKey||e.metaKey||e.altKey);
      if (this.active && !interactive && !browserShortcut && [0,1].some(index=>index<this.playerCount&&this.actions(e.code,index).length)) {
        e.preventDefault();
        if(!e.repeat&&!this.keyboard.has(e.code))this.pendingKeys.add(e.code);
        this.keyboard.add(e.code);
      }
      if ((e.code==='Escape'||e.code==='Space'&&!interactive) && !e.repeat) {e.preventDefault();onPause(e.code);}
      if (e.code==='Enter'&&!e.repeat&&!interactive) {e.preventDefault();onStart();}
    });
    window.addEventListener('keyup',e => {if(this.keyboard.has(e.code))e.preventDefault();this.keyboard.delete(e.code);});
    window.addEventListener('blur',()=>this.clear());
    for (const button of document.querySelectorAll('[data-hold]')) {
      const action=button.dataset.hold==='run'?'heldRun':button.dataset.hold;
      button.addEventListener('pointerdown',e => {e.preventDefault();if(!this.active)return;button.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,action);this.pendingActions.add(action);button.classList.add('active');});
      const end=e=>{this.pointers.delete(e.pointerId);button.classList.remove('active');};
      button.addEventListener('pointerup',end);button.addEventListener('pointercancel',end);button.addEventListener('lostpointercapture',end);
    }
    const area=document.querySelector('#gesture-area'),starts=new Map();this.gestureStarts=starts;
    area.addEventListener('pointerdown',e=>{e.preventDefault();if(!this.active)return;area.setPointerCapture(e.pointerId);starts.set(e.pointerId,{x:e.clientX,y:e.clientY});area.classList.add('active');});
    area.addEventListener('pointerup',e=>{
      const start=starts.get(e.pointerId);starts.delete(e.pointerId);area.classList.remove('active');if(!start||!this.active)return;
      const dx=e.clientX-start.x,dy=e.clientY-start.y;
      if(dy< -25&&Math.abs(dy)>Math.abs(dx))this.pulse('jump',2);
      else if(dy>25&&Math.abs(dy)>Math.abs(dx))this.pulse('down',8);
      else this.pulse('attack',2);
    });
    area.addEventListener('pointercancel',e=>{starts.delete(e.pointerId);area.classList.remove('active');});
  }
  setPlayers(count){this.playerCount=count===2?2:1;this.clear();}
  setDevices(devices){this.legacy.setDevices(devices);this.devices=[...devices];this.clear();}
  actions(code,index){
    const device=this.devices[index],actions=[];
    if(code===(index===0?'KeyR':'KeyF'))actions.push('heldRun');
    if(device==='keypad'&&(code.startsWith('Numpad')||['Insert','Backquote','Backslash'].includes(code)))actions.push(...(p1.get(code)||[]));
    if(device==='keyboard'&&code!=='ShiftLeft')actions.push(...(p2.get(code)||[]));
    if(code===(index===0?'ShiftRight':'ShiftLeft'))actions.push('magic');
    if(index===0){
      if(['keypad','keyboard'].includes(device)&&(/^(Arrow|Key[JKL])/.test(code)))actions.push(...(p1.get(code)||[]));
      if(this.playerCount===1&&device==='keypad')actions.push(...(onePlayerAliases.get(code)||[]));
      if(code==='KeyL')actions.push('magic');
    }
    return actions;
  }
  runBinding(code,index) {
    const device=this.devices[index];
    if(!['keypad','keyboard'].includes(device))return -1;
    if(code==='ArrowLeft')return index===0?0:-1;
    if(code==='ArrowRight')return index===0?1:-1;
    if(device==='keypad'){
      if(code==='Numpad4')return 0;if(code==='Numpad6')return 1;
      if(code==='Backslash')return 2;if(code==='NumpadAdd')return 3;
      if(index===0&&this.playerCount===1&&code==='KeyA')return 0;
      if(index===0&&this.playerCount===1&&code==='KeyD')return 1;
    }else{if(code==='KeyA')return 0;if(code==='KeyD')return 1;}
    return -1;
  }
  setActive(active){this.active=!!active;this.legacy.setActive(active);if(!active)this.clear();}
  pulse(action,steps=2){this.pendingActions.add(action);this.pulses.set(action,Math.max(this.pulses.get(action)||0,steps));}
  sample(actors=[]){
    const value=[empty(),empty()],pressed=[empty(),empty()],runBindingFresh=[[false,false,false,false],[false,false,false,false]];
    for(const code of this.keyboard){
      for(let index=0;index<this.playerCount;index++)for(const action of this.actions(code,index))value[index][action]=true;
    }
    // Native IRQ70fd retains fresh make even if break/new make occurs between polls.
    for(const code of this.pendingKeys)for(let index=0;index<this.playerCount;index++)for(const action of this.actions(code,index)){value[index][action]=true;pressed[index][action]=true;}
    for(const code of this.pendingKeys)for(let index=0;index<this.playerCount;index++){const binding=this.runBinding(code,index);if(binding>=0)runBindingFresh[index][binding]=true;}
    this.pendingKeys.clear();
    const heldShortcuts=value.map(v=>!!v.heldRun);
    const physical=this.legacy.sample(actors,value.map(v=>v.magic));
    for(let index=0;index<this.playerCount;index++)if(!['keypad','keyboard'].includes(this.devices[index])){value[index]=physical[index];pressed[index].attack=!!physical[index].attack;pressed[index].jump=!!physical[index].jump;}
    for(let index=0;index<this.playerCount;index++)if(heldShortcuts[index])value[index].heldRun=true;
    for(const action of this.pointers.values())value[0][action]=true;
    for(const[action,left]of this.pulses){value[0][action]=true;if(left<=1)this.pulses.delete(action);else this.pulses.set(action,left-1);}
    for(const action of this.pendingActions){value[0][action]=true;pressed[0][action]=true;if(action==='left')runBindingFresh[0][0]=true;if(action==='right')runBindingFresh[0][1]=true;}this.pendingActions.clear();
    for(let index=0;index<this.playerCount;index++){value[index].pressed=pressed[index];value[index].runBindingFresh=runBindingFresh[index];this.runJumps[index]=adaptRunShortcut(value[index],actors[index],this.runJumps[index]);delete value[index].heldRun;delete pressed[index].heldRun;}
    return this.playerCount===2?{players:value}:value[0];
  }
  clear(){this.typedCheats?.cancel();this.runJumps=[null,null];this.keyboard.clear();this.pendingKeys.clear();this.pendingActions.clear();this.gestureStarts?.clear();this.pointers.clear();this.pulses.clear();this.legacy?.clear();document.querySelectorAll('.active').forEach(el=>el.classList.remove('active'));}
  dispose(){this.active=false;this.clear();this.typedCheats.dispose();this.legacy.dispose();}
}
import {LegacyControls} from './legacy-controls.js';
import {TypedCheats} from './typed-cheats.js';
