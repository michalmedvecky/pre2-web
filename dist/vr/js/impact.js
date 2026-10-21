import * as T from '../vendor/three.module.js';
export class ImpactFeedback {
 constructor(){this.reset();}
 reset(){this.remaining=0;this.age=0;this.power=1;}
 hit(strength=1){this.remaining=.52;this.age=0;this.power=Math.min(1,Math.max(.2,strength));}
 step(dt){this.age+=dt;this.remaining=Math.max(0,this.remaining-dt);const strength=this.power*(this.remaining/.52)**2;return {active:this.remaining>0,strength:strength||0,jitterX:Math.sin(this.age*87)*.003*strength,jitterY:Math.sin(this.age*113)*.002*strength};}
}
// Per-eye offscreen blur. Head pose and physics are never moved to simulate an impact.
export class ImpactRenderer {
 constructor(renderer){this.renderer=renderer;this.targets=[];this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-1,1,1,-1,0,1);this.material=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{picture:{value:null},pixel:{value:new T.Vector2()},strength:{value:0},jitter:{value:new T.Vector2()}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform sampler2D picture;uniform vec2 pixel,jitter;uniform float strength;varying vec2 vUv;
 void main(){vec2 p=vUv+jitter,d=pixel*(1.+strength*4.);vec3 c=texture2D(picture,p).rgb*.2;
 c+=(texture2D(picture,p+vec2(d.x,0.)).rgb+texture2D(picture,p-vec2(d.x,0.)).rgb+texture2D(picture,p+vec2(0.,d.y)).rgb+texture2D(picture,p-vec2(0.,d.y)).rgb)*.12;
 c+=(texture2D(picture,p+d).rgb+texture2D(picture,p-d).rgb+texture2D(picture,p+vec2(d.x,-d.y)).rgb+texture2D(picture,p+vec2(-d.x,d.y)).rgb)*.08;
 c=mix(c,vec3(dot(c,vec3(.2126,.7152,.0722))),strength*.15);c*=1.-strength*.22*smoothstep(.2,.65,length(vUv-.5));gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});this.quad=new T.Mesh(new T.PlaneGeometry(2,2),this.material);this.quad.frustumCulled=false;this.scene.add(this.quad);this.stats={frames:0,eyes:0};}
 render(scene,camera,state){const r=this.renderer;if(!state.active){r.render(scene,camera);return;}
 const immersive=r.xr.enabled&&r.xr.isPresenting,saved=r.getRenderTarget(),xrEnabled=r.xr.enabled;if(immersive)r.xr.updateCamera(camera);const cameras=immersive?r.xr.getCamera().cameras:[camera],size=r.getDrawingBufferSize(new T.Vector2());
 try{r.xr.enabled=false;for(let i=0;i<cameras.length;i++){const eye=cameras[i],w=Math.max(8,Math.round((eye.viewport?.z||size.x)*.65)),h=Math.max(8,Math.round((eye.viewport?.w||size.y)*.65));let target=this.targets[i];if(!target){target=new T.WebGLRenderTarget(w,h,{depthBuffer:true});this.targets[i]=target;}if(target.width!==w||target.height!==h)target.setSize(w,h);const auto=eye.matrixWorldAutoUpdate;eye.matrixWorldAutoUpdate=false;try{r.setRenderTarget(target);r.render(scene,eye);}finally{eye.matrixWorldAutoUpdate=auto;}}
 }finally{r.xr.enabled=xrEnabled;r.setRenderTarget(saved);}
 const u=this.material.uniforms;u.strength.value=state.strength;u.jitter.value.set(state.jitterX,state.jitterY);this.quad.onBeforeRender=(renderer,scene,eye)=>{const index=immersive?Math.max(0,cameras.indexOf(eye)):0,t=this.targets[index];u.picture.value=t.texture;u.pixel.value.set(1/t.width,1/t.height);this.material.uniformsNeedUpdate=true;};r.render(this.scene,camera);this.stats.frames++;this.stats.eyes=cameras.length;
 }
}
