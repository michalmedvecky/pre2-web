// Browser-imposed suspension fixture; no claim that this caused a past user incident.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const {chromium}=await import(process.env.GA_PLAYWRIGHT_MODULE||'playwright');
const out=resolve(process.env.GA_QA_OUTPUT||'/tmp/ga-music-interruption');await mkdir(out,{recursive:true});
const report={scope:'Real host-muted Chrome, app unmuted, Stage2 post-master PCM; explicit unexpected context.suspend fixture. Not a physical device interruption or proof of the reported incident cause.',checks:[],errors:[]};
const browser=await chromium.launch({headless:true,...(process.env.GA_CHROME_PATH?{executablePath:process.env.GA_CHROME_PATH}:{}),args:['--mute-audio']});
try{
 const page=await browser.newPage();page.on('pageerror',error=>report.errors.push(String(error)));
 await page.addInitScript(()=>localStorage.setItem('ga.graphics','original'));
 await page.goto(process.env.GA_TEST_URL||'http://127.0.0.1:5932/');await page.waitForFunction(()=>window.goldenAxe);
 report.build=await page.evaluate(async()=>await(await fetch('./build.json',{cache:'no-store'})).json());
 await page.evaluate(()=>goldenAxe.audio.setMusicEdition('original'));await page.locator('#start').click();await page.waitForFunction(()=>goldenAxe.sequence?.kind==='title'&&goldenAxe.audio.musicSource);await page.locator('#game').focus();await page.keyboard.press('Space');await page.waitForFunction(()=>!goldenAxe.sequence&&!goldenAxe.started);
 await page.evaluate(()=>{goldenAxe.launch();goldenAxe.jumpToLevel(1);});await page.waitForFunction(()=>goldenAxe.audio.currentTrack==='stage2'&&Number.isFinite(goldenAxe.audio.trackStartedAt));
 await page.evaluate(()=>{const a=goldenAxe.audio;a.setEffectsEnabled(false);window.signal=a.context.createAnalyser();signal.fftSize=2048;a.master.connect(signal);const sink=a.context.createGain();sink.gain.value=0;signal.connect(sink);sink.connect(a.context.destination);});
 async function pcm(){return page.evaluate(async()=>{let peak=0;for(let i=0;i<12;i++){await new Promise(r=>setTimeout(r,40));const x=new Float32Array(signal.fftSize);signal.getFloatTimeDomainData(x);for(const n of x)peak=Math.max(peak,Math.abs(n));}const a=goldenAxe.audio;return{peak,edition:a.musicEdition,context:a.context.state,muted:a.muted,master:a.master.gain.value};});}
 for(const edition of ['original','remaster']){
  if(edition==='remaster'){await page.keyboard.type('MUSIC');await page.waitForFunction(()=>goldenAxe.audio.remasterMusic?.active,null,{timeout:60000});}
  assert((await pcm()).peak>.001);
  await page.evaluate(async()=>{const a=goldenAxe.audio;window.savedAudio={context:a.context,node:a.musicSource,start:a.trackStartedAt,track:a.currentTrack,buffer:a.remasterMusic?.buffer};await a.context.suspend();});
  await page.evaluate(()=>dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowRight',key:'ArrowRight'})));
  await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>goldenAxe.audio.context.state),'suspended');
  await page.locator('#game').focus();await page.keyboard.press('ArrowRight');
  await page.waitForFunction(()=>goldenAxe.audio.context.state==='running',null,{timeout:3000});
  assert(await page.evaluate(()=>{const a=goldenAxe.audio,s=savedAudio;return a.context===s.context&&a.musicSource===s.node&&a.trackStartedAt===s.start&&a.currentTrack===s.track&&a.remasterMusic?.buffer===s.buffer;}));
  const sample=await pcm();assert(sample.peak>.001);assert.equal(sample.muted,false);assert.equal(sample.master,1);report.checks.push({edition,sample,sameClockAndTrack:true,untrustedGestureIgnored:true});
 }
 await page.evaluate(()=>goldenAxe.pause());await page.waitForFunction(()=>goldenAxe.audio.context.state==='suspended');await page.keyboard.press('ArrowRight');await page.waitForTimeout(100);assert(await page.evaluate(()=>goldenAxe.paused&&goldenAxe.audio.paused&&goldenAxe.audio.context.state==='suspended'));report.checks.push({explicitPausePreserved:true});
 await page.evaluate(()=>goldenAxe.audio.dispose());assert.equal(await page.evaluate(()=>goldenAxe.audio.resumeAfterInterruption()),false);report.checks.push({terminalDisposePreserved:true});
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(error){report.failure=String(error.stack||error);throw error;}finally{await browser.close();report.browserClosed=true;report.audioClosed=true;await writeFile(resolve(out,'checks.json'),JSON.stringify(report,null,2)+'\n');}
console.log('PASS',report.checks.length,'audio interruption checks');
