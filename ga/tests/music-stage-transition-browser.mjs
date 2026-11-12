// Actual app audio signal regression. Synthetic stage completion skips fighting,
// then retains the real bonus/travel/advance flow. Host output muted, app unmuted.
const {chromium}=await import(process.env.GA_PLAYWRIGHT_MODULE||'playwright');
import {writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const base=process.env.GA_TEST_URL||'http://127.0.0.1:5790/';
const out=resolve(process.env.GA_QA_OUTPUT||'/tmp/ga-stage-transition');await mkdir(out,{recursive:true});
const report={scope:'Actual Chrome post-master PCM with effects disabled; synthetic stage-complete fixture then real bonus/travel transition; original and remaster; SD and HD. Host output muted, app master=1. Not a full manual combat playthrough or physical Safari test.',cases:[],errors:[]};
const b=await chromium.launch({headless:true,...(process.env.GA_CHROME_PATH?{executablePath:process.env.GA_CHROME_PATH}:{}),args:['--mute-audio']});let page;
try{
 for(const graphics of ['original','hd']){
  const context=await b.newContext({viewport:{width:1280,height:900}});page=await context.newPage();page.on('pageerror',e=>report.errors.push(String(e)));
  await page.addInitScript(mode=>localStorage.setItem('ga.graphics',mode),graphics);
  let heldRoute,releaseRoute;const routeHeld=new Promise(r=>heldRoute=r),routeRelease=new Promise(r=>releaseRoute=r);
  await page.route('**/audio/remaster/stage2-*.flac',async route=>{heldRoute();await routeRelease;await route.continue();});
  await page.goto(base);await page.waitForFunction(()=>window.goldenAxe);await page.evaluate(()=>goldenAxe.audio.setMusicEdition('original'));await page.locator('#start').click();await page.waitForFunction(()=>goldenAxe.sequence?.kind==='title'&&goldenAxe.audio.musicSource);await page.locator('#game').focus();await page.keyboard.press('Space');await page.waitForFunction(()=>!goldenAxe.sequence&&!goldenAxe.started);await page.evaluate(()=>{goldenAxe.launch();goldenAxe.jumpToLevel(0);});
  await page.waitForFunction(()=>goldenAxe.audio.currentTrack==='stage1'&&!goldenAxe.hdLoading?.waiting,null,{timeout:60000});
  await page.evaluate(()=>{const a=goldenAxe.audio;a.setEffectsEnabled(false);window.musicProbe=a.context.createAnalyser();musicProbe.fftSize=2048;a.master.connect(musicProbe);const silent=a.context.createGain();silent.gain.value=0;musicProbe.connect(silent);silent.connect(a.context.destination);});
  async function capture(label){await page.waitForFunction(()=>!goldenAxe.hdLoading?.waiting,null,{timeout:60000});const result=await page.evaluate(async label=>{const a=goldenAxe.audio,rows=[];for(let i=0;i<16;i++){await new Promise(r=>setTimeout(r,50));const x=new Float32Array(musicProbe.fftSize);musicProbe.getFloatTimeDomainData(x);rows.push(Math.max(...x.map(Math.abs)));}return{label,stage:goldenAxe.simulation.state.stageIndex,sequence:goldenAxe.sequence?.kind??null,tick:goldenAxe.simulation.state.tick,context:a.context.state,time:a.context.currentTime,start:a.trackStartedAt,track:a.currentTrack,edition:a.getMusicEditionStatus(),master:a.master.gain.value,muted:a.muted,musicEnabled:a.musicEnabled,peak:Math.max(...rows),nonzeroWindows:rows.filter(v=>v>1e-6).length,opl:await a.liveMusic.status()};},label);assert.equal(result.master,1);assert.equal(result.muted,false);assert.equal(result.context,'running');assert(result.peak>1e-5,label);assert(result.nonzeroWindows>0,label);report.cases.push({graphics,...result});return report.cases.at(-1);}
  await capture('stage1 original');await page.locator('#game').focus();const toggled=Date.now();await page.keyboard.type('MUSIC');await page.waitForFunction(()=>goldenAxe.audio.getMusicEditionStatus().effective==='remaster',null,{timeout:60000});const latencyMs=Date.now()-toggled;const first=await capture('stage1 remaster before first score EOT');first.toggleLatencyMs=latencyMs;assert(first.time-first.start<13.404,'MUSIC must not wait until first native score ends');
  await page.evaluate(()=>{goldenAxe.simulation.state.status='stage-complete';goldenAxe.continueStage(true);});await routeHeld;await page.waitForFunction(()=>goldenAxe.simulation.state.stageIndex===1&&!goldenAxe.hdLoading?.waiting,null,{timeout:60000});
  const loading=page.locator('footer [data-music-edition-status]');await loading.waitFor({state:'visible'});const during=await capture('stage2 original audible while remaster FLAC is held');assert.equal(during.edition.loading,true);assert.equal(during.edition.effective,'original');const tick=during.tick;await page.screenshot({path:resolve(out,`loading-${graphics}.png`),fullPage:true});assert(await page.evaluate(t=>goldenAxe.simulation.state.tick>t,tick));
  releaseRoute();await page.waitForFunction(()=>goldenAxe.audio.getMusicEditionStatus().effective==='remaster',null,{timeout:60000});await loading.waitFor({state:'hidden'});await capture('stage2 remaster after bonus and travel');
  await page.keyboard.type('MUSIC');await capture('stage2 restored original');await page.evaluate(()=>goldenAxe.jumpToLevel(1));await page.waitForFunction(()=>goldenAxe.audio.currentTrack==='stage2'&&goldenAxe.audio.trackStartedAt!==null);await capture('LEVEL stage2 original');await page.keyboard.type('MUSIC');await page.waitForFunction(()=>goldenAxe.audio.getMusicEditionStatus().effective==='remaster',null,{timeout:60000});await capture('LEVEL stage2 remaster');
  await page.evaluate(()=>goldenAxe.audio.dispose());await context.close();
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(error){report.failure=String(error.stack||error);throw error;}finally{await b.close();report.browserClosed=true;report.audioClosed=true;await writeFile(resolve(out,'checks.json'),JSON.stringify(report,null,2)+'\n');}
console.log('PASS',report.cases.length,'post-master PCM stage transition checks');
