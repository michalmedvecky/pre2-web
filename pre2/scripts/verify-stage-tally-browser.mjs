// Optional browser QA against the actual app. No DOS execution.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PRE2_PLAYWRIGHT_MODULE||'playwright'),browser=await chromium.launch({headless:true});
const output=process.env.PRE2_QA_OUTPUT;
try{
 const page=await browser.newPage({viewport:{width:1100,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.PRE2_QA_URL||'http://127.0.0.1:5775/?qa');await page.waitForFunction(()=>window.prehistorik);if(output)await mkdir(output,{recursive:true});
 await page.locator('#graphics-button').click();await page.waitForFunction(()=>prehistorik.graphics==='hd');
 const checks=[];
 for(const hd of [false,true]){
  const result=await page.evaluate(hd=>{
   const q=prehistorik;q.start(0);q.pause();const w=q.world,r=q.renderer,pack=r.hd?.pack||window.tallyQAPack;if(pack)window.tallyQAPack=pack;r.setHD(hd?window.tallyQAPack:null);
   for(const sprite of[110,111,128,129,130,131,132,133,134,135,136,137])w.scorePickup({sprite,x:0,y:0});const start=w.score,food=w.foodCounts.reduce((a,b)=>a+b,0),map=w.map.slice(),rng=[w.rng.a,w.rng.b,w.rng.c,w.rng.w];w.complete('special');const phases=[],frames={};
   const capture=()=>{const t=w.transition.tally;if(!phases.includes(t.phase)){phases.push(t.phase);r.render(w);frames[t.phase]=Array.from(r.frame);}if(t.phase==='tally'&&t.falling.length>=3&&!frames.falling){r.render(w);frames.falling=Array.from(r.frame);}};
   let ticks=0;while(!w.transition.ready&&ticks<2000){capture();q.step(1,{});ticks++;}capture();
   if(!w.transition.ready||w.score!==start*2)throw Error('tally did not credit exact ledger');if(w.map.some((v,i)=>v!==map[i])||JSON.stringify(rng)!==JSON.stringify([w.rng.a,w.rng.b,w.rng.c,w.rng.w]))throw Error('tally changed gameplay');
   if(!frames.falling||!phases.includes('leave')||!phases.includes('iris'))throw Error('missing presentation phase');
   // Retain a representative counting frame for the optional screenshot.
   q.start(0);q.pause();const sample=q.world;for(const sprite of[110,111,128,129,130,131,132,133,134,135])sample.scorePickup({sprite,x:0,y:0});sample.complete('special');for(let n=0;n<1000;n++){q.step(1,{});const t=sample.transition.tally;if(t.phase==='tally'&&t.falling.some(o=>o.y>65)){r.render(sample);break;}}
   document.querySelector('#dialog').hidden=true;return {mode:hd?'HD':'Original',ticks,food,score:start*2,phases,canvas:[r.canvas.width,r.canvas.height],hudCleared:frames.falling.slice(176*320).every(v=>v===0)};
  },hd);assert.ok(result.hudCleared);checks.push(result);if(output)await page.locator('#game').screenshot({path:`${output}/${hd?'hd':'original'}-tally.png`});
 }
 // Let the real RAF/controller reach the result card, then actually continue.
 const pendingSave=await page.evaluate(()=>{prehistorik.start(0);for(const sprite of[110,111])prehistorik.world.scorePickup({sprite,x:0,y:0});const expected=prehistorik.world.score*2;prehistorik.world.complete('special');const saved=JSON.parse(localStorage.getItem('prehistorik2-reconstruction-v1'));return {expected,score:saved.score,level:saved.level,persistence:saved.persistence};});assert.equal(pendingSave.score,pendingSave.expected);assert.equal(pendingSave.level,1);assert.equal(pendingSave.persistence,null);
 await page.waitForFunction(()=>prehistorik.state==='result',{},{timeout:25000});const score=await page.evaluate(()=>prehistorik.world.score);await page.getByRole('button',{name:'Keep going',exact:true}).click();await page.waitForFunction(()=>prehistorik.world.levelIndex===1&&prehistorik.state==='play');assert.equal(await page.evaluate(()=>prehistorik.world.score),score);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,checks,realRAFContinue:true},null,2));
}finally{await browser.close();}
