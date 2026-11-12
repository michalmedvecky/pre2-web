import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const {chromium}=await import(process.env.GA_PLAYWRIGHT_MODULE||'playwright');
const base=process.env.GA_TEST_URL||'http://127.0.0.1:5963/',out=resolve(process.env.GA_QA_OUTPUT||'/tmp/ga-level-cheat');await mkdir(out,{recursive:true});
const report={scope:'Actual host-muted Chrome, trusted keyboard/clicks and post-master music PCM. Constructor/LEVEL scenes disable stage-script execution and remove non-player actors to isolate input/audio, without editing HP, positions or RNG. No complete combat/native DOS or physical Safari claim.',checks:[],samples:[],errors:[]};
const browser=await chromium.launch({headless:true,...(process.env.GA_CHROME_PATH?{executablePath:process.env.GA_CHROME_PATH}:{}),args:['--mute-audio']});
async function setup(mode,players=2,beforeInput=null){
 const c=await browser.newContext({viewport:{width:1280,height:900}}),p=await c.newPage();p.on('pageerror',e=>report.errors.push(String(e)));
 if(beforeInput)await p.route('**/js/input.js',r=>r.fulfill({status:200,contentType:'text/javascript',body:beforeInput}));
 await p.addInitScript(mode=>localStorage.setItem('ga.graphics',mode),mode);await p.goto(base);await p.waitForFunction(()=>window.goldenAxe);
 await p.locator('#start').click();await p.waitForFunction(()=>goldenAxe.sequence?.kind==='title'&&goldenAxe.audio.musicSource);await p.locator('#game').focus();await p.keyboard.press('Space');await p.waitForFunction(()=>!goldenAxe.sequence&&!goldenAxe.started);
 await p.evaluate(players=>{const g=goldenAxe;Object.assign(g.selection,{players,character:'dwarf',character2:'hero'});g.launch();},players);
 await p.waitForFunction(()=>goldenAxe.started);await p.evaluate(()=>goldenAxe.jumpToLevel(0));await quiet(p);await stable(p,'stage1');
 await p.evaluate(()=>{const g=goldenAxe;g.audio.setEffectsEnabled(false);window.magicStarts=[];const emit=g.simulation.emitEvents.bind(g.simulation);g.simulation.emitEvents=(...events)=>{magicStarts.push(...events.filter(e=>e.kind==='magic-start'));return emit(...events);};});
 return{c,p};
}
async function quiet(p){await p.evaluate(()=>{const s=goldenAxe.simulation;s.script=[];s.scriptWait=null;s.runScript=()=>{};s.state.entities=s.state.players;});}
async function stable(p,track){
 await p.waitForFunction(track=>goldenAxe.audio.currentTrack===track&&Number.isFinite(goldenAxe.audio.trackStartedAt)&&!goldenAxe.paused&&!goldenAxe.sequence&&!goldenAxe.hdLoading.waiting&&goldenAxe.simulation.state.tick>2&&goldenAxe.audio.context.state==='running',track,{timeout:60000});
 const t=await p.evaluate(()=>goldenAxe.audio.context.currentTime);await p.waitForFunction(t=>goldenAxe.audio.context.currentTime>t+.06,t,{timeout:10000});
 await p.waitForFunction(()=>goldenAxe.audio.getMusicEditionStatus().effective==='remaster',null,{timeout:60000});
}
async function music(p,label){
 const sample=await p.evaluate(async label=>{const a=goldenAxe.audio,c=a.context,an=c.createAnalyser(),sink=c.createGain();an.fftSize=2048;sink.gain.value=0;a.master.connect(an);an.connect(sink);sink.connect(c.destination);const t=c.currentTime;let peak=0;try{for(let i=0;i<16;i++){await new Promise(r=>setTimeout(r,50));const x=new Float32Array(an.fftSize);an.getFloatTimeDomainData(x);for(const n of x){if(!Number.isFinite(n))throw Error('Non-finite PCM');peak=Math.max(peak,Math.abs(n));}}return{label,peak,timeBefore:t,timeAfter:c.currentTime,context:c.state,track:a.currentTrack,edition:a.getMusicEditionStatus(),muted:a.muted,master:a.master.gain.value};}finally{a.master.disconnect(an);an.disconnect();sink.disconnect();}},label);
 assert(sample.peak>.005,JSON.stringify(sample));assert(sample.timeAfter>sample.timeBefore+.5);assert.equal(sample.context,'running');assert.equal(sample.muted,false);assert.equal(sample.master,1);report.samples.push(sample);
}
async function level(p,index,delay=150){await p.locator('#game').focus();await p.keyboard.type('level',{delay});await p.waitForFunction(()=>goldenAxe.levelOverlay.isOpen);await p.locator(`[data-level-index="${index}"]`).click();await quiet(p);await stable(p,index===0?'stage1':index===1?'stage2':index===2?'stage3':'rd4');}
try{
 if(process.env.GA_BEFORE_INPUT){
  const before=await readFile(process.env.GA_BEFORE_INPUT,'utf8');const{c,p}=await setup('original',1,before);await p.locator('#game').focus();await p.keyboard.press('l');await p.waitForFunction(()=>!!goldenAxe.simulation.magic,null,{timeout:500});
  report.negativeControl={scope:'Frozen original Input module only; confirms the initial L magic edge, not old app/audio behavior.',sha256:createHash('sha256').update(before).digest('hex'),magicStarts:await p.evaluate(()=>magicStarts.length)};await p.evaluate(()=>goldenAxe.audio.dispose());await c.close();
 }
 for(const graphics of['original','hd']){
  const{c,p}=await setup(graphics);report.build=await p.evaluate(async()=>await(await fetch('./build.json',{cache:'no-store'})).json());
  await p.waitForFunction(()=>goldenAxe.simulation.state.players.every(p=>p.state===0&&p.z===0&&p.vz===0));
  const before=await p.evaluate(()=>({pots:goldenAxe.simulation.state.player.magicPots,p2:{x:goldenAxe.simulation.state.players[1].x,y:goldenAxe.simulation.state.players[1].y}}));
  await p.evaluate(()=>{window.keys=[];keys.push(['INITIAL',performance.now(),!!goldenAxe.simulation.magic,magicStarts.length]);window.addEventListener('keydown',e=>keys.push([e.key,performance.now(),goldenAxe.input.typedCheats.word]),true);const t=goldenAxe.input.typedCheats;const f=t.flush.bind(t);t.flush=()=>{keys.push(['FLUSH',performance.now(),t.word]);return f();};});await p.locator('#game').focus();await p.keyboard.type('level',{delay:200});await p.waitForFunction(()=>goldenAxe.levelOverlay.isOpen);
  const typed=await p.evaluate(()=>({pots:goldenAxe.simulation.state.player.magicPots,magic:!!goldenAxe.simulation.magic,starts:magicStarts.length,p2:{x:goldenAxe.simulation.state.players[1].x,y:goldenAxe.simulation.state.players[1].y},queued:[...goldenAxe.input.pendingKeys]}));
  report.typingDebug={graphics,before,typed,keys:await p.evaluate(()=>keys)};assert.equal(typed.pots,before.pots);assert.equal(typed.magic,false);assert.equal(typed.starts,0);assert.deepEqual(typed.p2,before.p2);assert.deepEqual(typed.queued,[]);report.checks.push(graphics+': 200ms LEVEL consumes no potion and leaks no E/V input to P2');
  await p.locator('[data-level-index="1"]').click();await quiet(p);await stable(p,'stage2');await music(p,graphics+' LEVEL to stage2');
  await level(p,2,100);await music(p,graphics+' LEVEL to stage3');
  await level(p,0,200);await music(p,graphics+' LEVEL back to stage1');report.checks.push(graphics+': repeated trusted stage selection restores advancing music clock and real PCM');
  await p.locator('#pause').click();await p.waitForFunction(()=>goldenAxe.paused&&goldenAxe.audio.context.state==='suspended');const clock=await p.evaluate(()=>goldenAxe.audio.context.currentTime);
  await p.keyboard.type('LEVEL',{delay:100});await p.waitForFunction(()=>goldenAxe.levelOverlay.isOpen);await p.locator('[data-level-close]').click();await p.waitForTimeout(150);assert(await p.evaluate(t=>goldenAxe.paused&&goldenAxe.audio.paused&&goldenAxe.audio.context.currentTime===t,clock));await p.locator('#resume').click();await stable(p,'stage1');await music(p,graphics+' paused LEVEL cancel then Resume');report.checks.push(graphics+': paused LEVEL cancellation preserves pause and Resume restores music');
  await p.evaluate(()=>{magicStarts=[];});await p.locator('#game').focus();await p.keyboard.down('l');await p.waitForTimeout(150);assert.equal(await p.evaluate(()=>magicStarts.length),0);await p.waitForFunction(()=>magicStarts.length===1,null,{timeout:1000});await p.waitForTimeout(400);assert.equal(await p.evaluate(()=>magicStarts.length),1);await p.keyboard.up('l');report.checks.push(graphics+': standalone L waits briefly then casts once');
  await level(p,0);await p.evaluate(()=>{magicStarts=[];});await p.keyboard.down('l');await p.waitForTimeout(50);await p.keyboard.press('Space');await p.waitForTimeout(400);await p.keyboard.up('l');assert.equal(await p.evaluate(()=>magicStarts.length),0);await p.keyboard.press('Space');await stable(p,'stage1');await p.waitForTimeout(200);assert.equal(await p.evaluate(()=>magicStarts.length),0);report.checks.push(graphics+': pause cancels a pending L instead of replaying magic on return');
  await p.keyboard.down('l');await p.waitForTimeout(40);const t=Date.now();await p.keyboard.down('ShiftRight');await p.waitForFunction(()=>magicStarts.length===1,null,{timeout:300});report.rightShiftLatencyMs=Date.now()-t;await p.keyboard.up('ShiftRight');await p.keyboard.up('l');await p.waitForTimeout(400);assert.equal(await p.evaluate(()=>magicStarts.length),1);report.checks.push(graphics+': native Right Shift casts immediately and cancels deferred L');
  await p.evaluate(()=>goldenAxe.audio.dispose());await c.close();
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(error){report.failure=String(error.stack||error);throw error;}finally{await browser.close();report.browserClosed=true;report.audioClosed=true;await writeFile(resolve(out,'checks.json'),JSON.stringify(report,null,2)+'\n');}
console.log('PASS',report.checks.length,'LEVEL input/music checks;',report.samples.length,'PCM windows');
