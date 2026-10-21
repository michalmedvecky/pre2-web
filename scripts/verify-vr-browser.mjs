import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PRE2_PLAYWRIGHT_MODULE||'playwright');
const base=process.env.PRE2_VR_URL||'http://127.0.0.1:5776/vr/',out=process.env.PRE2_VR_EVIDENCE||'/private/tmp/pre2-vr-browser';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-webgl','--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(base+'?qa&pilot=1');await page.waitForFunction(()=>window.questPilot?.snapshot().ready);await page.screenshot({path:out+'/menu.png'});await page.click('#desktop');await page.waitForTimeout(100);await page.screenshot({path:out+'/opening.png'});
 const state=()=>page.evaluate(()=>questPilot.snapshot());
 const move=async x=>{await page.keyboard.down('KeyW');try{await page.waitForFunction(x=>questPilot.snapshot().player.x>=x,x,{timeout:15000});}finally{await page.keyboard.up('KeyW');}};
 await move(9.8);
 // Follow a patrolling bear to melee reach, using normal desktop movement and a real animated club sweep.
 for(let tries=0;tries<8&&(await state()).bear.alive;tries++){
  const s=await state(),distance=s.bear.x-s.player.x;if(distance>1.15)await move(Math.min(s.bear.x-1.05,13.7));
  await page.keyboard.press('KeyF');await page.waitForTimeout(450);
 }
 const combat=await state();assert.equal(combat.bear.alive,false,'actual animated desktop club must defeat bear');assert.equal(combat.score,500);await page.screenshot({path:out+'/bear-defeated.png'});
 console.log("combat",JSON.stringify(combat));await move(17);await page.keyboard.down('KeyW');await page.keyboard.press('Space');await page.waitForFunction(()=>questPilot.snapshot().player.x>20,null,{timeout:8000});await page.keyboard.up('KeyW');
 await move(22.2);const checkpoint=await state();assert.equal(checkpoint.checkpoint.x,22);
 // Deliberately walk into the gap, then verify automatic return and working input.
 await page.keyboard.down('KeyW');await page.waitForFunction(()=>questPilot.snapshot().rescue>0,null,{timeout:8000});await page.keyboard.up('KeyW');await page.waitForFunction(()=>{const s=questPilot.snapshot();return s.rescue===0&&s.player.x<23;},null,{timeout:4000});
 const rescue=await state();assert.equal(rescue.player.y,0);assert.equal(rescue.player.vy,0);assert.equal(rescue.bear.alive,false);assert.equal(rescue.score,500);
 await move(24.7);await page.keyboard.down('KeyW');await page.keyboard.press('Space');await page.waitForFunction(()=>questPilot.snapshot().complete,null,{timeout:9000});await page.keyboard.up('KeyW');const complete=await state();await page.screenshot({path:out+'/complete.png'});
 await page.keyboard.press('Escape');const before=await state();await page.waitForTimeout(150);assert.deepEqual((await state()).player,before.player);await page.click('#desktop');
 await page.keyboard.press('KeyR');await page.waitForTimeout(80);const restart=await state();assert.equal(restart.score,0);assert.equal(restart.player.health,3);assert.equal(restart.bear.alive,true);
 for(let i=0;i<6;i++)await page.keyboard.press('KeyE');await page.screenshot({path:out+'/rear-360.png'});
 assert.deepEqual(errors,[]);const report={base,combat,checkpoint,rescue,complete,restart,errors,hardware:'desktop software WebGL only; actual Quest tracking, haptics, comfort and stereo pending'};await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,render:complete.renderer,complete:complete.complete,checkpoint:rescue.checkpoint,output:out}));
}catch(e){for(const p of browser.contexts().flatMap(c=>c.pages())){console.log('failure state',await p.evaluate(()=>window.questPilot?.snapshot()).catch(()=>null));await p.screenshot({path:out+'/failure.png'}).catch(()=>{});}throw e;}finally{await browser.close();}
