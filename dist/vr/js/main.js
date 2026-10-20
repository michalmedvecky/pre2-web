import * as T from '../vendor/three.module.js';
import {VRButton} from '../vendor/VRButton.js';
import {Pilot,openingLayout,SwingTracker,RULES} from './simulation.js';
import {makeClub,makeBear,animateBear,makeBone,makeBody,buildEnvironment} from './models.js';
const $=id=>document.getElementById(id),keys=new Set(),query=new URLSearchParams(location.search);
let renderer,scene,rig,camera,pilot,layout,scenery,bear,body,desktopClub,fade,hud,hudCanvas,hudContext,hudTexture;
let active=false,paused=true,yaw=-Math.PI/2,pitch=-.12,accumulator=0,previousTime=0,desktopSwing=-1,snapHeld=false,jumpPulse=false,hand='right',audio=null,tracking=true,lastStatus='';
const controllers=[],swing=new SwingTracker(),boneMeshes=[],temp=new T.Vector3(),temp2=new T.Vector3(),head=new T.Vector3(),clubBase=new T.Vector3(),forward=new T.Vector3(),quat=new T.Quaternion();
function showError(error){$('error').hidden=false;$('error').textContent='Prototyp se nepodařilo spustit: '+error.message;console.error(error);}
async function json(url){const r=await fetch(url);if(!r.ok)throw Error(`${url}: HTTP ${r.status}`);return r.json();}
async function bytes(url){const r=await fetch(url);if(!r.ok)throw Error(`${url}: HTTP ${r.status}`);return new Uint8Array(await r.arrayBuffer());}
function unlockAudio(){try{if(!audio)audio=new AudioContext();audio.resume().catch(()=>{});}catch{}}
function sound(frequency,duration=.09,position){if(!audio||audio.state!=='running')return;const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(frequency,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(25,frequency/2),audio.currentTime+duration);g.gain.setValueAtTime(.07,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);if(position){const p=audio.createPanner();p.panningModel='HRTF';p.refDistance=2;p.positionX.value=position.x;p.positionY.value=position.y;p.positionZ.value=position.z;g.connect(p);p.connect(audio.destination);}else g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}
function haptics(value,ms,both=false){for(const c of controllers){if(!both&&c.source?.handedness!==hand)continue;const actuator=c.source?.gamepad?.hapticActuators?.[0];try{actuator?.pulse(value,ms)?.catch(()=>{});}catch{}}}
function pause(value){paused=value;accumulator=0;swing.reset();keys.clear();desktopSwing=-1;jumpPulse=false;document.body.classList.toggle('playing',!paused);$('help').hidden=paused;if(!paused){unlockAudio();active=true;}}
function turn(amount){const before=headOffset(),c=Math.cos(amount),s=Math.sin(amount),after={x:before.x*c+before.z*s,z:-before.x*s+before.z*c};yaw+=amount;rig.rotation.y=yaw;pilot.player.x+=before.x-after.x;pilot.player.z+=before.z-after.z;swing.reset();}
function headOffset(){if(!renderer.xr.isPresenting)return {x:0,z:0};renderer.xr.getCamera().getWorldPosition(head);return {x:head.x-rig.position.x,z:head.z-rig.position.z};}
function sampleClub(relative,world,time,base){const sweep=swing.sample(relative,world,time);if(sweep&&base)sweep.base={...base};if(sweep&&pilot.strike(sweep)){swing.consume();haptics(.7,80);}}
function handleEvents(){for(const e of pilot.events.splice(0)){
 if(e.type==='hit')sound(115,.13,e);
 if(e.type==='hurt'){haptics(.65,140,true);sound(70,.2);}
 if(e.type==='fall'){swing.reset();haptics(.9,220,true);sound(65,.3);}
 if(e.type==='checkpoint-return')swing.reset();
 if(e.type==='checkpoint'){sound(520,.16);haptics(.25,65,true);}
 if(e.type==='bone'||e.type==='heart')sound(e.type==='heart'?880:620,.09);
 if(e.type==='complete'){sound(990,.35);haptics(.35,100,true);}
 }}
function makeHUD(){hudCanvas=document.createElement('canvas');hudCanvas.width=768;hudCanvas.height=320;hudContext=hudCanvas.getContext('2d');hudTexture=new T.CanvasTexture(hudCanvas);hudTexture.colorSpace=T.SRGBColorSpace;hud=new T.Mesh(new T.PlaneGeometry(.42,.175),new T.MeshBasicMaterial({map:hudTexture,transparent:true,side:T.DoubleSide}));hud.position.set(0,.15,.05);hud.rotation.x=-.6;}
function updateHUD(){const p=pilot.player,status=`${'♥'.repeat(Math.max(0,p.health))}${'♡'.repeat(Math.max(0,3-p.health))}  ·  ${pilot.score} bodů\n${pilot.complete?'Hotovo! První VR trasa dokončena. R: znovu':pilot.bear.alive?'Poraz medvěda skutečným švihem kyje':pilot.checkpoint.x>20?'Přeskoč jámu a dojdi k cíli':'Medvěd poražen. Pokračuj k ohništi →'}`;
 if(status===lastStatus)return;lastStatus=status;$('status').textContent=status;
 const c=hudContext;c.clearRect(0,0,768,320);c.fillStyle='#153c36ee';c.fillRect(0,0,768,320);c.strokeStyle='#dcb272';c.lineWidth=12;c.strokeRect(6,6,756,308);c.fillStyle='#ffe5b0';c.font='bold 72px system-ui';c.fillText(`${'♥'.repeat(Math.max(0,p.health))}   ${pilot.score}`,28,108);c.font='32px system-ui';c.fillText(pilot.complete?'CIL DOSAZEN':pilot.bear.alive?'SVIHNI KYJEM':'K OHNISTI A PRES JAMU',28,198);c.fillText(pilot.checkpoint.x>20?'CHECKPOINT U OHNISTE':'CHECKPOINT: START',28,262);hudTexture.needsUpdate=true;
}
function readInput(){let x=0,z=0,jump=keys.has('Space')||jumpPulse;
 if(!renderer.xr.isPresenting){x=+keys.has('KeyD')-+keys.has('KeyA');z=+keys.has('KeyS')-+keys.has('KeyW');return {x,z,jump,yaw,headX:0,headZ:0};}
 let turnAxis=0,turnCorrection=0;for(const c of controllers){const gp=c.source?.gamepad;if(!gp)continue;const a=gp.axes||[],ax=a.length>=4?a[2]:(a[0]||0),ay=a.length>=4?a[3]:(a[1]||0);
  if(c.source.handedness==='left'){x=Math.abs(ax)>.18?ax:0;z=Math.abs(ay)>.18?ay:0;}
  if(c.source.handedness==='right'){turnAxis=ax;jump||=!!gp.buttons[4]?.pressed;}
 }
 if(Math.abs(turnAxis)>.65&&!snapHeld){turnCorrection=-Math.sign(turnAxis)*Math.PI/6;turn(turnCorrection);snapHeld=true;}if(Math.abs(turnAxis)<.25)snapHeld=false;
 renderer.xr.getCamera().getWorldDirection(forward);const heading=Math.atan2(-forward.x,-forward.z)+turnCorrection,oldOffset=headOffset(),c=Math.cos(turnCorrection),s=Math.sin(turnCorrection),offset={x:oldOffset.x*c+oldOffset.z*s,z:-oldOffset.x*s+oldOffset.z*c};return {x,z,jump,yaw:heading,headX:offset.x,headZ:offset.z};
}
function draw(time,frame){const seconds=time/1000,dt=previousTime?Math.min((time-previousTime)/1000,.05):0;previousTime=time;
 let visible=true;if(renderer.xr.isPresenting){const session=renderer.xr.getSession();visible=session.visibilityState==='visible';tracking=!!frame?.getViewerPose(renderer.xr.getReferenceSpace());}
 if(active&&!paused&&visible&&tracking){const input=readInput();accumulator+=dt;while(accumulator>=1/90){pilot.step(1/90,input);accumulator-=1/90;jumpPulse=false;}
  rig.position.set(pilot.player.x,pilot.player.y,pilot.player.z);rig.rotation.y=yaw;rig.updateMatrixWorld(true);
  if(renderer.xr.isPresenting){desktopClub.visible=false;body.visible=false;for(const c of controllers){c.club.visible=c.source?.handedness===hand&&c.grip.visible;const live=c.source?.handedness===hand&&c.source.gripSpace&&frame?.getPose(c.source.gripSpace,renderer.xr.getReferenceSpace());if(!live){if(c.source?.handedness===hand)swing.reset();continue;}
    c.club.updateWorldMatrix(true,true);c.club.localToWorld(temp.set(0,.76,0)); // club local +Y is its long axis
    // The model has its own -90° rotation; localToWorld includes it.
    temp2.copy(temp);rig.worldToLocal(temp2);c.club.localToWorld(clubBase.set(0,.1,0));sampleClub(temp2,temp,seconds,clubBase);
   }
  }else{desktopClub.visible=true;body.visible=true;body.position.set(0,0,0);body.rotation.y=0;
   if(desktopSwing>=0){desktopSwing+=dt;const t=Math.min(1,desktopSwing/.38);desktopClub.rotation.x=.8-2.3*(t*t*(3-2*t));desktopClub.rotation.z=-.35*Math.sin(t*Math.PI);if(t===1){desktopSwing=-1;swing.reset();}}
   else{desktopClub.rotation.x=-.15;desktopClub.rotation.z=0;}
   desktopClub.updateWorldMatrix(true,true);desktopClub.userData.model.localToWorld(temp.set(0,.76,0));temp2.copy(temp);rig.worldToLocal(temp2);desktopClub.userData.model.localToWorld(clubBase.set(0,.1,0));sampleClub(temp2,temp,seconds,clubBase);
  }
  handleEvents();
 }else{accumulator=0;swing.reset();}
 animateBear(bear,pilot.bear,pilot.time);scenery.fire.scale.y=.3+Math.sin(seconds*8)*.035;
 while(boneMeshes.length<pilot.bones.length){const m=makeBone();boneMeshes.push(m);scene.add(m);}boneMeshes.forEach((m,i)=>{const b=pilot.bones[i];m.visible=!!b&&!b.collected;if(b){m.position.set(b.x,b.y+.12+Math.abs(Math.sin(Math.min(b.age,1)*Math.PI))* .55,b.z);m.rotation.y=seconds;}});
 // Fade is rendered in both eye cameras at their near plane; never move the tracked head.
 const r=pilot.rescue,alpha=r?(r>.6?(.9-r)/.3:r>.4?1:r/.4):0;fade.material.opacity=alpha;fade.visible=alpha>.001;
 if(audio?.state==='running'){const cam=renderer.xr.isPresenting?renderer.xr.getCamera():camera;cam.getWorldPosition(temp);cam.getWorldDirection(forward);const l=audio.listener;if(l.positionX){l.positionX.value=temp.x;l.positionY.value=temp.y;l.positionZ.value=temp.z;l.forwardX.value=forward.x;l.forwardY.value=forward.y;l.forwardZ.value=forward.z;l.upX.value=0;l.upY.value=1;l.upZ.value=0;}}
 updateHUD();renderer.render(scene,camera);
}
async function init(){
 const game=await json('assets/game.json'),l=game.levels[0],data=await Promise.all([bytes('assets/'+l.map),bytes('assets/'+l.tiles),bytes('assets/union.idx')]);layout=openingLayout(game,data[0]);pilot=new Pilot(layout);
 renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');renderer.xr.setFramebufferScaleFactor(1);renderer.outputColorSpace=T.SRGBColorSpace;document.body.prepend(renderer.domElement);
 scene=new T.Scene();scene.background=new T.Color('#adcfcd');scene.fog=new T.Fog('#adcfcd',16,52);scene.add(new T.HemisphereLight('#fff2ce','#334f46',2.5));const sun=new T.DirectionalLight('#ffe6ba',2.3);sun.position.set(-5,12,8);scene.add(sun);
 rig=new T.Group();scene.add(rig);camera=new T.PerspectiveCamera(72,innerWidth/innerHeight,.05,80);camera.position.y=1.65;camera.rotation.x=pitch;rig.add(camera);rig.position.set(pilot.player.x,pilot.player.y,pilot.player.z);rig.rotation.y=yaw;
 body=makeBody();body.position.set(0,0,0);rig.add(body);desktopClub=new T.Group();desktopClub.position.set(.32,-.4,-.45);const club=makeClub();desktopClub.add(club);desktopClub.userData.model=club;camera.add(desktopClub);
 fade=new T.Mesh(new T.SphereGeometry(.12,16,12),new T.MeshBasicMaterial({color:0x081114,side:T.BackSide,transparent:true,opacity:0,depthTest:false,depthWrite:false}));fade.frustumCulled=false;fade.renderOrder=999;camera.add(fade);
 scenery=buildEnvironment(scene,layout,game,data[1],data[2]);bear=makeBear();scene.add(bear);makeHUD();
 for(let i=0;i<2;i++){const grip=renderer.xr.getControllerGrip(i),c={grip,source:null,club:makeClub()};controllers.push(c);rig.add(grip);grip.add(c.club);c.club.visible=false;
  const handMesh=new T.Mesh(new T.IcosahedronGeometry(.06,1),new T.MeshStandardMaterial({color:'#dda579'}));grip.add(handMesh);
  grip.addEventListener('connected',e=>{c.source=e.data;if(c.source.handedness==='left')grip.add(hud);swing.reset();});grip.addEventListener('disconnected',()=>{c.source=null;swing.reset();});
 }
 const vrButton=VRButton.createButton(renderer,{requiredFeatures:['local-floor'],optionalFeatures:['bounded-floor']});vrButton.style.position='static';vrButton.style.width='auto';vrButton.style.margin='0';vrButton.style.transform='none';$('launch').append(vrButton);vrButton.addEventListener('click',unlockAudio,{capture:true});
 const supported=isSecureContext&&!!navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr').catch(()=>false);$('xr-status').textContent=supported?'Quest připraven: Vstoupit do VR spustí prostorový režim.':!isSecureContext?'Pro Quest otevři tuto stránku přes HTTPS. Desktopový náhled funguje i zde.':'WebXR zde není dostupné. Na Questu otevři stejnou HTTPS adresu v Meta Quest Browseru.';
 renderer.xr.addEventListener('sessionstart',()=>{camera.rotation.set(0,0,0);camera.position.set(0,0,0);pause(false);snapHeld=false;tracking=true;renderer.xr.getReferenceSpace()?.addEventListener('reset',()=>swing.reset());$('status').hidden=true;$('help').hidden=true;});
 renderer.xr.addEventListener('sessionend',()=>{camera.position.set(0,1.65,0);camera.rotation.set(pitch,0,0);$('status').hidden=false;pause(true);hud.removeFromParent();});
 $('desktop').disabled=false;$('desktop').textContent='Hrát na monitoru';$('desktop').onclick=()=>pause(false);$('help').onclick=()=>pause(true);$('hand').onchange=e=>{hand=e.target.value;desktopClub.position.x=hand==='left'?-.32:.32;swing.reset();};
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
 addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Escape'){if(!renderer.xr.isPresenting)pause(!paused);return;}if(paused)return;keys.add(e.code);if(e.repeat)return;if(e.code==='Space')jumpPulse=true;if(e.code==='KeyQ')turn(Math.PI/6);if(e.code==='KeyE')turn(-Math.PI/6);if(e.code==='KeyF'&&!renderer.xr.isPresenting)startDesktopSwing();if(e.code==='KeyR'){pilot.reset();swing.reset();yaw=-Math.PI/2;lastStatus='';for(const m of boneMeshes)m.removeFromParent();boneMeshes.length=0;}});
 addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{if(!renderer.xr.isPresenting)pause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden&&!renderer.xr.isPresenting)pause(true);swing.reset();accumulator=0;});
 let drag=null;renderer.domElement.addEventListener('pointerdown',e=>{if(paused||e.button!==0)return;drag={x:e.clientX,y:e.clientY,moved:0};renderer.domElement.setPointerCapture(e.pointerId);});renderer.domElement.addEventListener('pointermove',e=>{if(!drag||renderer.xr.isPresenting)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved+=Math.abs(dx)+Math.abs(dy);yaw-=dx*.004;pitch=Math.max(-1.35,Math.min(1.35,pitch-dy*.004));camera.rotation.x=pitch;drag.x=e.clientX;drag.y=e.clientY;swing.reset();});renderer.domElement.addEventListener('pointerup',()=>{if(drag?.moved<6)startDesktopSwing();drag=null;});renderer.domElement.addEventListener('pointercancel',()=>drag=null);
 window.questPilot={snapshot:()=>({...pilot.snapshot(),ready:true,paused,tracking,renderer:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},mode:renderer.xr.isPresenting?'immersive-vr':'desktop'})};
 if(query.has('qa'))Object.assign(window.questPilot,{pilot,layout,scene,rig,renderer,sampleClub,swing});
 renderer.setAnimationLoop(draw);
}
function startDesktopSwing(){if(desktopSwing>=0||paused)return;desktopSwing=0;swing.reset();}
init().catch(showError);
