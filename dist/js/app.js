import{TouchControls}from'./touch-input.js';
import{GameScreen}from'./screen-mode.js';
import {pendingTallyScore} from './stage-tally.js';
import {LevelMap} from './level-map.js';
import {CheatInput} from './cheats.js';
import {Assets} from './assets.js';
import {Renderer} from './render.js';
import {Presentation} from './presentation.js';
import {HDAssets} from './hd.js';
import {SceneAdapter} from './scene.js';
const sceneAdapter=new SceneAdapter();
const presentation=new Presentation();
import {World} from './engine.js';
import {GameAudio} from './audio.js';
import {TICK_HZ,Demo,inputFromMask,parsePassword,passwordFor} from './compat.js';
const $=s=>document.querySelector(s),canvas=$('#game'),dialog=$('#dialog');
const cheatInput=new CheatInput(),blockedKeys=new Set();let muteTimer,mapBack='play';
const levelMap=new LevelMap($('#screen-wrap'),closeLevelMap,point=>{if(!world)return;world.teleportPlayer(point.x,point.y);closeLevelMap();repaint();toast('MAP — teleported');});
function openLevelMap(){if(!world||!['play','pause'].includes(state))return;mapBack=state;state='level-map';clearInputs();acc=0;cheatInput.reset();clearTimeout(muteTimer);levelMap.open(world,assets);}
function closeLevelMap(){if(state!=='level-map')return;levelMap.close();state=mapBack;clearInputs();acc=0;presentation.reset(world);if(state==='play')canvas.focus({preventScroll:true});else dialog.querySelector('.primary')?.focus({preventScroll:true});}

const audio=new GameAudio();let assets,renderer,world,state='loading',previous='title',muted=true,held={},pressed={},last=0,acc=0,saveClock=0,demo,toastTimer;
const touchControls=new TouchControls($('#screen-wrap'),{canPlay:()=>state==='play',onGesture:gesture,onCheat:code=>{if(code==='IDKFA')world.toggleSecretHints();else world.toggleGodMode();}});
const gameScreen=new GameScreen($('#screen-wrap'),{onFallback:()=>toast('Screen expanded. Add to Home Screen for an app view.'),onExit:()=>{touchControls.reset();held={};pressed={};if(touchControls.enabled&&state==='play')pause();}});
function clearInputs(){held={};pressed={};touchControls.reset();}
const tracks=['MINES','MINES','PRES','PRES','PRES','MONSTER','GLACE','GLACE','MYSTERY','MONSTER','KOOL','KOOL','KOOL','MINES','FINAL','GLACE'];
const qa=new URLSearchParams(location.search).has('qa');
let hdPack=null,graphicsMode='original',graphicsBusy=false,touchLabel='',touchFullLabel='';
const GRAPHICS_STORAGE='prehistorik2-graphics-v1';
function repaint(){if(!renderer)return;if(state==='stages')renderer.renderMap(world?.levelIndex||0,16);else if(world&&state!=='title')renderer.render(world);else renderer.renderScreen('MENU');}
async function setGraphics(mode){
 if(graphicsBusy||!renderer)return;const b=$('#graphics-button');graphicsBusy=true;b.disabled=true;
 try{
  if(mode==='hd'&&!hdPack){$('#graphics-label').textContent='Loading HD…';hdPack=await HDAssets.load();}
  renderer.setHD(mode==='hd'?hdPack:null);graphicsMode=mode;
  try{localStorage.setItem(GRAPHICS_STORAGE,mode);}catch{}
  repaint();
 }catch(e){console.warn('HD graphics unavailable',e);toast('HD graphics could not load. Original graphics remain available.');}
 finally{graphicsBusy=false;b.disabled=false;$('#graphics-label').textContent=graphicsMode==='hd'?'HD':'Original';b.setAttribute('aria-pressed',String(graphicsMode==='hd'));b.setAttribute('aria-label',graphicsMode==='hd'?'Use original graphics':'Enable HD graphics');}
}
$('#graphics-button').onclick=()=>{setGraphics(graphicsMode==='hd'?'original':'hd');};
function cheatStatus(){return [world?.godMode?'IDDQD · INVULNERABLE':'',world?.secretHints?'IDKFA · SECRET HINTS':''].filter(Boolean).join(' / ')||'FIND THE KEY · UNCOVER THE FEAST';}
const STORAGE='prehistorik2-reconstruction-v1';
let saved;try{saved=JSON.parse(localStorage.getItem(STORAGE));}catch{}
const completed=new Set(saved?.completed||[]);
function toast(s){$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2300);}
function sound(p){p?.catch?.(()=>{});}
async function gesture(){try{await audio.unlock();audio.setMuted(muted);}catch{toast('Sound unavailable in this browser');}}
function panel(html,cls=''){clearTimeout(muteTimer);cheatInput.reset();clearInputs();dialog.className='screen-dialog '+cls;dialog.innerHTML=html;dialog.hidden=false;}
function button(label,fn,kind='primary'){const b=document.createElement('button');b.className=kind;b.textContent=label;b.onclick=()=>{gesture();fn();if(state==='play'&&touchControls.enabled&&!gameScreen.active)gameScreen.enter();};return b;}
function card(kicker,title,body,actions){panel(`<div class="dialog-card"><small>${kicker}</small><h2>${title}</h2>${body}<div class="actions"></div></div>`);for(const [label,fn,kind] of actions)dialog.querySelector('.actions').append(button(label,fn,kind));}
function hide(){dialog.hidden=true;canvas.focus({preventScroll:true});}
function title(){state='title';world=null;renderer.renderScreen('MENU');$('#stage-label').textContent='READY FOR ADVENTURE';$('#status-label').textContent='ORIGINAL WORLDS · ORIGINAL MISCHIEF';sound(audio.setTrack('PRESENTA'));panel('<div class="title-panel"><div class="actions"></div></div>','title');const a=dialog.querySelector('.actions');if(saved)a.append(button('Continue',resume));a.append(button('Start adventure',difficulty));a.append(button('Password',password,'secondary'));}
function difficulty(){state='menu';card('CHOOSE YOUR ADVENTURE','How hungry are you?','<p>Explore the original worlds, uncover hidden food and find the exit key.</p>',[['Beginner',()=>start(0,false)],['Expert',()=>start(0,true),'secondary'],['Back',title,'secondary']]);}
function event(e){if(e.type==='level'){sound(audio.setTrack(tracks[e.index]));$('#stage-label').textContent=`STAGE ${e.id} · ${world?.expert?'EXPERT':'BEGINNER'}`;$('#status-label').textContent=cheatStatus();}
 if(e.type==='cheat'){toast(`${e.code} — ${e.code==='IDKFA'?'secret hints':'invulnerability'} ${e.enabled?'ON':'OFF'}`);$('#status-label').textContent=cheatStatus();}
 if(e.type==='sfx')sound(audio.sfx(e.index));if(e.type==='exitOpen')toast('The exit is open!');if(e.type==='weapon')toast('New weapon!');if(e.type==='bossDefeated')toast('Boss defeated — find the exit!');if(e.type==='lifeLost')toast('One more try…');
 if(e.type==='complete'){completed.add(world.level.id);$('#status-label').textContent=world.transition.tally?'STAGE COMPLETE · COUNTING THE FEAST':'PASSAGE TO THE NEXT WORLD';save();}
 if(e.type==='tallyStart')sound(audio.setTrack('BRAVO'));
 if(e.type==='transitionReady'&&state==='play'){state='result';const t=e.transition;save();if(t.type==='complete'){renderer.render(world);card('A PREHISTORIC FEAST','Stage complete',`<p>${t.percent}% collected · Score ${(world.score*10).toLocaleString()}</p><p>Next: stage ${assets.game.levels[t.next]?.id||'finale'}<br>Browser password: <b>${passwordFor(Math.min(t.next,9),world.expert)}</b></p>`,[['Keep going',()=>{world.advance();state='play';hide();save();}],['World map',stages,'secondary']]);}else if(t.type==='ending'){renderer.renderScreen('THEEND');card('THE ADVENTURE IS COMPLETE','A feast well earned.',`<p>Final score ${(world.score*10).toLocaleString()}<br>Explore the remaining secret stages from the world map.</p>`,[['Explore stages',stages],['Title screen',title,'secondary']]);}else{sound(audio.setTrack('GAMEOVER'));card('THE STONE AGE IS TOUGH','Game over',`<p>Score ${(world.score*10).toLocaleString()}</p>`,[['Try again',()=>start(world.levelIndex,world.expert)],['Title screen',title,'secondary']]);}}
}
function start(index=0,expert=false){closeLevelMap();clearInputs();state='play';world=new World(assets,{expert,onEvent:event});$('#status-label').textContent='FIND THE KEY · UNCOVER THE FEAST';if(index)world.loadLevel(index);$('#stage-label').textContent=`STAGE ${world.level.id} · ${expert?'EXPERT':'BEGINNER'}`;hide();save();}
function save(){if(!world||state==='demo')return;const w=world,t=w.transition,complete=t?.type==='complete',score=complete&&t.tally?(w.score+pendingTallyScore(w))>>>0:w.score,q=Math.max(w.extraLifeQuotient,Math.floor(score/25000));saved={version:1,level:complete?t.next:w.levelIndex,expert:w.expert,score,lives:Math.min(99,w.lives+q-w.extraLifeQuotient),extraLifeQuotient:q,persistence:complete?null:w.capturePersistence(),foodCounts:complete&&t.tally?null:Array.from(w.foodCounts),completed:[...completed]};try{localStorage.setItem(STORAGE,JSON.stringify(saved));}catch{}}
function resume(){const s=saved;start(s.level,s.expert);world.restoreScoreProgress(s);if(s.persistence)world.restorePersistence(s.persistence);if(s.foodCounts)world.foodCounts.set(s.foodCounts);Object.assign(world.player,world.checkpoint,{vx:0,vy:0,invulnerable:24});world.camera.x=Math.max(0,Math.min(world.maxCameraX(),world.player.x-144));world.camera.y=Math.max(0,Math.min(world.maxCameraY(),world.player.y-128));save();toast('Resumed at your checkpoint');}
function pause(){if(state==='level-map'){closeLevelMap();return;}if(state==='play'||state==='demo'){previous=state;state='pause';save();card('TAKE A BREATHER','Adventure paused','<p>Your stage and checkpoint are saved in this browser.</p>',[['Keep playing',()=>{state=previous;hide();}],['Restart stage',()=>{world.loadLevel(world.levelIndex,{restart:true});state='play';hide();}],['World map',stages,'secondary'],['Title screen',title,'secondary']]);}else if(state==='pause'){state=previous;hide();}}
function help(){closeLevelMap();const back=state,priorHTML=dialog.innerHTML,priorClass=dialog.className,wasHidden=dialog.hidden;state='help';card('KNOW YOUR MOVES','Ready, caveman?','<div class="help-grid"><span><kbd>← →</kbd> Move</span><span><kbd>↑ / Z</kbd> Hold to jump</span><span><kbd>SPACE</kbd> Swing / throw</span><span><kbd>↓</kbd> Crouch / passage</span><span><kbd>X</kbd> Look ahead</span><span><kbd>P</kbd> Pause</span><span><kbd>H</kbd> Original / HD graphics</span></div><p class="touch-help">Touch: hold the left/right pad with your left thumb; slide across it to reverse. Tap anywhere else on the game to attack, or hold for repeated hits. Swipe up to jump and down to crouch or use passages; keep the finger down to hold the action. The on-screen controls remain available in full screen. Turn the phone sideways for more room. Ten quick taps in the right half toggle IDKFA secret hints; ten in the left half toggle IDDQD invulnerability. Swipe or pause to cancel a sequence. Add this site to your Home Screen for an app view on browsers without native full screen.</p><p>Collect food for points and six bones to restore a heart. Type <kbd>IDDQD</kbd> during play to toggle invulnerability (browser-only cheat). Spikes cannot hurt you; falling out of the map returns you to your checkpoint without losing a life. Type <kbd>IDKFA</kbd> to toggle outlines of concealed blocks, passage markers and bonus exits, with arrows toward nearby hints beyond the screen. Type <kbd>MAP</kbd> to pause and see the entire current level, including concealed terrain, items and passages. Click the map to teleport your feet to that location. Any key or Back to game returns without moving. The toolbar Map button also opens it. Some pickups spill your stored energy; collect the bones to recover it. Land on enemies and hold jump for a higher bounce. Strike hidden scenery repeatedly to reveal treasure and platforms. Pick up the key to open exits. Hold down at passages to travel.</p><p class="fine">A native browser reconstruction using recovered original assets. Some enemy and boss behavior remains approximate.</p>',[['Got it',()=>{state=back;if(back==='title')title();else if(back==='play'||back==='demo')hide();else if(back==='pause'){state='play';pause();}else if(back==='stages')stages();else if(back==='password')password();else if(back==='menu')difficulty();else{dialog.innerHTML=priorHTML;dialog.className=priorClass;dialog.hidden=wasHidden;state='play';pause();}}]]);}
function stages(){closeLevelMap();const back=world?'play':'title';state='stages';renderer.renderMap(world?.levelIndex||0,16);card('THE ORIGINAL WORLDS','Choose your next adventure','<p>Campaign stages 1–9 and A, five bonus worlds and the finale. Stage selection starts a fresh practice run.</p><div class="stage-grid"></div>',[['Back',()=>{if(world){state=back;hide();}else title();},'secondary']]);dialog.querySelector('.dialog-card').classList.add('stages');const grid=dialog.querySelector('.stage-grid');assets.game.levels.forEach((l,i)=>{const b=button(l.id,()=>start(i,world?.expert||false),'stage-button'+(world?.levelIndex===i?' current':'')+(completed.has(l.id)?' completed':''));b.setAttribute('aria-label',`Play stage ${l.id}`);grid.append(b);});}
function password(){state='password';card('RETURN TO THE ADVENTURE','Enter your password','<p>Use a four-character password from this browser edition.</p><input class="password-input" aria-label="Password" maxlength="4" autocomplete="off" spellcheck="false"><p class="error" role="alert"></p><p class="fine">Original DOS passwords depend on the computer’s ROM profile. This edition uses a fixed portable profile.</p>',[['Continue',()=>{const p=parsePassword(dialog.querySelector('input').value.trim());if(p)start(p.level,p.expert);else dialog.querySelector('.error').textContent='That password is not recognized.';}],['Back',title,'secondary']]);dialog.querySelector('input').focus();}
function toggleSound(){muted=!muted;gesture();audio.setMuted(muted);$('#sound-label').textContent=muted?'Sound off':'Sound on';$('#mute-button').setAttribute('aria-label',muted?'Enable sound':'Mute sound');$('#sound-wave').setAttribute('d',muted?'m16 9 5 6m0-6-5 6':'M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14');}
$('#map-button').onclick=()=>state==='level-map'?closeLevelMap():openLevelMap();
$('#mute-button').onclick=toggleSound;$('#pause-button').onclick=pause;$('#help-button').onclick=help;$('#stages-button').onclick=stages;$('#fullscreen-button').onclick=()=>gameScreen.toggle();
// A touch pointerup may open UI underneath the compatibility click. Consume that
// one click before it can teleport/close MAP or activate a newly shown dialog.
function consumeTouchClick(){let timer;const clear=()=>{document.removeEventListener('click',click,true);document.removeEventListener('pointerdown',clear,true);clearTimeout(timer);},click=e=>{e.preventDefault();e.stopImmediatePropagation();clear();};document.addEventListener('click',click,true);document.addEventListener('pointerdown',clear,{capture:true,once:true});timer=setTimeout(clear,700);}
// Secondary fingers do not reliably synthesize click while another thumb moves.
function touchButton(selector,action){const b=$(selector);let pointer=null;b.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;pointer=e.pointerId;b.setPointerCapture(e.pointerId);});b.addEventListener('pointercancel',()=>pointer=null);b.addEventListener('pointerup',e=>{if(e.pointerId!==pointer)return;pointer=null;const r=b.getBoundingClientRect();if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom){e.preventDefault();consumeTouchClick();action();}});b.onclick=e=>{if(e.pointerType==='mouse'||(!e.pointerType&&e.detail===0))action();};}
touchButton('#touch-fullscreen',()=>gameScreen.toggle());touchButton('#touch-pause',()=>pause());touchButton('#touch-map',()=>openLevelMap());touchButton('#touch-graphics',()=>setGraphics(graphicsMode==='hd'?'original':'hd'));
const keys={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',KeyZ:'up',ArrowDown:'down',KeyS:'down',Space:'attack',KeyX:'look'};
window.addEventListener('keydown',e=>{if(qa)canvas.dataset.lastKey=JSON.stringify({key:e.key,code:e.code});if(blockedKeys.has(e.code)){e.preventDefault();return;}if(state==='level-map'){e.preventDefault();if(!e.repeat){blockedKeys.add(e.code);closeLevelMap();}return;}if(!e.repeat)clearTimeout(muteTimer);if(e.target.tagName==='INPUT'){cheatInput.reset();if(e.code==='Enter'){e.preventDefault();dialog.querySelector('.primary')?.click();}return;}const cheat=cheatInput.feed(e,state==='play');if(cheat){if(cheat==='MAP')openLevelMap();else if(cheat==='IDKFA')world.toggleSecretHints();else world.toggleGodMode();held={};pressed={};e.preventDefault();return;}if(cheatInput.pending){if(!e.repeat&&cheatInput.buffer.endsWith('M'))muteTimer=setTimeout(()=>{if(state==='play'&&cheatInput.buffer.endsWith('M')){cheatInput.reset();toggleSound();}},700);e.preventDefault();return;}if(keys[e.code]){e.preventDefault();held[keys[e.code]]=true;if(state==='play')pressed[keys[e.code]]=true;gesture();}if(e.repeat)return;if(e.code==='KeyP'||e.code==='Escape'){e.preventDefault();pause();}if(e.code==='KeyH'){e.preventDefault();setGraphics(graphicsMode==='hd'?'original':'hd');}if(e.code==='KeyM'||e.code==='F3'){e.preventDefault();toggleSound();}if(e.code==='KeyF')$('#fullscreen-button').click();if(e.code==='Enter'&&state!=='play'){e.preventDefault();dialog.querySelector('.primary')?.click();}});
window.addEventListener('resize',()=>touchControls.reset());
window.addEventListener('keyup',e=>{blockedKeys.delete(e.code);if(keys[e.code])held[keys[e.code]]=false;});window.addEventListener('blur',()=>{blockedKeys.clear();clearTimeout(muteTimer);cheatInput.reset();clearInputs();if(state==='play')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInputs();if(state==='play')pause();}});
function frame(now){
 touchControls.update(state);const gl=graphicsMode==='hd'?'SD':'HD',fl=gameScreen.active?'Leave full screen':'Full screen';if(gl!==touchLabel){touchLabel=gl;$('#touch-graphics').textContent=gl;}if(fl!==touchFullLabel){touchFullLabel=fl;$('#touch-fullscreen').setAttribute('aria-label',fl);}
 const dt=last?Math.min(.25,(now-last)/1000):0;last=now;
 if((state==='play'||state==='demo')&&world?.transition?.tally){
  // Completion has its own PIT/retrace clocks; sample it on every RAF.
  acc=0;world.stepTally(dt);presentation.reset(world);
  if(state==='play'||state==='demo')renderer.render(world);
  if((saveClock+=dt)>5){saveClock=0;save();}
 }else if(state==='play'||state==='demo'){
  acc+=dt;
  while(acc>=1/TICK_HZ){
   acc-=1/TICK_HZ;
   const input={...held,...pressed};pressed={};for(const[key,value]of Object.entries(touchControls.sample()))if(value)input[key]=true;
   presentation.beforeStep(world);
   world.step(state==='demo'?inputFromMask(demo.next()):input);
   presentation.afterStep(world);
   if((state!=='play'&&state!=='demo')||world.transition?.tally)break;
  }
  if(state==='play'||state==='demo'){
   renderer.render(world.transition?.tally?world:presentation.sample(world,acc*TICK_HZ,dt));
   if(qa)canvas.dataset.pose=JSON.stringify({frame:world.frame,x:world.player.x,y:world.player.y,vx:world.player.vx,vy:world.player.vy,sprite:world.player.sprite,variant:world.player.animationVariant,weapon:world.playerWeapon?.sprite??null,form:world.alternate,glide:world.player.glideMode});
  }
  if((saveClock+=dt)>5){saveClock=0;save();}
 }else{
  acc=0;if(world)presentation.reset(world);
 }
 requestAnimationFrame(frame);
}
try{assets=await Assets.load(p=>$('#loading-progress').style.width=`${p*100}%`);assets.rules=await(await fetch('rules.json')).json();renderer=new Renderer(canvas,assets);title();let initialGraphics='hd';try{if(localStorage.getItem(GRAPHICS_STORAGE)==='original')initialGraphics='original';}catch{}if(initialGraphics==='hd'){$('#loading-label').textContent='Preparing HD graphics…';await setGraphics('hd');}$('#loading').hidden=true;requestAnimationFrame(frame);if(new URLSearchParams(location.search).has('qa'))window.prehistorik={get world(){return world;},get assets(){return assets;},get renderer(){return renderer;},get state(){return state;},get graphics(){return graphicsMode;},touchState:()=>[...touchControls.input.pointers.values()].map(({kind,gesture,direction})=>({kind,gesture,direction})),mapView:()=>levelMap.survey?{bounds:{...levelMap.survey.bounds},view:{...levelMap.view},width:levelMap.canvas.width,height:levelMap.canvas.height}:null,scene:()=>world&&sceneAdapter.capture(world),levelScene:()=>world&&sceneAdapter.describeLevel(world),setGraphics,start,pause,step:(n,input={})=>{for(let i=0;i<n;i++)world.step(input);renderer.render(world);return world.snapshot();}};}catch(e){$('#loading-label').textContent='Could not load the adventure. Refresh to try again.';console.error(e);}
