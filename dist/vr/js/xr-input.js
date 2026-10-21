// Tracking-space math and intentional controls, independent of Three's renderer-owned XR cameras.
export function rotateXZ(x,z,yaw){const c=Math.cos(yaw),s=Math.sin(yaw);return {x:x*c+z*s,z:-x*s+z*c};}
export class TrackingSpace {
 constructor(){this.reset();}
 reset(){this.origin=null;this.position=null;this.orientation=null;}
 update(pose){const p=pose?.transform?.position,q=pose?.transform?.orientation;
  if(!p||!q||![p.x,p.y,p.z,q.x,q.y,q.z,q.w].every(Number.isFinite))return false;
  this.position={x:p.x,y:p.y,z:p.z};this.orientation={x:q.x,y:q.y,z:q.z,w:q.w};
  if(!this.origin)this.origin={x:p.x,z:p.z};return true;
 }
 offset(yaw){return this.origin&&this.position?rotateXZ(this.position.x-this.origin.x,this.position.z-this.origin.z,yaw):{x:0,z:0};}
 rigPosition(player,yaw){const o=this.origin?rotateXZ(this.origin.x,this.origin.z,yaw):{x:0,z:0};return {x:player.x-o.x,y:player.y,z:player.z-o.z};}
 heading(yaw){const q=this.orientation;if(!q)return yaw;return yaw+Math.atan2(2*(q.x*q.z+q.w*q.y),1-2*(q.x*q.x+q.y*q.y));}
}
export const STICK_DEADZONE=.22;
export function thumbstick(source){const gp=source?.gamepad;if(source?.targetRayMode!=='tracked-pointer'||!source.gripSpace||gp?.mapping!=='xr-standard'||gp.axes.length<4)return {x:0,z:0};
 const x=gp.axes[2],z=gp.axes[3];if(!Number.isFinite(x)||!Number.isFinite(z))return {x:0,z:0};const n=Math.hypot(x,z);if(n<=STICK_DEADZONE)return {x:0,z:0};const strength=Math.min(1,(n-STICK_DEADZONE)/(1-STICK_DEADZONE));return {x:x/n*strength,z:z/n*strength};
}
export class XRControls {
 constructor(){this.reset();}
 reset(){this.sources=new WeakMap();}
 sample(sources){const out={x:0,z:0,jump:false,turn:0};for(const source of sources){if(!source||source.targetRayMode!=='tracked-pointer'||!source.gripSpace||source.gamepad?.mapping!=='xr-standard')continue;
  let state=this.sources.get(source);if(!state){state={moveReady:false,turnReady:false,jumpReady:false};this.sources.set(source,state);}
  const stick=thumbstick(source),neutral=stick.x===0&&stick.z===0;
  if(source.handedness==='left'){const menu=source.gamepad.buttons[5]?.pressed===true;if(!menu)state.menuReady=true;if(menu&&state.menuReady){out.menu=true;state.menuReady=false;}if(neutral)state.moveReady=true;if(state.moveReady){out.x=stick.x;out.z=stick.z;}}
  if(source.handedness==='right'){
   if(neutral)state.turnReady=true;if(Math.abs(stick.x)>.65&&state.turnReady){out.turn=-Math.sign(stick.x)*Math.PI/6;state.turnReady=false;}
   const pressed=source.gamepad.buttons[4]?.pressed===true;if(!pressed)state.jumpReady=true;out.jump=state.jumpReady&&pressed;const interact=source.gamepad.buttons[5]?.pressed===true;if(!interact)state.interactReady=true;if(state.interactReady&&interact)out.interact=true;
  }
 }return out;}
}

// Magic codes use both index triggers, leaving the right thumb free for A/B.
export class XRMagicCodes {
 constructor(){this.reset();}
 reset(){this.left=this.right=null;this.needsRelease=true;this.holdSince=null;this.armed=false;this.locked=false;this.target=null;this.count=0;this.lastAt=0;this.aHeld=this.bHeld=true;}
 sample(sources,time){
  const valid=s=>s?.targetRayMode==='tracked-pointer'&&s.gripSpace&&s.gamepad?.mapping==='xr-standard';
  const left=Array.from(sources).find(s=>valid(s)&&s.handedness==='left'),right=Array.from(sources).find(s=>valid(s)&&s.handedness==='right');
  if(left!==this.left||right!==this.right){this.reset();this.left=left;this.right=right;}
  if(!left||!right||!Number.isFinite(time))return {suppress:false,state:'idle'};
  const trigger=s=>{const b=s.gamepad.buttons[0];return Number.isFinite(b?.value)&&b.value>0?b.value>.8:b?.pressed===true;};
  const l=trigger(left),r=trigger(right),a=right.gamepad.buttons[4]?.pressed===true,b=right.gamepad.buttons[5]?.pressed===true;
  if(!l&&!r)this.needsRelease=false;
  if(!l||!r){this.holdSince=null;this.armed=this.locked=false;this.count=0;this.target=null;this.aHeld=a;this.bHeld=b;return {suppress:false,state:'idle'};}
  if(this.needsRelease)return {suppress:true,state:'release'};
  if(this.locked)return {suppress:true,state:'done'};
  this.holdSince??=time;
  if(time-this.holdSince<.7){this.aHeld=a;this.bHeld=b;return {suppress:true,state:'arming'};}
  const arm=!this.armed;this.armed=true;
  const ap=a&&!this.aHeld,bp=b&&!this.bHeld;this.aHeld=a;this.bHeld=b;
  if(ap&&bp){this.target=null;this.count=0;return {suppress:true,state:'ready',arm};}
  const key=ap?'A':bp?'B':null;
  if(key){if(this.target!==key||time-this.lastAt>2.5)this.count=0;this.target=key;this.lastAt=time;this.count++;if(this.count===3){this.locked=true;return {suppress:true,state:'done',code:key==='A'?'IDDQD':'IDKFA'};}}
  return {suppress:true,state:'ready',arm,count:this.count,target:this.target};
 }
}
