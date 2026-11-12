// Pointer gestures produce ordinary DOS-rate inputs; no direct player mutations.
export class TouchInput {
 constructor(){this.pointers=new Map();this.pulses=new Map();this.serial=0;}
 begin(id,kind,x,y,now,{center=0,threshold=24}={}){this.pointers.set(id,{kind,x,y,startX:x,startY:y,time:now,order:++this.serial,center,threshold,gesture:'pending',gestureAt:now,attacked:false});if(kind==='move')this.move(id,x,y,now);}
 move(id,x,y,now){const p=this.pointers.get(id);if(!p)return;p.x=x;p.y=y;if(Math.hypot(x-p.startX,y-p.startY)>=p.threshold)p.tapMoved=true;if(p.kind==='move'){p.direction=Math.abs(x-p.center)<=7?null:x<p.center?'left':'right';return;}
  const dx=x-p.startX,dy=y-p.startY;if(Math.abs(dy)>=p.threshold&&Math.abs(dy)>Math.abs(dx)*1.15){const next=dy<0?'up':'down';if(next!==p.gesture){p.gesture=next;p.gestureAt=now;p.order=++this.serial;}}
  else if(p.gesture==='pending'&&Math.hypot(dx,dy)>p.threshold)p.gesture='drag';
 }
 pulse(key,now,duration){if(key==='up'||key==='down')this.pulses.delete(key==='up'?'down':'up');const old=this.pulses.get(key);this.pulses.set(key,{until:Math.max(old?.until||0,now+duration),fresh:true});}
 end(id,now,cancelled=false){const p=this.pointers.get(id);if(!p)return;this.pointers.delete(id);if(cancelled||p.kind==='move')return;
  if(p.gesture==='pending'&&!p.attacked&&Math.hypot(p.x-p.startX,p.y-p.startY)<p.threshold)this.pulse('attack',now,0);
  if(p.gesture==='up'||p.gesture==='down')this.pulse(p.gesture,now,Math.max(0,(p.gesture==='up'?300:200)-(now-p.gestureAt)));
 }
 sample(now){const out={},moving=[...this.pointers.values()].filter(p=>p.kind==='move').sort((a,b)=>b.order-a.order)[0];if(moving?.direction)out[moving.direction]=true;
  const actions=[...this.pointers.values()].filter(p=>p.kind==='action'),vertical=actions.filter(p=>p.gesture==='up'||p.gesture==='down').sort((a,b)=>b.order-a.order)[0];if(vertical)out[vertical.gesture]=true;
  for(const p of actions)if(p.gesture==='pending'&&now-p.time>=220){out.attack=true;p.attacked=true;}
  for(const[key,p]of this.pulses){if(p.fresh||now<p.until)out[key]=true;p.fresh=false;if(now>=p.until)this.pulses.delete(key);}
  // The latest held swipe owns vertical input over a preceding short pulse.
  if(vertical)delete out[vertical.gesture==='up'?'down':'up'];return out;
 }
 reset(){this.pointers.clear();this.pulses.clear();}
}
// A deliberate ten-tap sequence, not a hold, swipe or alternating-side gesture.
export class TouchCheats {
 constructor(){this.reset();}
 reset(){this.side=null;this.count=0;this.last=-Infinity;}
 feed(side,now){if(side!==this.side||now-this.last>650)this.count=0;this.side=side;this.last=now;if(++this.count===10){this.reset();return side==='left'?'IDDQD':'IDKFA';}return null;}
}
export class TouchControls {
 constructor(wrap,{canPlay,onGesture=()=>{},onCheat=()=>{}}){this.wrap=wrap;this.canPlay=canPlay;this.onGesture=onGesture;this.input=new TouchInput();this.cheats=new TouchCheats();this.onCheat=onCheat;this.pad=wrap.querySelector('.thumb-pad');this.mode=matchMedia('(any-pointer: coarse)');this.syncMode=()=>{wrap.classList.toggle('touch-enabled',this.mode.matches);if(!this.mode.matches)this.reset();};this.mode.addEventListener('change',this.syncMode);this.syncMode();
  wrap.addEventListener('pointerdown',e=>{if(!this.canPlay()||!['touch','pen'].includes(e.pointerType))return;const move=e.target.closest('.thumb-pad');if(!move&&e.target.closest('button,a,input,#dialog,.level-map,.touch-hud')){this.cheats.reset();return;}
   e.preventDefault();this.onGesture();const box=this.pad.getBoundingClientRect();this.input.begin(e.pointerId,move?'move':'action',e.clientX,e.clientY,performance.now(),{center:box.left+box.width/2,threshold:Math.max(18,Math.min(28,wrap.clientHeight*.06))});wrap.setPointerCapture(e.pointerId);this.feedback();});
  wrap.addEventListener('pointermove',e=>{if(!this.input.pointers.has(e.pointerId))return;e.preventDefault();this.input.move(e.pointerId,e.clientX,e.clientY,performance.now());this.feedback();});
  const end=(e,cancelled)=>{const p=this.input.pointers.get(e.pointerId);if(!p)return;e.preventDefault();const now=performance.now(),tap=!cancelled&&!p.tapMoved&&now-p.time<=220&&Math.hypot(e.clientX-p.startX,e.clientY-p.startY)<p.threshold&&(p.kind==='move'||p.gesture==='pending');this.input.end(e.pointerId,now,cancelled);if(tap){const r=wrap.getBoundingClientRect(),side=e.clientX<r.left+r.width/2?'left':'right',code=this.cheats.feed(side,now);if(code)this.onCheat(code);}else this.cheats.reset();this.feedback();};wrap.addEventListener('pointerup',e=>end(e,false));wrap.addEventListener('pointercancel',e=>end(e,true));wrap.addEventListener('lostpointercapture',e=>end(e,true));wrap.addEventListener('contextmenu',e=>{if(this.canPlay()&&this.mode.matches)e.preventDefault();});
 }
 get enabled(){return this.mode.matches;}
 sample(){return this.input.sample(performance.now());}
 feedback(){const p=[...this.input.pointers.values()].filter(p=>p.kind==='move').sort((a,b)=>b.order-a.order)[0];for(const b of this.pad.querySelectorAll('[data-direction]'))b.classList.toggle('held',b.dataset.direction===p?.direction);}
 reset(){this.input.reset();this.cheats.reset();this.feedback();}
 update(state){if(this.state!==state){this.state=state;this.wrap.dataset.state=state;if(state!=='play')this.reset();}}
}
