import * as T from '../vendor/three.module.js';
import {GameAudio} from '../native/audio.js';
import {ImpactFeedback,ImpactRenderer} from './impact.js';
import {HapticFeedback} from './haptics.js';
import {VRButton} from '../vendor/VRButton.js';
import {TrackingSpace,XRControls,XRMagicCodes,SmoothTurn} from './xr-input.js';
import {loadSurfaces} from './surfaces.js';
import {Pilot,openingLayout,SwingTracker,RULES} from './simulation.js';
import {makeClub,makeBone,makeBody,buildEnvironment} from './models.js';
import {makeBear,animateBear} from './bear-model.js';
import {Campaign} from './campaign.js';
import {buildFeast} from './feast-view.js';
import {loadMountains} from './mountains.js';
import {loadHDArt} from './hd-art.js';
import {buildLevelOne} from './level-one-view.js';
import {CheatInput} from '../native/cheats.js';
import {Assets} from '../native/assets.js';
const $=id=>document.getElementById(id),keys=new Set(),query=new URLSearchParams(location.search);
const practice=query.has('pilot');
let renderer,scene,rig,camera,pilot,layout,scenery,bear,body,desktopClub,fade,hud,hudCanvas,hudContext,hudTexture,mountains,impactRenderer;
let levelArts=[],textures,feast;
let active=false,paused=true,yaw=-Math.PI/2,pitch=-.12,accumulator=0,previousTime=0,desktopSwing=-1,jumpPulse=false,hand='right',audio=null,tracking=true,lastStatus='';
const music=new GameAudio(),impact=new ImpactFeedback(),feedback=new HapticFeedback();let musicEnabled=true,musicUnlock=null,lastHeadOcclusion=0,bonkCooldown=0;
const magicCodes=new XRMagicCodes();let magicSuppress=false,magicMessage='',magicWasSuppressed=false;
const cheatInput=new CheatInput();let testMenuOpen=false,menuAReady=false,menuBReady=false;
const trackingSpace=new TrackingSpace(),xrControls=new XRControls(),smoothTurn=new SmoothTurn();
const controllers=[],swing=new SwingTracker(),boneMeshes=[],temp=new T.Vector3(),temp2=new T.Vector3(),clubBase=new T.Vector3(),forward=new T.Vector3();
function showError(error){$('error').hidden=false;$('error').textContent='Prototyp se nepodařilo spustit: '+error.message;console.error(error);}
async function json(url){const r=await fetch(url);if(!r.ok)throw Error(`${url}: HTTP ${r.status}`);return r.json();}
async function bytes(url){const r=await fetch(url);if(!r.ok)throw Error(`${url}: HTTP ${r.status}`);return new Uint8Array(await r.arrayBuffer());}
function syncMusic(visible=true){const muted=!musicEnabled||paused||testMenuOpen||!visible;if(music.muted!==muted)music.setMuted(muted);}
function unlockAudio(){if(!musicUnlock){music.setTrack('MINES');musicUnlock=music.unlock().then(()=>{syncMusic();$('music-status').textContent='Původní hudba levelů 1 a 2 · MINES';}).catch(e=>{$('music-status').textContent='Hudbu se nepodařilo spustit: '+e.message;});audio=music.context;}else music.context?.resume().catch(()=>{});}
function toggleMusic(){musicEnabled=!musicEnabled;$('music').checked=musicEnabled;syncMusic();lastStatus='';}
function bonk(power=1){if(bonkCooldown>0)return;bonkCooldown=.35;impact.hit(power);haptics(.85,140,true);sound(75,.16);}

function sound(frequency,duration=.09,position){if(!audio||audio.state!=='running')return;const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(frequency,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(25,frequency/2),audio.currentTime+duration);g.gain.setValueAtTime(.07,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);if(position){const p=audio.createPanner();p.panningModel='HRTF';p.refDistance=2;p.positionX.value=position.x;p.positionY.value=position.y;p.positionZ.value=position.z;g.connect(p);p.connect(audio.destination);}else g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}
function haptics(value,ms,both=false){feedback.queue(value,ms,both?null:hand);}
function pause(value){if(value)feedback.clear();if(value&&testMenuOpen)toggleTestMenu(false);cheatInput.reset();magicCodes.reset();magicSuppress=magicWasSuppressed=false;magicMessage='';paused=value;accumulator=0;swing.reset();keys.clear();desktopSwing=-1;jumpPulse=false;document.body.classList.toggle('playing',!paused);$('help').hidden=paused;$('testing').hidden=paused||practice;if(!paused){unlockAudio();active=true;}else impact.reset();syncMusic();}
function toggleTestMenu(value=!testMenuOpen){
 if(practice)return;cheatInput.reset();testMenuOpen=value;menuAReady=menuBReady=false;accumulator=0;keys.clear();jumpPulse=false;desktopSwing=-1;swing.reset();xrControls.reset();smoothTurn.reset();lastStatus='';
 syncMusic();$('test-panel').hidden=!value||renderer.xr.isPresenting;
 if(value&&renderer.xr.isPresenting){camera.add(hud);hud.position.set(0,0,-.85);hud.rotation.set(0,0,0);hud.scale.setScalar(1.7);hud.material.depthTest=false;hud.renderOrder=900;}else if(!value){hud.removeFromParent();if(renderer.xr.isPresenting)controllers.find(c=>c.source?.handedness==='left')?.grip.add(hud);hud.position.set(0,.15,.05);hud.rotation.set(-.6,0,0);hud.scale.setScalar(1);hud.material.depthTest=true;hud.renderOrder=0;}
}
function toggleCheat(code){if(practice)return;pilot.toggleCheat(code);lastStatus='';keys.clear();cheatInput.reset();swing.reset();sound(660,.1);haptics(.2,50,true);}
function turn(amount,resetSwing=true){const before=headOffset(),c=Math.cos(amount),s=Math.sin(amount),after={x:before.x*c+before.z*s,z:-before.x*s+before.z*c};yaw+=amount;rig.rotation.y=yaw;pilot.player.x+=before.x-after.x;pilot.player.z+=before.z-after.z;if(resetSwing)swing.reset();}
function headOffset(){return renderer.xr.isPresenting?trackingSpace.offset(yaw):{x:0,z:0};}
function syncRig(){const p=renderer.xr.isPresenting?trackingSpace.rigPosition(pilot.player,yaw):pilot.player;rig.position.set(p.x,p.y,p.z);rig.rotation.y=yaw;rig.updateMatrixWorld(true);}
function sampleClub(relative,world,time,base){if(testMenuOpen||magicSuppress){swing.reset();return;}const sweep=swing.sample(relative,world,time);if(sweep&&base)sweep.base={...base};if(sweep&&pilot.strike(sweep)){swing.consume();haptics(.7,80);}}
// The club follows the tracked hand. Environment contact must never displace it:
// locomotion against a constrained proxy could create false swings/rumble loops.
function sampleTrackedClub(model,time){
 model.updateWorldMatrix(true,true);
 model.localToWorld(temp.set(0,.76,0));temp2.copy(temp);rig.worldToLocal(temp2);model.localToWorld(clubBase.set(0,.1,0));
 sampleClub(temp2,temp,time,clubBase);
}
function handleEvents(){for(const e of pilot.events.splice(0)){
 if(e.type==='hit')sound(115,.13,e);
 if(e.type==='hurt'||e.type==='head-hit')bonk();
 if(e.type==='fall'){swing.reset();haptics(.9,220,true);sound(65,.3);}
 if(e.type==='checkpoint-return'||e.type==='passage'){swing.reset();}
 if(e.type==='checkpoint'){sound(520,.16);haptics(.25,65,true);}
 if(e.type==='bone'||e.type==='heart')sound(e.type==='heart'?880:620,.09);
 if(e.type==='campaign-reset')music.setTrack('MINES').catch(showError);
 if(e.type==='feast-start'){music.setTrack('BRAVO').catch(showError);}
 if(e.type==='bonus-count')sound(620,.035);
 if(e.type==='bonus-life'){sound(880,.2);haptics(.25,70,true);}
 if(e.type==='level-change'){scenery.dispose();scenery=buildLevelOne(scene,pilot,textures,levelArts[pilot.world.levelIndex]);layout=pilot.layout;if(query.has('qa'))Object.assign(window.questPilot,{scenery,layout});swing.reset();xrControls.reset();smoothTurn.reset();keys.clear();jumpPulse=false;desktopSwing=-1;lastStatus='';lastHeadOcclusion=0;music.setTrack('MINES').catch(showError);syncRig();}
 if(e.type==='complete'){sound(990,.35);haptics(.35,100,true);}
 }}
function makeHUD(){hudCanvas=document.createElement('canvas');hudCanvas.width=768;hudCanvas.height=320;hudContext=hudCanvas.getContext('2d');hudTexture=new T.CanvasTexture(hudCanvas);hudTexture.colorSpace=T.SRGBColorSpace;hud=new T.Mesh(new T.PlaneGeometry(.42,.175),new T.MeshBasicMaterial({map:hudTexture,transparent:true,side:T.DoubleSide}));hud.position.set(0,.15,.05);hud.rotation.x=-.6;}
function updateLevelHUD(){
 const p=pilot.player,w=pilot.world,key=!!(w.inventory2&2),descent=pilot.descentHint(),descentText=descent?(descent.ready?'Seskoč skrz větev dolů · B / G':`Vrať se k větvi ${descent.direction<0?'vlevo':'vpravo'} po trase a stiskni B / G`):null;$('god-toggle').textContent='IDDQD · nesmrtelnost: '+(w.godMode?'ZAP':'VYP');$('hints-toggle').textContent='IDKFA · tajná místa: '+(w.secretHints?'ZAP':'VYP');
 if(testMenuOpen){const cache='menu:'+w.godMode+':'+w.secretHints;if(cache===lastStatus)return;lastStatus=cache;const c=hudContext;c.clearRect(0,0,768,320);c.fillStyle='#102c2a';c.fillRect(0,0,768,320);c.fillStyle='#ffe5b0';c.font='bold 38px system-ui';c.fillText('TESTOVANI — HRA POZASTAVENA',24,58);c.font='34px system-ui';c.fillText('A: IDDQD  '+(w.godMode?'ZAP':'VYP'),28,130);c.fillText('B: IDKFA  '+(w.secretHints?'ZAP':'VYP'),28,204);c.font='28px system-ui';c.fillText('Leve X: hudba · Y: zavrit',28,280);hudTexture.needsUpdate=true;$('status').textContent='Testování — hra pozastavena';return;}
 const transitionText=pilot.stage==='slice-complete'?'Druhý level dokončen! Další levely budou následovat v další verzi. B / R: znovu':['feast','depart'].includes(pilot.stage)?'Hostina — přičítání bonusů za sesbírané jídlo':pilot.stage==='enter'?'Druhý level…':null;
 const objective=transitionText|| (magicSuppress?magicMessage:pilot.gameOver?'Konec hry. B / R: znovu':pilot.complete?'První level dokončen! B / R: znovu':pilot.nearGate!==null?'Vejdi do otvoru průchodu · B / G':descentText?descentText:key?'Klíč nalezen — najdi východ →':`Level ${w.level.id} — najdi klíč a východ`);
 const hearts='♥'.repeat(Math.max(0,p.health))+'♡'.repeat(Math.max(0,3-p.health));
 const status=`${hearts} · životy: ${w.lives} · ${pilot.score} bodů\n${objective}${w.godMode?' · IDDQD':''}${w.secretHints?' · IDKFA':''}`,cacheKey=status+':'+pilot.area;
 if(cacheKey===lastStatus)return;lastStatus=cacheKey;$('status').textContent=status;
 const c=hudContext;c.clearRect(0,0,768,320);c.fillStyle='#153c36ee';c.fillRect(0,0,768,320);c.fillStyle='#ffe5b0';c.font='bold 64px system-ui';c.fillText(`${hearts}  ${pilot.score}`,28,96);c.font='32px system-ui';
 c.fillText(transitionText?(pilot.stage==='slice-complete'?'LEVEL 2 DOKONCEN':'HOSTINA / BONUSY'):magicSuppress?magicMessage:pilot.gameOver?'KONEC HRY — B: ZNOVU':pilot.complete?'HOTOVO — B: ZNOVU':pilot.nearGate!==null?'VEJDI DO PRUCHODU / B':descent?(descent.ready?'SKRZ VETEV DOLU / B':`VETEV ${descent.direction<0?'VLEVO':'VPRAVO'} / POTOM B`):key?'KLIC: ANO — K VYCHODU':'NAJDI KLIC A VYCHOD',28,192,710);
 c.fillText(`ZIVOTY: ${w.lives} ${w.godMode?' · IDDQD':''}${w.secretHints?' · IDKFA':''} · HUDBA ${musicEnabled?'ZAP':'VYP'}`,28,265);hudTexture.needsUpdate=true;
}
function updateHUD(){const p=pilot.player;if(!practice){updateLevelHUD();return;}const status=`${'♥'.repeat(Math.max(0,p.health))}${'♡'.repeat(Math.max(0,3-p.health))}  ·  ${pilot.score} bodů\n${pilot.complete?'Hotovo! První VR trasa dokončena. R: znovu':pilot.bear.alive?'Poraz medvěda skutečným švihem kyje':pilot.checkpoint.x>20?'Přeskoč jámu a dojdi k cíli':'Medvěd poražen. Pokračuj k ohništi →'}`;
 if(status===lastStatus)return;lastStatus=status;$('status').textContent=status;
 const c=hudContext;c.clearRect(0,0,768,320);c.fillStyle='#153c36ee';c.fillRect(0,0,768,320);c.strokeStyle='#dcb272';c.lineWidth=12;c.strokeRect(6,6,756,308);c.fillStyle='#ffe5b0';c.font='bold 72px system-ui';c.fillText(`${'♥'.repeat(Math.max(0,p.health))}   ${pilot.score}`,28,108);c.font='32px system-ui';c.fillText(pilot.complete?'CIL DOSAZEN':pilot.bear.alive?'SVIHNI KYJEM':'K OHNISTI A PRES JAMU',28,198);c.fillText(pilot.checkpoint.x>20?'CHECKPOINT U OHNISTE':'CHECKPOINT: START',28,262);hudTexture.needsUpdate=true;
}
function readInput(seconds,dt){let x=0,z=0,jump=keys.has('Space')||jumpPulse;
 if(!renderer.xr.isPresenting){x=+(keys.has('KeyD')||keys.has('ArrowRight'))-+(keys.has('KeyA')||keys.has('ArrowLeft'));z=+(keys.has('KeyS')||keys.has('ArrowDown'))-+(keys.has('KeyW')||keys.has('ArrowUp'));return {x,z,jump,interact:keys.has('KeyG'),yaw,headX:0,headZ:0};}
 const sources=renderer.xr.getSession().inputSources,magic=practice?{suppress:false,state:"idle"}:magicCodes.sample(sources,seconds);magicSuppress=magic.suppress;if(magic.arm){haptics(.25,55,true);sound(520,.08);}if(magic.code){toggleCheat(magic.code);haptics(.65,90,true);magicMessage=magic.code+' '+((magic.code==='IDDQD'?pilot.world.godMode:pilot.world.secretHints)?'ZAP':'VYP')+' · pusť triggery';}else if(magic.state!=='done')magicMessage=magic.state==='ready'?'Magie: 3× A nesmrtelnost / 3× B tajná místa':magic.state==='release'?'Nejprve uvolni oba triggery':'Magie: podrž oba triggery…';if(magicSuppress){smoothTurn.reset();magicWasSuppressed=true;return {x:0,z:0,jump:false,interact:false};}if(magicWasSuppressed){magicWasSuppressed=false;xrControls.reset();smoothTurn.reset();return {x:0,z:0,jump:false,interact:false};}
 const controls=xrControls.sample(sources,{turnMode:practice?'snap':'smooth'});
 if(controls.music)toggleMusic();
 if(controls.menu){toggleTestMenu();return {x:0,z:0,jump:false,interact:false};}
 if(testMenuOpen){if(!controls.jump)menuAReady=true;else if(menuAReady){toggleCheat('IDDQD');menuAReady=false;}if(!controls.interact)menuBReady=true;else if(menuBReady){toggleCheat('IDKFA');menuBReady=false;}return {x:0,z:0,jump:false};}
 if(controls.turn)turn(controls.turn);if(!practice)turn(smoothTurn.step(controls.turnAxis||0,dt),false);
 const offset=headOffset();return {x:controls.x,z:controls.z,jump:controls.jump,interact:controls.interact,yaw:trackingSpace.heading(yaw),headX:offset.x,headZ:offset.z};
}
function draw(time,frame){const seconds=time/1000,dt=previousTime?Math.min((time-previousTime)/1000,.05):0;previousTime=time;bonkCooldown=Math.max(0,bonkCooldown-dt);
 let visible=true;if(renderer.xr.isPresenting){const session=renderer.xr.getSession();visible=session.visibilityState==='visible';tracking=trackingSpace.update(frame?.getViewerPose(renderer.xr.getReferenceSpace()));}
 syncMusic(visible);
 if(active&&!paused&&visible&&tracking){const input=readInput(seconds,dt);if(testMenuOpen||magicSuppress)accumulator=0;else accumulator+=dt;while(accumulator>=1/90){pilot.step(1/90,input);accumulator-=1/90;jumpPulse=false;}
  syncRig();handleEvents();
  if(renderer.xr.isPresenting){desktopClub.visible=false;body.visible=false;for(const c of controllers){c.club.visible=c.source?.handedness===hand&&c.grip.visible;const live=c.source?.handedness===hand&&c.source.gripSpace&&frame?.getPose(c.source.gripSpace,renderer.xr.getReferenceSpace());if(!live){if(c.source?.handedness===hand)swing.reset();continue;}
    sampleTrackedClub(c.club,seconds);
   }
  }else{desktopClub.visible=true;body.visible=true;body.position.set(0,0,0);body.rotation.y=0;
   if(desktopSwing>=0){desktopSwing+=dt;const t=Math.min(1,desktopSwing/.38);desktopClub.rotation.x=.8-2.3*(t*t*(3-2*t));desktopClub.rotation.z=-.35*Math.sin(t*Math.PI);if(t===1){desktopSwing=-1;swing.reset();}}
   else{desktopClub.rotation.x=-.15;desktopClub.rotation.z=0;}
   desktopClub.updateWorldMatrix(true,true);sampleTrackedClub(desktopClub.userData.model,seconds);
  }
  handleEvents();
 }else{accumulator=0;swing.reset();if(renderer.xr.isPresenting){xrControls.reset();smoothTurn.reset();magicCodes.reset();magicSuppress=magicWasSuppressed=false;magicMessage='';}}
 if(practice){animateBear(bear,pilot.bear,pilot.time);scenery.fire.scale.y=.3+Math.sin(seconds*8)*.035;}else{const pose={position:new T.Vector3(),quaternion:new T.Quaternion()};if(renderer.xr.isPresenting&&trackingSpace.orientation){const o=headOffset();pose.position.set(pilot.player.x+o.x,pilot.player.y+trackingSpace.position.y,pilot.player.z+o.z);pose.quaternion.setFromAxisAngle(new T.Vector3(0,1,0),yaw).multiply(new T.Quaternion(trackingSpace.orientation.x,trackingSpace.orientation.y,trackingSpace.orientation.z,trackingSpace.orientation.w));}else{camera.updateWorldMatrix(true,false);camera.getWorldPosition(pose.position);camera.getWorldQuaternion(pose.quaternion);}scenery.update(pose);const feastVisible=feast.update(pose);scenery.root.visible=!feastVisible;mountains?.update(pose.position,!feastVisible&&(pilot.area==='outdoors'||pilot.area==='world')&&!scenery.stats.underground);if(feastVisible){scene.background.set('#101919');scene.fog.color.copy(scene.background);}if(pilot.stage==='playing'&&!paused&&!testMenuOpen&&scenery.stats.headOccluded>.2&&lastHeadOcclusion<=.2)bonk(.65);lastHeadOcclusion=scenery.stats.headOccluded;}
 while(boneMeshes.length<pilot.bones.length){const m=makeBone();boneMeshes.push(m);scene.add(m);}boneMeshes.forEach((m,i)=>{const b=pilot.bones[i];m.visible=!!b&&!b.collected;if(b){m.position.set(b.x,b.y+.12+Math.abs(Math.sin(Math.min(b.age,1)*Math.PI))* .55,b.z);m.rotation.y=seconds;}});
 // Fade is rendered in both eye cameras at their near plane; never move the tracked head.
 const r=pilot.rescue,rescueAlpha=r?(r>.6?(.9-r)/.3:r>.4?1:r/.4):(pilot.portalFade||0)/.18;const alpha=Math.max(rescueAlpha,pilot.transitionAlpha||0,pilot.stage==='playing'?(scenery.stats?.headOccluded||0):0);fade.material.opacity=alpha;fade.visible=alpha>.001;
 if(audio?.state==='running'){if(renderer.xr.isPresenting&&trackingSpace.position){const o=headOffset();temp.set(pilot.player.x+o.x,pilot.player.y+trackingSpace.position.y,pilot.player.z+o.z);const a=trackingSpace.heading(yaw);forward.set(-Math.sin(a),0,-Math.cos(a));}else{camera.getWorldPosition(temp);camera.getWorldDirection(forward);}const l=audio.listener;if(l.positionX){l.positionX.value=temp.x;l.positionY.value=temp.y;l.positionZ.value=temp.z;l.forwardX.value=forward.x;l.forwardY.value=forward.y;l.forwardZ.value=forward.z;l.upX.value=0;l.upY.value=1;l.upZ.value=0;}}
 feedback.flush(renderer.xr.getSession()?.inputSources||[]);updateHUD();impactRenderer.render(scene,camera,impact.step(dt));
}
async function init(){
 let game,data;if(practice){game=await json('assets/game.json');const l=game.levels[0];data=await Promise.all([bytes('assets/'+l.map),bytes('assets/'+l.tiles),bytes('assets/union.idx')]);layout=openingLayout(game,data[0]);pilot=new Pilot(layout);}else{const assets=await Assets.load();game=assets.game;pilot=new Campaign(assets);layout=pilot.layout;}
 renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);impactRenderer=new ImpactRenderer(renderer);renderer.localClippingEnabled=true;renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');renderer.xr.setFramebufferScaleFactor(1);renderer.outputColorSpace=T.SRGBColorSpace;document.body.prepend(renderer.domElement);
 scene=new T.Scene();scene.background=new T.Color('#adcfcd');scene.fog=new T.Fog('#adcfcd',16,52);scene.add(new T.HemisphereLight('#fff2ce','#334f46',2.5));const sun=new T.DirectionalLight('#ffe6ba',2.3);sun.position.set(-5,12,8);scene.add(sun);
 rig=new T.Group();scene.add(rig);camera=new T.PerspectiveCamera(72,innerWidth/innerHeight,.05,400);camera.position.y=1.65;camera.rotation.x=pitch;rig.add(camera);rig.position.set(pilot.player.x,pilot.player.y,pilot.player.z);rig.rotation.y=yaw;
 body=makeBody();body.position.set(0,0,0);rig.add(body);desktopClub=new T.Group();desktopClub.position.set(.32,-.4,-.45);const club=makeClub();desktopClub.add(club);desktopClub.userData.model=club;camera.add(desktopClub);
 fade=new T.Mesh(new T.SphereGeometry(.12,16,12),new T.MeshBasicMaterial({color:0x081114,side:T.BackSide,transparent:true,opacity:0,depthTest:false,depthWrite:false}));fade.frustumCulled=false;fade.renderOrder=999;camera.add(fade);
 textures=await loadSurfaces(renderer);if(practice){scenery=buildEnvironment(scene,layout,game,data[1],data[2],textures);bear=makeBear();scene.add(bear);}else{const art=await loadHDArt(renderer,pilot.assets,{volumetric:true});levelArts=[art,await loadHDArt(renderer,pilot.assets,{volumetric:true,levelIndex:1,sharedArt:art})];feast=buildFeast(scene,pilot,art);scenery=buildLevelOne(scene,pilot,textures,art);mountains=await loadMountains(renderer);scene.add(mountains.mesh);const warming=new T.Group();for(const mesh of levelArts.flatMap(a=>a.warmMeshes()))warming.add(mesh);scene.add(warming);await renderer.compileAsync(scene,camera);warming.removeFromParent();}makeHUD();
 for(let i=0;i<2;i++){const grip=renderer.xr.getControllerGrip(i),c={grip,source:null,club:makeClub()};controllers.push(c);rig.add(grip);grip.add(c.club);c.club.visible=false;
  const handMesh=new T.Mesh(new T.IcosahedronGeometry(.06,1),new T.MeshStandardMaterial({color:'#dda579'}));grip.add(handMesh);
  grip.addEventListener('connected',e=>{c.source=e.data;if(c.source.handedness==='left'&&!testMenuOpen)grip.add(hud);swing.reset();});grip.addEventListener('disconnected',()=>{c.source=null;swing.reset();});
 }
 const vrButton=VRButton.createButton(renderer,{requiredFeatures:['local-floor'],optionalFeatures:['bounded-floor']});vrButton.style.position='static';vrButton.style.width='auto';vrButton.style.margin='0';vrButton.style.transform='none';$('launch').append(vrButton);vrButton.addEventListener('click',unlockAudio,{capture:true});
 const supported=isSecureContext&&!!navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr').catch(()=>false);$('xr-status').textContent=supported?'Quest připraven: Vstoupit do VR spustí prostorový režim.':!isSecureContext?'Pro Quest otevři tuto stránku přes HTTPS. Desktopový náhled funguje i zde.':'WebXR zde není dostupné. Na Questu otevři stejnou HTTPS adresu v Meta Quest Browseru.';
 renderer.xr.addEventListener('sessionstart',()=>{trackingSpace.reset();xrControls.reset();smoothTurn.reset();camera.rotation.set(0,0,0);camera.position.set(0,0,0);pause(false);tracking=true;renderer.xr.getSession().addEventListener('visibilitychange',()=>syncMusic(renderer.xr.getSession()?.visibilityState==='visible'));renderer.xr.getReferenceSpace()?.addEventListener('reset',()=>{const o=headOffset();pilot.player.x+=o.x;pilot.player.z+=o.z;trackingSpace.reset();xrControls.reset();smoothTurn.reset();swing.reset();});$('status').hidden=true;$('help').hidden=true;});
 renderer.xr.addEventListener('sessionend',()=>{const o=trackingSpace.offset(yaw);pilot.player.x+=o.x;pilot.player.z+=o.z;trackingSpace.reset();xrControls.reset();smoothTurn.reset();camera.position.set(0,1.65,0);camera.rotation.set(pitch,0,0);$('status').hidden=false;pause(true);hud.removeFromParent();syncRig();});
 $('desktop').disabled=false;$('desktop').textContent='Hrát na monitoru';$('desktop').onclick=()=>pause(false);$('help').onclick=()=>pause(true);$('testing').onclick=()=>toggleTestMenu();$('test-close').onclick=()=>toggleTestMenu(false);$('god-toggle').onclick=()=>toggleCheat('IDDQD');$('hints-toggle').onclick=()=>toggleCheat('IDKFA');$('music').onchange=e=>{musicEnabled=e.target.checked;syncMusic();};$('hand').onchange=e=>{hand=e.target.value;desktopClub.position.x=hand==='left'?-.32:.32;swing.reset();};
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
 addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Escape'){if(testMenuOpen)toggleTestMenu(false);else if(!renderer.xr.isPresenting)pause(!paused);return;}if(paused)return;if(e.code==='F2'&&!e.repeat){e.preventDefault();toggleTestMenu();return;}if(testMenuOpen){if(!e.repeat&&e.code==='KeyA')toggleCheat('IDDQD');if(!e.repeat&&e.code==='KeyB')toggleCheat('IDKFA');return;}const code=cheatInput.feed(e,!practice&&active);if(code){toggleCheat(code);return;}if(cheatInput.pending){keys.clear();return;}keys.add(e.code);if(e.repeat)return;if(e.code==='Space')jumpPulse=true;if(e.code==='KeyQ')turn(Math.PI/6);if(e.code==='KeyE')turn(-Math.PI/6);if(e.code==='KeyF'&&!renderer.xr.isPresenting)startDesktopSwing();if(e.code==='KeyR'){trackingSpace.reset();xrControls.reset();smoothTurn.reset();pilot.reset();if(!practice)music.setTrack('MINES').catch(showError);swing.reset();yaw=-Math.PI/2;lastStatus='';for(const m of boneMeshes)m.removeFromParent();boneMeshes.length=0;}});
 addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{if(!renderer.xr.isPresenting)pause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden&&!renderer.xr.isPresenting)pause(true);swing.reset();accumulator=0;});
 let drag=null;renderer.domElement.addEventListener('pointerdown',e=>{if(paused||e.button!==0)return;drag={x:e.clientX,y:e.clientY,moved:0};renderer.domElement.setPointerCapture(e.pointerId);});renderer.domElement.addEventListener('pointermove',e=>{if(!drag||renderer.xr.isPresenting)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved+=Math.abs(dx)+Math.abs(dy);yaw-=dx*.004;pitch=Math.max(-1.35,Math.min(1.35,pitch-dy*.004));camera.rotation.x=pitch;drag.x=e.clientX;drag.y=e.clientY;swing.reset();});renderer.domElement.addEventListener('pointerup',()=>{if(drag?.moved<6)startDesktopSwing();drag=null;});renderer.domElement.addEventListener('pointercancel',()=>drag=null);
 window.questPilot={snapshot:()=>({...pilot.snapshot(),ready:true,paused,testMenuOpen,magic:{active:magicSuppress,message:magicMessage},tracking,audio:{track:music.track,ready:!!music.node,enabled:musicEnabled,muted:music.muted},impact:{remaining:impact.remaining,renderedFrames:impactRenderer.stats.frames,eyes:impactRenderer.stats.eyes},haptics:{...feedback.stats},clubContact:{mode:'tracked',blocked:false,contacts:0},turning:{mode:practice?'snap':'smooth',radiansPerSecond:smoothTurn.velocity,yaw},renderer:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},headOffset:headOffset(),mode:renderer.xr.isPresenting?'immersive-vr':'desktop'})};
 if(query.has('qa'))Object.assign(window.questPilot,{pilot,layout,scene,rig,renderer,sampleClub,swing,scenery,feast,impact,impactRenderer,music,feedback,controllers,desktopClub});
 renderer.setAnimationLoop(draw);
}
function startDesktopSwing(){if(desktopSwing>=0||paused||testMenuOpen)return;desktopSwing=0;swing.reset();}
init().catch(showError);
