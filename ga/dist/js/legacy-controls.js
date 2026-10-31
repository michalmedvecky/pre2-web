import {LEGACY_DATA} from './legacy-controls-data.js';
const neutral=()=>({left:false,right:false,up:false,down:false,attack:false,jump:false,magic:false,run:false});
function fromBits(bits){return{left:!!(bits&8),right:!!(bits&4),up:!!(bits&2),down:!!(bits&1)};}
const byte=n=>Math.trunc(n)&255;
// Exact symmetric range and threshold integer shifts from AXE24a2.
export function averageJoystickSamples(samples){
 if(samples.length!==16)throw new RangeError('Original2449 calibration reads exactly16 samples.');
 let x=0,y=0;for(let i=0;i<16;i++){const v=samples[i];if(!Number.isInteger(v.x)||!Number.isInteger(v.y)||v.x<0||v.x>255||v.y<0||v.y>255)throw new RangeError('Calibration samples are bytes.');x+=v.x;y+=v.y;if(i){x>>=1;y>>=1;}}
 return {x,y};
}
export function calibrateJoystick({centerX=128,centerY=128,minX=1,maxX=255,minY=1,maxY=255}={}){
 const x=Math.min(centerX-minX,maxX-centerX),y=Math.min(centerY-minY,maxY-centerY);
 if(x<=0||y<=0||[centerX,centerY,minX,maxX,minY,maxY].some(v=>!Number.isInteger(v)||v<0||v>255))throw new RangeError('Calibration requires measured byte centers and nonzero ranges.');
 const q=x>>3,half=x>>1,vertical=(y>>2)||(y>>1);
 return {centerX,centerY,minX:centerX-x,maxX:centerX+x,minY:centerY-y,maxY:centerY+y,
  left:byte(centerX-(q?q*2:half)),right:byte(centerX+(q?q*2:half)),runLeft:byte(q?centerX-q*7:centerX-x+1),runRight:byte(q?centerX+q*7:centerX+x-1),up:byte(centerY-vertical),down:byte(centerY+vertical)};
}
export function joystickInput({x,y,buttons=0,previousButtons=0,actor={},magic=false,calibration=calibrateJoystick()}={}){
 let bits=0,run=false;const c=calibration;
 if(x<=c.left){bits|=8;if(x<=c.runLeft&&actor.direction===6)run=true;}
 if(!run&&x>=c.right){bits|=4;if(x>=c.runRight&&actor.direction===2)run=true;}
 if(!run){if(y<=c.up)bits|=2;if(y>=c.down)bits|=1;}
 const fresh=buttons&~previousButtons;return{...neutral(),...fromBits(bits),attack:!!(fresh&1),jump:!!(fresh&2),magic:!!magic,run,explicitRun:true};
}
export function mouseInput({dx=0,dy=0,buttons=0,previousButtons=0,actor={},magic=false}={}){
 let bits=0,run=false;const horizontal=Math.abs(dx),direction=dx<0?6:2;
 if(horizontal>=2){bits|=dx<0?8:4;const threshold=actor.state===2&&actor.direction===direction?2:50;run=horizontal>=threshold&&actor.direction===direction;}
 if(!run&&Math.abs(dy)>=2)bits|=dy<0?2:1;
 const fresh=buttons&~previousButtons;return{...neutral(),...fromBits(bits),attack:!!(fresh&1),jump:!!(fresh&2),magic:!!magic,run,explicitRun:true};
}

// Modern platform adapter. CSS-pixel deltas / normalized Gamepad axes are
// explicitly converted into DOS-style counts; they are not raw DOS hardware.
export class LegacyControls {
 constructor({element=null,getGamepads=()=>globalThis.navigator?.getGamepads?.()||[],devices=['keypad','keyboard'],mouseScale=1}={}){
  this.element=element;this.getGamepads=getGamepads;this.mouseScale=mouseScale;this.calibrations=[calibrateJoystick(),calibrateJoystick()];this.gamepadIndices=[null,null];this.previousButtons=[0,0];this.dx=0;this.dy=0;this.mouseButtons=0;this.active=false;this.listeners=[];this.setDevices(devices);
  const listen=(target,type,fn)=>{if(target?.addEventListener){target.addEventListener(type,fn);this.listeners.push(()=>target.removeEventListener(type,fn));}};
  listen(element,'mousemove',e=>{if(this.active&&this.devices.includes('mouse')){this.dx+=e.movementX||0;this.dy+=e.movementY||0;}});
  listen(element,'mousedown',e=>{if(this.active&&this.devices.includes('mouse')){e.preventDefault();this.mouseButtons=e.buttons;}});
  listen(globalThis.window,'mouseup',e=>{this.mouseButtons=e.buttons??0;});
  listen(element,'contextmenu',e=>{if(this.active&&this.devices.includes('mouse'))e.preventDefault();});
  listen(globalThis.window,'blur',()=>this.clear());
 }
 setDevices(devices){const ids=LEGACY_DATA.devices.map(d=>d.id);if(devices.some(d=>!ids.includes(d)))throw new RangeError('Unknown original device.');if(devices.length>1&&devices[0]===devices[1])throw new RangeError('Original Options forbids the same logical device for both players.');this.devices=[...devices];this.clear();}
 setActive(active){this.active=!!active;if(!active)this.clear();}
 clear(){this.dx=0;this.dy=0;this.mouseButtons=0;this.previousMouseButtons=0;this.previousButtons=[0,0];}
 setCalibration(port,values){this.calibrations[port]=calibrateJoystick(values);return this.calibrations[port];}
 setGamepadIndex(port,index){this.gamepadIndices[port]=index;this.previousButtons[port]=0;}
 sample(actors=[],keyboardMagic=[]){const values=this.devices.map(()=>neutral());if(!this.active)return values;
  let pads=[];try{pads=this.getGamepads()||[];this.lastError=null;}catch(error){this.lastError=String(error?.message||error);}
  const connected=Array.from(pads).filter(p=>p?.connected!==false&&p);
  for(let player=0;player<this.devices.length;player++){
   const device=this.devices[player],actor=actors[player]||{},magic=!!keyboardMagic[player];
   if(device==='mouse'){values[player]=mouseInput({dx:this.dx*this.mouseScale,dy:this.dy*this.mouseScale,buttons:this.mouseButtons,previousButtons:this.previousMouseButtons||0,actor,magic});continue;}
   if(device.startsWith('joystick')){const port=device==='joystick1'?0:1;
    if(this.gamepadIndices[port]==null&&connected[port])this.gamepadIndices[port]=connected[port].index;
    const pad=Array.from(pads).find(p=>p?.index===this.gamepadIndices[port]&&p.connected!==false);
    if(pad){const buttons=(pad.buttons[0]?.pressed?1:0)|(pad.buttons[1]?.pressed?2:0),axis=v=>byte(Math.max(1,Math.min(255,Math.round(128+Math.max(-1,Math.min(1,v||0))*127))));
     values[player]=joystickInput({x:axis(pad.axes[0]),y:axis(pad.axes[1]),buttons,previousButtons:this.previousButtons[port],actor,magic,calibration:this.calibrations[port]});this.previousButtons[port]=buttons;
    }else{this.previousButtons[port]=0;values[player].magic=magic;}
   }else values[player].magic=magic;
  }
  this.dx=0;this.dy=0;this.previousMouseButtons=this.mouseButtons;return values;
 }
 async requestMouseLock(){if(!this.element?.requestPointerLock)return{ok:false,reason:'unsupported'};
  try{await this.element.requestPointerLock();return{ok:true,requested:true,locked:globalThis.document?.pointerLockElement===this.element};}catch(error){return{ok:false,reason:String(error?.message||error)};}}
 dispose(){for(const remove of this.listeners.splice(0))remove();this.clear();this.active=false;if(globalThis.document?.pointerLockElement===this.element)globalThis.document.exitPointerLock?.();}
}
export {LEGACY_DATA};
