import {loadAssets, Renderer} from './renderer.js';
import {Input} from './input.js';
import {showBuildInfo} from './build-info.js';
import * as engine from './simulation.js';
import {OriginalAudio} from './audio.js';
import {OriginalSequence} from './ending.js';
import {OriginalIntro,openingReady} from './intro.js';
import {OriginalInterlude,interludeReady} from './interlude.js';
import {OriginalCharacterSelect} from './character-select.js';
import {OriginalPassword} from './password.js';
import {SOUND_TEST_DATA} from './sound-test-data.js';
import {LEGACY_DATA,averageJoystickSamples} from './legacy-controls.js';
import {createMapOverlay} from './map-overlay.js';
import {createLevelOverlay} from './level-overlay.js';
import {preloadPresentationHD} from './hd-presentation.js';
import {warmStatePalettes} from './hd-palette-warmup.js';
import {HDStageLoader} from './hd-stage-loader.js';
import {HDFramePresenter} from './hd-frame-presenter.js';

const $ = selector => document.querySelector(selector);
const canvas = $('#game');
let started = false, paused = false, simulation, renderer, input;
let prior = performance.now(), accumulated = 0;
let lastStatus;
let assets, menuStep = 'mode';
let selectingPlayer = 1;
let characterSelect = null;
let menuCursor = 0;
const selection = {mode:'arcade',character:'hero',players:1,character2:'amazon',healthBars:3,devices:['keypad','keyboard']};
let sequence=null;
let titlePending=true,openingShown=false,interludeShown=false;
let calibration=null;
let acceptedPasswordByte=0;
let soundTestCursor=0,soundTestEffect=SOUND_TEST_DATA.effect.initial,soundTestMusicTicket=0,soundTestEffectTicket=0;
function warmPresentation(kind) {
  if(!assets?.hd)return Promise.resolve(null);
  const characters=[selection.character,...(selection.players===2?[selection.character2]:[])];
  const key=kind+':'+characters.join(',');
  if(!hdWarmups.has(key))hdWarmups.set(key,preloadPresentationHD(assets,kind,{characters,load:request=>request.kind==='font'&&renderer?.vectorFont?true:assets.hd.preloadRequest(request.kind==='map'?{...request,viewport:[assets.maps[request.mapId].initialCamera.x,assets.maps[request.mapId].initialCamera.y,assets.playfieldWidth,200]}:request)}).then(report=>{report.typography=renderer?.vectorFont?.classification;if(window.goldenAxe)(window.goldenAxe.hdPresentationCoverage??={})[key]=report;return report;}).catch(error=>({kind,complete:false,error:String(error.message||error)})));
  return hdWarmups.get(key);
}
function updateGraphicsUI() {
  if(!renderer)return;
  const status=renderer.getGraphicsStatus(),hd=status.mode==='hd';
  for(const button of document.querySelectorAll('[data-open-hd]')){button.disabled=false;button.setAttribute('aria-pressed',String(hd));button.textContent=button.classList.contains('icon-button')?(hd?'HD':'DOS'):(hd?'HD → originál':'Originál → HD');button.setAttribute('aria-label',hd?'Přepnout na původní grafiku':'Přepnout na HD grafiku');}
  const label=$('#graphics-coverage');
  if(label)label.textContent=hd?'HD remaster. Tlačítkem HD přepneš původní grafiku.':'Původní grafika.';
  const edition=$('#graphics-edition');if(edition)edition.textContent=hd?'HD REMASTER':'PŮVODNÍ GRAFIKA';
}
function setGraphicsMode(mode) {const result=renderer.setGraphicsMode(mode);try{localStorage.setItem('ga.graphics',mode);}catch{}updateGraphicsUI();return result;}
function toggleHD() {return setGraphicsMode(renderer.graphicsMode==='hd'?'original':'hd');}
function makePassword(){warmPresentation('password');const presenter=new OriginalPassword({acceptedByte:acceptedPasswordByte});presenter.kind='password';presenter.phase='password';presenter.advance=()=>presenter.key('Enter');return presenter;}
let mapOverlay=null,levelOverlay=null,lastGodMode=false;
const hdWarmups=new Map();
let paletteWarmupRunning=false,lastPaletteWarmup=-Infinity;
let hdStageLoader=null;
let hdPresenter=null,hdLoading={waiting:false,failed:false};
function warmActorPalettes(now=performance.now()) {
  if(!assets?.hd||!renderer||!simulation||paletteWarmupRunning||now-lastPaletteWarmup<250)return;
  lastPaletteWarmup=now;paletteWarmupRunning=true;
  // Snapshot only palette dependencies; no simulation tick/input/audio waits for this work.
  warmStatePalettes(assets,renderer,simulation.state,{limit:8}).catch(()=>{}).finally(()=>{paletteWarmupRunning=false;});
}
const resultsHistogram=Array(8).fill(0);
const audio = new OriginalAudio({muted:globalThis.GOLDEN_AXE_TEST_MUTED===true});
let audioStageKey=null;
let audioGeneration=0;
function syncAudioStage(){
  if(!started||sequence||!audio.context||!audio.manifest)return;
  const key=`${simulation.mode}:${simulation.state.stageIndex}`;
  if(key===audioStageKey)return;
  audioStageKey=key;const generation=audioGeneration;
  audio.playStage(simulation.state.stageIndex,{mode:simulation.mode}).then(ok=>{if(!ok&&generation===audioGeneration&&audioStageKey===key)audioStageKey=null;});
}
function unlockAudio(){
  audio.setPaused(paused);
  const generation=audioGeneration;
  audio.unlock().then(ready=>{if(ready&&started&&generation===audioGeneration)syncAudioStage();});
}
// AXE3ae6 selects INTRO before the title; mode-menu initialization8952→01ee stops it.
function menuAudio(){audio.setPaused(false);}
function resetAudio(){audioGeneration++;audio.stop();audioStageKey=null;}
function syncSoundGates(){for(const button of document.querySelectorAll('[data-toggle-effects]')){button.textContent=`Zvuky: ${audio.effectsEnabled?'zapnuto':'vypnuto'} · F2`;button.setAttribute('aria-pressed',String(audio.effectsEnabled));}for(const button of document.querySelectorAll('[data-toggle-music]')){button.textContent=`Hudba: ${audio.musicEnabled?'zapnuto':'vypnuto'} · F3`;button.setAttribute('aria-pressed',String(audio.musicEnabled));}}
for(const button of document.querySelectorAll('[data-toggle-effects]'))button.addEventListener('click',()=>{audio.toggleEffects();syncSoundGates();});
for(const button of document.querySelectorAll('[data-toggle-music]'))button.addEventListener('click',()=>{audio.toggleMusic();syncSoundGates();});
function dispatchSound(event){
  if(event.kind==='sfx')audio.triggerEffect(event.id);
  else if(event.kind==='sfx-loop-start')audio.triggerEffect(event.id,{loop:true});
  else if(event.kind==='sfx-stop')audio.stopEffect();
}
$('#sound').addEventListener('click',()=>{
  audio.setMuted(!audio.muted);
  $('#sound').textContent=audio.muted?'♩':'♪';
  $('#sound').setAttribute('aria-label',audio.muted?'Zapnout původní zvuk':'Ztlumit původní zvuk');
  if(!audio.muted){if(started)unlockAudio();else if(menuStep!=='character')menuAudio();}
});
window.addEventListener('pagehide',()=>audio.dispose());

function menuSync() {
  $('#mode-menu').hidden = menuStep !== 'mode';
  $('#character-menu').hidden = started||menuStep !== 'character';
  $('#options-menu').hidden = menuStep !== 'options';
  $('#sound-test-menu').hidden = menuStep !== 'soundtest';
  document.querySelector('.stage').classList.toggle('selecting',!started&&menuStep==='character');
  document.querySelector('.stage').classList.toggle('two-selectors',!started&&menuStep==='character'&&selection.players===2);
  $('#start-screen').hidden=started||menuStep==='character';
  input?.setActive(started||menuStep==='character');
  for (const button of document.querySelectorAll('[data-mode]')) {
    const active = menuCursor<3 && button.dataset.mode === selection.mode;
    button.classList.toggle('selected',active); button.setAttribute('aria-pressed',String(active));
  }
  if(menuStep==='character'&&characterSelect){
    for(let index=0;index<selection.players;index++){
      const current=characterSelect.current[index?'p2':'p1'];
      const key=index?'character2':'character';selection[key]=current.character||selection[key];
      const group=document.querySelector(`[data-selection-player="${index}"]`);
      group.querySelector('.character-player').textContent=`PLAYER ${index+1} · ${current.confirmed?'POTVRZENO':current.rotating?'OTÁČENÍ…':'VYBER HRDINU'}`;
      for(const button of group.querySelectorAll('[data-character],[data-character2]')){
        const name=button.dataset.character||button.dataset.character2,active=name===current.character;
        button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));
        button.disabled=current.confirmed||current.rotating||!!characterSelect.current[index?'p1':'p2']?.confirmed&&characterSelect.current[index?'p1':'p2'].character===name;
      }
      group.querySelector('.primary').disabled=current.confirmed||current.rotating;
      for(const button of group.querySelectorAll('[data-select-rotate]'))button.disabled=current.confirmed;
    }
  }
  document.querySelector('[data-selection-player="1"]').hidden=selection.players!==2;
  for (const button of document.querySelectorAll('[data-players]')) {
    const active = Number(button.dataset.players) === selection.players;
    button.classList.toggle('selected',active); button.setAttribute('aria-pressed',String(active));
  }
  for(const button of document.querySelectorAll('[data-health-bars]')){const active=Number(button.dataset.healthBars)===selection.healthBars;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));}
  $('#two-player-note').hidden=selection.players!==2;
  for(const select of document.querySelectorAll('[data-device-player]')){const index=Number(select.dataset.devicePlayer);select.value=selection.devices[index];for(const option of select.options)option.disabled=option.value===selection.devices[1-index];}
  $('#mouse-lock').disabled=!selection.devices.includes('mouse');
  $('#launch').innerHTML='Vybrat <span>✓</span>';
  $('#open-options').classList.toggle('selected',menuCursor===3);
  $('#start').innerHTML=menuCursor===3?'Otevřít Options <span>→</span>':titlePending?'Spustit původní úvod <span>→</span>':'Vybrat hrdinu <span>→</span>';
}
function primaryAction() {
  if(!started&&titlePending&&menuStep==='mode'&&menuCursor!==3){
    titlePending=false;sequence=new OriginalIntro(simulation,'title');warmPresentation('title');start();
    const generation=audioGeneration;audio.unlock().then(ok=>{if(ok&&generation===audioGeneration&&sequence?.kind==='title')audio.playTrack('opening');});return;
  }
  if (started) {
    if(sequence){if(paused){pause();return;}sequence.advance();drainSequenceEvents();finishSequence();return;}
    if(simulation.state.status==='continue'){simulation.continueGame(true);start();return;}
    if(simulation.state.status==='stage-complete'){continueStage();return;}
    if(paused)pause();return;
  }
  if (menuStep === 'mode') {if(menuCursor===3)menuAudio();else resetAudio();menuStep=menuCursor===3?'options':'character';selectingPlayer=1;if(menuStep==='character')beginCharacterSelect();menuSync();return;}
  if (menuStep === 'options') {menuStep='mode';menuSync();return;}
  if(menuStep==='soundtest'){if(soundTestCursor<11)playSoundTestMusic(SOUND_TEST_DATA.music[soundTestCursor].selector);else if(soundTestCursor===11)stepSoundTestEffect(1);else exitSoundTest();return;}
  launchSelection();
}
function beginCharacterSelect(){
  characterSelect=new OriginalCharacterSelect({assets,players:selection.players});warmPresentation('character-select');
  drainCharacterEvents();
  input?.setPlayers(selection.players);input?.setDevices(selection.devices);input?.clear();
  accumulated=0;prior=performance.now();canvas.focus({preventScroll:true});
}
function drainCharacterEvents(){const events=characterSelect?.drainEvents()||[];simulation?.acceptSpeakerEvents?.(events);for(const event of events){if(event.kind==='music-stop')resetAudio();else dispatchSound(event);}}
function launchSelection(){if(menuStep==='character'&&characterSelect){characterSelect.confirm(0);menuSync();}}
function finishCharacterSelect(){
  if(!characterSelect?.done)return;
  [selection.character,selection.character2]=characterSelect.selected;
  characterSelect=null;launch();
}
function launch() {
  if (!assets) return;
  levelOverlay?.close({resume:false,focus:false});
  resetAudio();
  sequence=null;
  openingShown=false;
  interludeShown=false;
  simulation = new engine.Simulation({assets,...selection});
  input?.setPlayers(selection.players);
  input?.setDevices(selection.devices);
  if (window.goldenAxe) window.goldenAxe.simulation = simulation;
  start();
}
function jumpToLevel(index) {
  if(!started||['title','password'].includes(sequence?.kind))return {ok:false,reason:'inactive-game'};
  const result=simulation.jumpToStage(index);
  if(!result.ok)return result;
  levelOverlay?.close({resume:false,focus:false});mapOverlay?.close();
  resetAudio();sequence=null;calibration=null;$('#calibration-panel').hidden=true;
  openingShown=true;interludeShown=false;input?.clear();
  start();return result;
}
function returnMenu() {

  levelOverlay?.close({resume:false,focus:false});
  mapOverlay?.close();
  resetAudio();audio.setPaused(true);
  sequence=null;started=false;paused=false;menuStep='mode';selectingPlayer=1;input?.clear();menuSync();sync();
  menuAudio();canvas.focus({preventScroll:true});
}
for (const button of document.querySelectorAll('[data-mode]')) button.addEventListener('click',()=>{selection.mode=button.dataset.mode;menuCursor=['arcade','beginner','duel'].indexOf(selection.mode);menuAudio();menuSync();});
for(const button of document.querySelectorAll('[data-character],[data-character2]'))button.addEventListener('click',()=>{if(button.disabled||!characterSelect)return;characterSelect.select(button.dataset.character2?1:0,button.dataset.character||button.dataset.character2);menuSync();});
for(const button of document.querySelectorAll('[data-select-rotate]'))button.addEventListener('click',()=>{characterSelect?.rotate(Number(button.dataset.selectPlayer),Number(button.dataset.selectRotate));menuSync();});
$('#launch2').addEventListener('click',()=>{characterSelect?.confirm(1);menuSync();});
for (const button of document.querySelectorAll('[data-players]')) button.addEventListener('click',()=>{if(!button.disabled){selection.players=Number(button.dataset.players);menuAudio();menuSync();}});
for(const button of document.querySelectorAll('[data-health-bars]'))button.addEventListener('click',()=>{selection.healthBars=Number(button.dataset.healthBars);menuSync();});
for(const select of document.querySelectorAll('[data-device-player]')){
  for(const device of LEGACY_DATA.devices){const option=document.createElement('option');option.value=device.id;option.textContent=device.label;select.append(option);}
  select.addEventListener('change',()=>{const index=Number(select.dataset.devicePlayer);selection.devices[index]=select.value;input?.setDevices(selection.devices);menuSync();});
}
$('#mouse-lock').addEventListener('click',async()=>{const result=await input?.legacy.requestMouseLock();$('#device-status').textContent=result?.ok?'Myš je zachycena; Escape ji uvolní.':'Zachycení myši není dostupné. Myš funguje nad herní plochou.';});
document.querySelector('.screen-wrap').append($('#calibration-panel'));
const calibrationStages=['Střed páčky','Levý horní roh','Pravý dolní roh'];
function calibrationPad(port){const pads=Array.from(input?.legacy.getGamepads?.()||[]).filter(p=>p&&p.connected!==false),index=input?.legacy.gamepadIndices[port];return index==null?pads[port]:pads.find(p=>p.index===index);}
const axisByte=value=>Math.max(1,Math.min(255,Math.round(128+Math.max(-1,Math.min(1,value||0))*127)));
function calibrationPrompt(){if(!calibration)return;const pad=calibrationPad(calibration.port);$('#calibration-prompt').textContent=calibration.error|| (pad?`Joystick ${calibration.port+1}: ${calibrationStages[calibration.step]}.`:`Joystick ${calibration.port+1} není připojen. Připoj gamepad a stiskni jeho tlačítko.`);$('#calibration-measure').disabled=!pad||calibration.busy;}
function closeCalibration(){const previous=calibration;if(!previous)return;calibration=null;cancelAnimationFrame(previous.raf);$('#calibration-panel').hidden=true;paused=previous.paused;accumulated=0;input?.clear();audio.setPaused(paused);sync();previous.focus?.focus?.({preventScroll:true});}
function beginCalibration(port){if(!input)return;if(calibration)closeCalibration();calibration={port,step:0,points:[],busy:false,buttons:0,paused,focus:document.activeElement};paused=true;input.clear();accumulated=0;sync();$('#calibration-panel').hidden=false;calibrationPrompt();$('#calibration-measure').focus();const current=calibration;
  const poll=()=>{if(calibration!==current)return;const pad=calibrationPad(port),buttons=(pad?.buttons[0]?.pressed?1:0)|(pad?.buttons[1]?.pressed?2:0);if(!current.busy){calibrationPrompt();if(buttons&~current.buttons)measureCalibration();}current.buttons=buttons;current.raf=requestAnimationFrame(poll);};current.raf=requestAnimationFrame(poll);
}
async function measureCalibration(){const current=calibration;if(!current||current.busy)return;current.busy=true;current.error=null;$('#calibration-measure').disabled=true;const samples=[];try{
  for(let i=0;i<16;i++){if(i)await new Promise(requestAnimationFrame);if(calibration!==current)return;const pad=calibrationPad(current.port);if(!pad)throw Error('Gamepad není připojen.');input.legacy.setGamepadIndex(current.port,pad.index);samples.push({x:axisByte(pad.axes[0]),y:axisByte(pad.axes[1])});}
  current.points.push(averageJoystickSamples(samples));current.step++;
  if(current.step===3){const [center,min,max]=current.points;input.legacy.setCalibration(current.port,{centerX:center.x,centerY:center.y,minX:min.x,minY:min.y,maxX:max.x,maxY:max.y});$('#device-status').textContent=`Joystick ${current.port+1}: kalibrace uložena.`;closeCalibration();return;}
}catch(error){current.error=error.message;current.step=0;current.points=[];}finally{if(calibration===current){current.busy=false;calibrationPrompt();}}}
for(const button of document.querySelectorAll('[data-calibrate-port]'))button.addEventListener('click',()=>beginCalibration(Number(button.dataset.calibratePort)));
$('#calibration-measure').addEventListener('click',measureCalibration);$('#calibration-cancel').addEventListener('click',closeCalibration);
window.addEventListener('keydown',event=>{if(sequence?.kind==='password')return;if(calibration){event.stopImmediatePropagation();if(event.code==='Escape'){event.preventDefault();measureCalibration();}return;}if(event.ctrlKey||event.altKey||event.metaKey||event.repeat)return;if(['F2','F3','F4','F5'].includes(event.code)){event.preventDefault();event.stopImmediatePropagation();if(event.code==='F2')audio.toggleEffects();else if(event.code==='F3')audio.toggleMusic();else beginCalibration(event.code==='F4'?0:1);syncSoundGates();}},true);
window.addEventListener('pagehide',()=>{if(calibration){cancelAnimationFrame(calibration.raf);calibration=null;}});
function syncPasswordField(){if(sequence?.kind==='password')$('#password-text').value=sequence.text;}
window.addEventListener('keydown',event=>{if(sequence?.kind!=='password'||event.ctrlKey||event.metaKey||event.altKey||event.isComposing)return;event.stopImmediatePropagation();if(/^[a-z]$/i.test(event.key)||['Enter','Escape','Backspace'].includes(event.key)){event.preventDefault();sequence.key(event.key);syncPasswordField();finishSequence();}},true);
$('#password-text').addEventListener('input',event=>{if(sequence?.kind!=='password')return;const text=event.target.value;sequence.text='';for(const letter of text)sequence.key(letter);syncPasswordField();});
$('#password-entry').addEventListener('submit',event=>{event.preventDefault();if(sequence?.kind==='password'){sequence.key('Enter');syncPasswordField();finishSequence();}});

$('#menu-back').addEventListener('click',()=>{characterSelect=null;menuStep='mode';input?.clear();menuSync();});
$('#open-options').addEventListener('click',()=>{menuCursor=3;menuStep='options';menuSync();});
$('#options-back').addEventListener('click',()=>{menuStep='mode';menuSync();});
function soundTestSync(){for(const button of document.querySelectorAll('[data-sound-track]'))button.classList.toggle('selected',Number(button.dataset.soundTrack)===soundTestCursor);$('#sound-effect-number').textContent=String(soundTestEffect+SOUND_TEST_DATA.effect.displayOffset);}
async function playSoundTestMusic(selector){const ticket=++soundTestMusicTicket,generation=audioGeneration;if(await audio.unlock()&&['soundtest','options'].includes(menuStep)&&ticket===soundTestMusicTicket&&generation===audioGeneration)audio.playTrack({selector},{restart:true});}
async function stepSoundTestEffect(delta){soundTestCursor=11;soundTestEffect=(soundTestEffect+delta+15)%15;soundTestSync();const ticket=++soundTestEffectTicket,generation=audioGeneration;if(await audio.unlock()&&menuStep==='soundtest'&&ticket===soundTestEffectTicket&&generation===audioGeneration){simulation.acceptSpeakerEvents?.([{kind:'sfx',id:soundTestEffect}]);audio.triggerEffect(soundTestEffect);}}
function exitSoundTest(){menuStep='options';menuSync();$('#open-sound-test').focus();}
SOUND_TEST_DATA.music.forEach((record,index)=>{const button=document.createElement('button');button.dataset.soundTrack=String(index);button.textContent=record.label;button.addEventListener('focus',()=>{soundTestCursor=index;soundTestSync();});button.addEventListener('click',()=>{soundTestCursor=index;soundTestSync();playSoundTestMusic(record.selector);});$('#sound-test-tracks').append(button);});
$('#open-sound-test').addEventListener('click',()=>{menuStep='soundtest';soundTestCursor=0;soundTestSync();menuSync();document.querySelector('[data-sound-track]').focus();});
$('#sound-effect-prev').addEventListener('focus',()=>{soundTestCursor=11;soundTestSync();});$('#sound-effect-next').addEventListener('focus',()=>{soundTestCursor=11;soundTestSync();});
$('#sound-effect-prev').addEventListener('click',()=>stepSoundTestEffect(-1));$('#sound-effect-next').addEventListener('click',()=>stepSoundTestEffect(1));$('#sound-test-exit').addEventListener('click',exitSoundTest);$('#sound-test-exit').addEventListener('focus',()=>{soundTestCursor=12;soundTestSync();});
$('#options-fullscreen').addEventListener('click',()=>$('#fullscreen').click());
for (const button of document.querySelectorAll('[data-return-menu]')) button.addEventListener('click',returnMenu);
window.addEventListener('keydown',event=>{
  if(!started&&menuStep==='soundtest'&&!event.repeat){
    if(['ArrowUp','ArrowDown'].includes(event.code)){event.preventDefault();soundTestCursor=(soundTestCursor+(event.code==='ArrowDown'?1:12))%13;soundTestSync();(soundTestCursor<11?document.querySelector(`[data-sound-track="${soundTestCursor}"]`):soundTestCursor===11?$('#sound-effect-next'):$('#sound-test-exit')).focus();}
    else if(soundTestCursor===11&&['ArrowLeft','ArrowRight'].includes(event.code)){event.preventDefault();stepSoundTestEffect(event.code==='ArrowLeft'?-1:1);}
    else if(event.code==='Escape'){event.preventDefault();exitSoundTest();}
    else if(['KeyJ','Numpad5'].includes(event.code)){event.preventDefault();primaryAction();}
    return;
  }
  if(started&&simulation?.state.status==='continue'&&!event.repeat){
    const actor=simulation.state.players?.find(p=>p.id===simulation.state.continueActorID);
    const confirm=actor?.playerIndex===1?event.code==='KeyS':['KeyJ','Numpad5'].includes(event.code);
    if(confirm){event.preventDefault();event.stopImmediatePropagation();primaryAction();return;}
  }
  if(started||!assets||event.repeat)return;
  if(menuStep==='character'){if(event.target?.closest?.('#character-menu')&&!['Enter','Space'].includes(event.code)){for(let index=0;index<selection.players;index++){const actions=input.actions(event.code,index);if(actions.includes('left')){event.preventDefault();characterSelect.rotate(index,-1);}if(actions.includes('right')){event.preventDefault();characterSelect.rotate(index,1);}if(actions.includes('attack')){event.preventDefault();characterSelect.confirm(index);}}menuSync();}if(event.code==='Escape'){event.preventDefault();characterSelect=null;menuStep='mode';input?.clear();menuSync();}return;}
  if(event.code==='Numpad5'||event.code==='KeyJ'){event.preventDefault();primaryAction();}
  if(event.code==='Escape'&&menuStep!=='mode'){event.preventDefault();menuStep='mode';menuSync();}
  if(menuStep==='mode'&&['ArrowUp','ArrowDown'].includes(event.code)){
    event.preventDefault();const modes=['arcade','beginner','duel'];menuCursor=(menuCursor+(event.code==='ArrowDown'?1:3))%4;if(menuCursor<3)selection.mode=modes[menuCursor];menuSync();
  }
  if(menuStep==='mode'&&['ArrowLeft','ArrowRight'].includes(event.code)){event.preventDefault();selection.players=event.code==='ArrowRight'?2:1;menuSync();}

});

function sync() {
  $('#character-menu').hidden=started||menuStep!=='character';
  document.querySelector('.stage').classList.toggle('selecting',!started&&menuStep==='character');
  document.querySelector('.stage').classList.toggle('two-selectors',!started&&menuStep==='character'&&selection.players===2);
  $('#start-screen').hidden = started||menuStep==='character';
  $('#password-entry').hidden=sequence?.kind!=='password';
  input?.setActive(started||menuStep==='character');
  $('#pause-screen').hidden = !started || !paused;
  $('#pause').textContent = paused ? '▶' : 'Ⅱ';
  $('#pause').setAttribute('aria-label', paused ? 'Pokračovat ve hře' : 'Pozastavit hru');
  const status = simulation?.state.status;
  lastStatus = status;
  const ended = started && !sequence && status && status !== 'playing' && status!=='ending' && status!=='results';
  $('#result-screen').hidden = !ended;
  if (ended) $('#pause-screen').hidden = true;
  if (ended) {
    const titles = {'game-over':'Konec hry','stage-complete':'Etapa dokončena','duel-result':'Souboj dokončen','continue':'Continue?'};
    $('#result-title').textContent = titles[status] || 'Konec ověřeného úseku';
    const canContinue = status === 'continue' || status === 'stage-complete' && typeof simulation.advanceStage === 'function';
    $('#continue').hidden = !canContinue;
    $('#decline').hidden=status!=='continue';
    $('#play-again').hidden=status==='continue';
    $('#result-detail').textContent = status==='continue'?`Zbývající kredity: ${simulation.state.credits}`:status === 'game-over' ? 'Vyčerpané životy.' : canContinue ? 'Pokračovat do další etapy.' : 'Pokračování této pracovní rekonstrukce se ještě ověřuje.';
  }
}
function start() {
  if (!simulation) return;
  started = true; paused = false; accumulated = 0; prior = performance.now();
  input?.clear(); sync(); canvas.focus({preventScroll:true});
  warmActorPalettes();
  unlockAudio();
}
function pause() {
  if (!started) {primaryAction();return;}
  paused = !paused; accumulated = 0; input?.clear(); sync();
  audio.setPaused(paused);
  if (!paused) canvas.focus({preventScroll:true});
}
$('#start').addEventListener('click', primaryAction);
$('#launch').addEventListener('click', launchSelection);
$('#pause').addEventListener('click', pause);
$('#resume').addEventListener('click', () => {if (paused) pause();});
$('#restart').addEventListener('click', () => {resetAudio();simulation.reset(); start();});
$('#play-again').addEventListener('click', () => {resetAudio();simulation.reset(); start();});
$('#continue').addEventListener('click', () => {if(simulation.state.status==='continue'){simulation.continueGame(true);start();}else continueStage();});
$('#decline').addEventListener('click',()=>{simulation.continueGame(false);sync();});
$('#fullscreen').addEventListener('click', async () => {
  const shell = $('#game-shell');
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (shell.requestFullscreen) await shell.requestFullscreen();
    else {shell.classList.toggle('viewport-mode'); window.scrollTo({top:0,behavior:'smooth'});}
  } catch {shell.classList.toggle('viewport-mode'); window.scrollTo({top:0,behavior:'smooth'});}
});
$('#about-toggle').addEventListener('click', () => {
  const open = $('#about').hidden;
  $('#about').hidden = !open; $('#about-toggle').setAttribute('aria-expanded',String(open));
});
document.addEventListener('visibilitychange', () => {
  if(document.hidden){if(started&&!paused)pause();else audio.setPaused(true);}
  else if(!started&&audio.currentTrack)audio.setPaused(false);
});

function beginSequence(kind,plan=null){
  warmPresentation(kind);
  if(kind==='results'){
    const results=simulation.calculateResults();for(const result of results)resultsHistogram[Math.min(7,result.rank)]++;
    simulation.state.resultsHistogram=[...resultsHistogram];
  }
  sequence=new OriginalSequence(simulation,kind,plan);resetAudio();
  if(kind==='results')audio.playTrack('sassa');
  else if(kind==='travel')audio.playTrack('oldmap');
  input?.clear();sync();
}
function drainSequenceEvents(){
  if(!sequence)return;
  simulation.acceptSpeakerEvents?.(sequence.events);
  for(const event of sequence.events){if(event.kind==='music')audio.playTrack(event.id);else if(event.kind==='music-stop')resetAudio();else dispatchSound(event);}
  sequence.events=[];
}
function routeTerminal(){
  if(sequence||!started)return;
  const status=simulation.state.status;
  if(status==='game-over')beginSequence('gameover');
  else if(status==='stage-complete')continueStage();
  else if(status==='ending-incomplete'){
    if(simulation.mode==='arcade'&&simulation.state.stageIndex===7)beginSequence('rescue');
    else if(simulation.mode==='beginner')beginSequence('beginner');
    else if(simulation.playerCount===2)returnMenu();
    else beginSequence('results');
  }else if(status==='duel-result'){
    simulation.advanceStage();routeTerminal();
  }
}
function continueStage(skipTravel=false){
  if(!interludeShown&&interludeReady(simulation)){interludeShown=true;sequence=new OriginalInterlude(simulation);warmPresentation('interlude');drainSequenceEvents();start();return;}
  const plan=skipTravel?null:simulation.transitionPlan?.();
  if(plan&&!(simulation.mode==='arcade'&&simulation.state.stageIndex===7)){beginSequence('travel',plan);start();return;}
  simulation.advanceStage();routeTerminal();start();
}
function finishSequence(){
  if(!sequence?.done)return;
  const finished=sequence,next=finished.next;sequence=null;
  if(finished.kind==='title'&&next==='menu'&&!acceptedPasswordByte){resetAudio();sequence=makePassword();input?.clear();sync();$('#password-text').value='';$('#password-text').focus();return;}
  if(finished.kind==='password'){
    if(finished.accepted)acceptedPasswordByte=finished.acceptedByte;
    if(next==='title'){sequence=new OriginalIntro(simulation,'title');warmPresentation('title');resetAudio();const generation=audioGeneration;audio.unlock().then(ok=>{if(ok&&generation===audioGeneration&&sequence?.kind==='title')audio.playTrack('opening');});input?.clear();sync();canvas.focus();return;}
  }
  if(next==='resume-game'){input?.clear();return;}
  if(finished.kind==='rescue'){
    const plan=simulation.transitionPlan?.();if(plan){beginSequence('travel',plan);return;}
  }
  if(next==='menu'){returnMenu();return;}
  if(next==='advance-stage'){simulation.state.status='stage-complete';continueStage(true);return;}
  if(next==='results'){beginSequence('results',{scoreAfter:finished.kind==='rescue'||finished.kind==='travel'&&finished.plan?.sourceStageIndex===7});return;}
  if(next==='beginner'||next==='duel-message'){beginSequence(next);return;}
}

try {
  assets = await loadAssets();
  if (typeof engine.Simulation !== 'function') throw new Error('Herní simulace zatím není připravena.');
  const rate = engine.TICK_RATE;
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('Chybí ověřené časování simulace.');
  simulation = new engine.Simulation({assets});
  let graphicsMode='hd';try{if(localStorage.getItem('ga.graphics')==='original')graphicsMode='original';}catch{}
  renderer = new Renderer(canvas, assets,{graphicsMode});
  input = new Input({onPause:code=>{if(sequence?.kind==='title'&&code==='Space'){primaryAction();return;}if(!started&&code==='Escape')return;pause();},onStart:primaryAction});
  window.addEventListener('pagehide',()=>input.dispose());
  canvas.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'&&started&&!paused&&!sequence&&selection.devices.includes('mouse'))input.legacy.requestMouseLock();});
  renderer.renderMenu(menuStep);
  $('#loading').hidden = true; menuSync();sync();
  window.goldenAxe = {assets,simulation,renderer,input,audio,start,launch,pause,returnMenu,jumpToLevel,selection,beginSequence,continueStage,get characterSelect(){return characterSelect;},get sequence(){return sequence;},get started(){return started;},get paused(){return paused;},tickRate:rate};
  showBuildInfo($('#build-repository'),$('#build-commit')).then(info=>{window.goldenAxe.buildInfo=info;});
  mapOverlay=createMapOverlay({getGame:()=>window.goldenAxe});window.goldenAxe.mapOverlay=mapOverlay;
  levelOverlay=createLevelOverlay({getGame:()=>window.goldenAxe,onSelect:jumpToLevel});window.goldenAxe.levelOverlay=levelOverlay;
  window.goldenAxe.graphics={toggle:toggleHD,set:setGraphicsMode,status:()=>renderer.getGraphicsStatus()};
  for(const button of document.querySelectorAll('[data-open-hd]'))button.addEventListener('click',toggleHD);
  updateGraphicsUI();
  for(const button of document.querySelectorAll('[data-open-level]'))button.addEventListener('click',()=>levelOverlay.toggle());
  for(const button of document.querySelectorAll('[data-open-map]'))button.addEventListener('click',()=>mapOverlay.toggle());
  for(const button of document.querySelectorAll('[data-toggle-god]'))button.addEventListener('click',()=>mapOverlay.toggleGodMode());
  let cheatWord='';
  window.addEventListener('keydown',event=>{
    if(!started||event.ctrlKey||event.metaKey||event.altKey||event.target?.closest?.('input,select,textarea')||mapOverlay.isOpen||levelOverlay.isOpen)return;
    if(!/^[a-z]$/i.test(event.key))return;
    cheatWord=(cheatWord+event.key.toUpperCase()).slice(-5);
    if(cheatWord.endsWith('HD')){toggleHD();cheatWord='';return;}
    if(cheatWord.endsWith('LEVEL')){levelOverlay.open();cheatWord='';return;}
    if(sequence||simulation.state.status!=='playing')return;
    if(cheatWord.endsWith('IDDQD')){mapOverlay.toggleGodMode();cheatWord='';}
    else if(cheatWord.endsWith('MAP')){mapOverlay.toggle();cheatWord='';}
  });
  window.addEventListener('pagehide',()=>{levelOverlay.dispose();mapOverlay.dispose();});
  const tickMs = 1000 / rate;
  const frameDiagnostics=[];
  const frameAnomalies=[];
  window.goldenAxe.frameDiagnostics=frameDiagnostics;
  window.goldenAxe.diagnostics=()=>({tick:simulation.state.tick,stageIndex:simulation.state.stageIndex,status:simulation.state.status,camera:{...simulation.state.camera},paused,visibility:document.visibilityState,magic:simulation.magic?structuredClone(simulation.magic):null,speaker:simulation.speakerClock?.snapshot?.(),lastException:window.goldenAxe.lastError||null,recentFrames:structuredClone(frameDiagnostics),anomalies:structuredClone(frameAnomalies)});
  function animate(now) {
    try {
    const frameStart=performance.now(),rawElapsed=now-prior;let maxStepMs=0,steps=0;
    const elapsed = Math.min(100, Math.max(0, now - prior)); prior = now;
    hdStageLoader??=new HDStageLoader(assets,renderer);
    const stageLoad=started&&renderer.graphicsMode==='hd'&&!['title','password'].includes(sequence?.kind)?hdStageLoader.prepare(simulation):{waiting:false,failed:false};
    if (!stageLoad.waiting&&!hdLoading.waiting&&(started && !paused || calibration || menuStep==='soundtest'||!started&&menuStep==='character')) {
      accumulated += elapsed;
      while (accumulated >= tickMs) {
        if(!started&&menuStep==='character'){simulation.advanceSpeakerPIT?.();characterSelect.step(input.sample(simulation.state.players));drainCharacterEvents();menuSync();finishCharacterSelect();accumulated=Math.max(0,accumulated-tickMs);continue;}
        if(calibration||!started&&menuStep==='soundtest'){simulation.advanceSpeakerPIT?.();accumulated=Math.max(0,accumulated-tickMs);continue;}
        const sampled=input.sample(simulation.state.players);
        if(sequence){
          simulation.advanceSpeakerPIT?.();
          sequence.step(sampled);drainSequenceEvents();
          finishSequence();
        }else{
          if(!openingShown&&openingReady(simulation)){sequence=new OriginalIntro(simulation,'opening');warmPresentation('opening');openingShown=true;input.clear();accumulated=Math.max(0,accumulated-tickMs);continue;}
          const previousTick=simulation.state.tick,stepStart=performance.now();simulation.step(sampled);
          maxStepMs=Math.max(maxStepMs,performance.now()-stepStart);steps++;
          if(simulation.state.tick!==previousTick)for(const event of simulation.state.events||[])dispatchSound(event);
          routeTerminal();
        }
        accumulated = Math.max(0,accumulated-tickMs);
      }
      syncAudioStage();
    }
    renderer.beginFrame();
    if(started)warmActorPalettes(now);
    hdPresenter??=new HDFramePresenter(renderer);
    hdPresenter.begin();
    if (started) {if(sequence)sequence.render(renderer);else renderer.render({...simulation.state,mode:simulation.mode});} else if(menuStep==='character'&&characterSelect)characterSelect.render(renderer);else renderer.renderMenu(menuStep);
    hdLoading=hdPresenter.finish(now);
    if(stageLoad.waiting)hdLoading={...hdLoading,waiting:true,failed:stageLoad.failed,phase:'stage',error:stageLoad.error};
    window.goldenAxe.hdLoading=hdLoading;
    if(hdLoading.waiting)accumulated=0;
    if(audio.paused!==(paused||hdLoading.waiting))audio.setPaused(paused||hdLoading.waiting);
    $('#loading').hidden=!hdLoading.waiting;
    $('#loading').classList.toggle('hd-loading',hdLoading.waiting);
    if(hdLoading.waiting)$('#loading').textContent=hdLoading.failed?'HD grafiku se nepodařilo připravit. Zkus obnovit stránku nebo tlačítkem HD přepni na původní grafiku.':'Načítání HD grafiky…';
    updateGraphicsUI();
    if (simulation.state.status !== lastStatus) sync();
    if(lastGodMode!==!!simulation.state.godMode){lastGodMode=!!simulation.state.godMode;$('#status').textContent=`Původní data${lastGodMode?' · IDDQD':''}`;for(const button of document.querySelectorAll('[data-toggle-god]')){button.textContent=`IDDQD: ${lastGodMode?'zapnuto':'vypnuto'}`;button.setAttribute('aria-pressed',String(lastGodMode));}}
    if(started){const sample={now,rawElapsed,frameMs:performance.now()-frameStart,maxStepMs,steps,tick:simulation.state.tick,stageIndex:simulation.state.stageIndex,paused,hidden:document.hidden,status:simulation.state.status,actors:simulation.state.entities.length,magic:simulation.magic?{type:simulation.magic.type,phase:simulation.magic.phase,timer:simulation.magic.timer}:null};frameDiagnostics.push(sample);if(frameDiagnostics.length>180)frameDiagnostics.shift();if(rawElapsed>250||sample.frameMs>250||maxStepMs>50){frameAnomalies.push(sample);if(frameAnomalies.length>120)frameAnomalies.shift();}}
    requestAnimationFrame(animate);
    } catch (error) {
      // Preserve the failed state for diagnosis; do not reload or continue broken physics.
      paused=true; accumulated=0; input.clear(); audio.setPaused(true);
      window.goldenAxe.lastError={message:String(error.message||error),stack:error.stack,
        tick:simulation.state.tick,stageIndex:simulation.state.stageIndex,
        entities:structuredClone(simulation.state.entities)};
      console.error(error);
      $('#loading').hidden=false;$('#loading').setAttribute('role','alert');
      $('#loading').textContent='Hra se zastavila kvůli chybě. Stav zůstal zachován pro diagnostiku.';
    }
  }
  requestAnimationFrame(animate);
} catch (error) {
  console.error(error);
  $('#loading').textContent = error.message;
  $('#loading').setAttribute('role','alert');
}
