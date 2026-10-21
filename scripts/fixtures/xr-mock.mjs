// Test-only WebXR facade. Exercises Three's real XR render/controller path; not headset validation.
export function installXRMock(){
 const mock={position:{x:0,y:1.65,z:0},yaw:0,tracked:true,session:null,haptics:[],frames:0,time:0,grips:{left:{x:-.28,y:-.42,z:-.4},right:{x:.28,y:-.42,z:-.4}}};
 const matrix=(x,y,z,yaw=0)=>{const c=Math.cos(yaw),s=Math.sin(yaw);return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,x,y,z,1]);};
 const transform=(x,y,z,yaw=0)=>({position:{x,y,z,w:1},orientation:{x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)},matrix:matrix(x,y,z,yaw)});
 const projection=new Float32Array([1.2,0,0,0,0,1.5,0,0,0,0,-1.001,-1,0,0,-.10006,0]);
 const ref=new EventTarget();ref.getOffsetReferenceSpace=()=>ref;
 const makeSource=hand=>({handedness:hand,targetRayMode:'tracked-pointer',profiles:['oculus-touch-v3'],gripSpace:{hand},targetRaySpace:{hand},gamepad:{mapping:'xr-standard',axes:[0,0,0,0],buttons:Array.from({length:6},()=>({pressed:false,touched:false,value:0})),hapticActuators:[{pulse:async(value,ms)=>{mock.haptics.push({hand,value,ms});return true;}}]}});
 mock.left=makeSource('left');mock.right=makeSource('right');
 class Session extends EventTarget {
  constructor(){super();this.inputSources=[mock.left,mock.right];this.visibilityState='visible';this.environmentBlendMode='opaque';this.enabledFeatures=['local-floor'];this.renderState={depthNear:.05,depthFar:80};this.ended=false;}
  updateRenderState(v){Object.assign(this.renderState,v);}
  requestReferenceSpace(){return Promise.resolve(ref);}
  requestAnimationFrame(cb){return window.requestAnimationFrame(time=>{if(this.ended)return;mock.frames++;mock.time=mock.time?mock.time+1000/72:time;cb(mock.time,{session:this,getViewerPose:()=>{if(!mock.tracked)return null;const p=mock.position,t=transform(p.x,p.y,p.z,mock.yaw);return {transform:t,views:['left','right'].map((eye,i)=>({eye,transform:transform(p.x+(i? .032:-.032),p.y,p.z,mock.yaw),projectionMatrix:projection}))};},getPose:space=>{if(!mock.tracked)return null;const p=mock.position,g=mock.grips[space.hand];return {transform:transform(p.x+g.x,p.y+g.y,p.z+g.z),emulatedPosition:false};}});});}
  cancelAnimationFrame(id){window.cancelAnimationFrame(id);}
  end(){this.ended=true;this.dispatchEvent(new Event('end'));return Promise.resolve();}
 }
 class Layer {constructor(session,gl){this.framebufferWidth=640;this.framebufferHeight=360;this.framebuffer=null;this.ignoreDepthValues=false;this.fixedFoveation=0;}getViewport(view){return {x:view.eye==='left'?0:320,y:0,width:320,height:360};}}
 Object.defineProperty(window,'XRWebGLBinding',{configurable:true,value:undefined});Object.defineProperty(window,'XRWebGLLayer',{configurable:true,value:Layer});
 for(const cls of [window.WebGLRenderingContext,window.WebGL2RenderingContext])if(cls)cls.prototype.makeXRCompatible=async()=>{};
 const xr=new EventTarget();xr.isSessionSupported=async()=>true;xr.requestSession=async()=>{const s=new Session();mock.session=s;setTimeout(()=>{const e=new Event('inputsourceschange');e.added=s.inputSources;e.removed=[];s.dispatchEvent(e);},100);return s;};Object.defineProperty(navigator,'xr',{configurable:true,value:xr});window.__xrMock=mock;
}
