// Conditional Stage2 encounter; legal semantic input batches, actual HD renderer.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const {chromium}=await import(process.env.GA_PLAYWRIGHT_MODULE||'playwright');
const base=process.env.GA_TEST_URL||'http://127.0.0.1:5962/';
const out=resolve(process.env.GA_QA_OUTPUT||'/tmp/ga-mount-escape');await mkdir(out,{recursive:true});
const fixture=JSON.parse(await readFile(new URL('./fixtures/stage2-mount-recovery.json',import.meta.url)));
const report={scope:fixture.scope+' Actual Chrome HD render, original palette commands9/17. No audio created. Optional pre-fix module must match the frozen original SHA.',checks:[],cases:[],errors:[]};
let before=null;
if(process.env.GA_MOUNT_BEFORE_MODULE){before=await readFile(process.env.GA_MOUNT_BEFORE_MODULE);assert.equal(createHash('sha256').update(before).digest('hex'),fixture.beforeModuleSHA256);}
const browser=await chromium.launch({headless:true,...(process.env.GA_CHROME_PATH?{executablePath:process.env.GA_CHROME_PATH}:{}),args:['--mute-audio']});
try{
 const page=await browser.newPage({viewport:{width:1000,height:700}});page.on('pageerror',e=>report.errors.push(String(e)));
 await page.route('**/__mount_escape_qa',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head><style>body{background:#10100f;color:#eee;font:16px Arial;margin:20px}canvas{width:960px;height:600px;display:block;image-rendering:auto}</style></head><body><p id="label"></p><canvas></canvas></body></html>'}));
 if(before)await page.route('**/js/simulation-before-mount.js',route=>route.fulfill({contentType:'text/javascript',body:before}));
 await page.goto(new URL('__mount_escape_qa',base).href);
 await page.evaluate(async()=>{const {loadAssets,Renderer}=await import('/js/renderer.js');window.qa={assets:await loadAssets()};qa.renderer=new Renderer(document.querySelector('canvas'),qa.assets,{graphicsMode:'hd'});});
 for(const version of before?['before','after']:['after']){
  const result=await page.evaluate(async({version,fixture})=>{
   const {Simulation}=await import(version==='before'?'/js/simulation-before-mount.js':'/js/simulation.js');
   const s=new Simulation({assets:qa.assets,...fixture.initial});s.script=[];s.scriptWait=null;s.scrollLimit=fixture.initial.scrollLimit;s.state.camera={...fixture.initial.camera};
   for(const command of[9,17]){const record=qa.assets.paletteCommandRecords?.[command],base=qa.assets.paletteRecords?.[record]?.base;if(Number.isInteger(record)){s.state.paletteRecords=s.state.paletteRecords.filter(id=>qa.assets.paletteRecords[id]?.base!==base);s.state.paletteRecords.push(record);}}
   const p=s.state.player;Object.assign(p,{...fixture.initial.player,level:s.tile(fixture.initial.player.x,fixture.initial.player.y).level});s.refresh(p);
   const r=s.createActor(fixture.initial.rider),m=s.createActor(fixture.initial.mount);s.state.entities=[p,r,m];
   const events=[];for(const row of fixture.inputs)for(let i=0;i<row.count;i++){s.step(row.input,1);events.push(...s.state.events.filter(e=>e.kind==='mount'||e.kind==='hit'));}
   const capture=async label=>{document.querySelector('#label').textContent=label;for(let i=0;i<30;i++){qa.renderer.render({...s.state,mode:s.mode});const pending=[...qa.assets.hd.pending.values(),...qa.assets.hd.palettePending.values()];if(!pending.length)break;await Promise.all(pending);}qa.renderer.render({...s.state,mode:s.mode});return{draw:structuredClone(qa.renderer.drawCoverage),png:qa.renderer.canvas.toDataURL()};};
   const atKnockoff={tick:s.state.tick,playerHP:p.health,riderHP:r.health,mount:{x:m.x,y:m.y,backward:m.backward,wait:m.nativeWait,riderID:m.riderID,removed:m.removed}},pictures=[];
   pictures.push(await capture(version+': normal combat has just dismounted the expired dragon'));
   let steps=0;for(;steps<200&&!m.removed;steps++)s.step({},1);
   const final={steps,tick:s.state.tick,camera:{...s.state.camera},mount:{x:m.x,y:m.y,backward:m.backward,wait:m.nativeWait,riderID:m.riderID,removed:m.removed,lifecycle:m.lifecycle}};
   pictures.push(await capture(version+': '+(m.removed?'dragon escaped and was cleaned up':'dragon remains trapped after200 more ticks')));
   return{version,events,atKnockoff,final,pictures};
  },{version,fixture});
  assert.equal(result.atKnockoff.tick,354);assert.equal(result.atKnockoff.playerHP,4);assert.equal(result.atKnockoff.mount.wait,0);assert.equal(result.atKnockoff.mount.riderID,null);assert.equal(result.atKnockoff.mount.backward,true);
  assert(result.events.some(e=>e.kind==='mount'));assert(result.events.some(e=>e.kind==='hit'));
  assert.equal(result.final.mount.removed,version==='after');if(version==='after'){assert.equal(result.final.mount.lifecycle,253);assert.equal(result.final.mount.backward,false);assert.equal(result.final.steps,40);}
  for(let i=0;i<result.pictures.length;i++){const picture=result.pictures[i];assert.equal(picture.draw.originalSprites,0);assert.equal(picture.draw.originalGlyphs,0);await writeFile(resolve(out,`${version}-${i}.png`),Buffer.from(picture.png.split(',')[1],'base64'));delete picture.png;}
  report.cases.push(result);report.checks.push(version+': conditional combat replay and HD rendering match expected mount lifecycle');
 }
 const metadata=await page.evaluate(async()=>await(await fetch('/build.json',{cache:'no-store'})).json());report.build=metadata;
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(error){report.failure=String(error.stack||error);throw error;}finally{await browser.close();report.browserClosed=true;report.audioCreated=false;await writeFile(resolve(out,'checks.json'),JSON.stringify(report,null,2)+'\n');}
console.log('PASS',report.cases.length,'mount escape browser cases');
