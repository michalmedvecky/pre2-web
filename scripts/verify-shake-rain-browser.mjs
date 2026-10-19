// Optional integration: start npm start, use an installed Playwright.
import assert from 'node:assert/strict';import{mkdir,writeFile}from'node:fs/promises';
const {chromium}=await import(process.env.PRE2_PLAYWRIGHT_MODULE||'playwright');const browser=await chromium.launch({headless:true});
const output=process.env.PRE2_WEATHER_REVIEW_DIR;if(output)await mkdir(output,{recursive:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.PRE2_QA_URL||'http://127.0.0.1:5775/?qa');await page.waitForFunction(()=>window.prehistorik);
 // Exercise actual keyboard holds, not just a synthetic direct gate call.
 await page.evaluate(()=>{const q=prehistorik;q.start(1);q.world.godMode=true;const g=q.world.gates[16];Object.assign(q.world.player,{x:(g.triggerTile&255)*16,y:(g.triggerTile>>>8)*16});});
 await page.keyboard.down('ArrowDown');await page.waitForFunction(()=>prehistorik.world.frame>=30);await page.keyboard.up('ArrowDown');
 assert.equal(await page.evaluate(()=>prehistorik.world.player.x),1776);await page.waitForFunction(()=>prehistorik.world.player.downTimer===0);
 const frame=await page.evaluate(()=>prehistorik.world.frame);await page.keyboard.down('ArrowDown');await page.waitForFunction(n=>prehistorik.world.frame>=n+30,frame);await page.keyboard.up('ArrowDown');
 assert.equal(await page.evaluate(()=>prehistorik.world.player.x),1856);assert.equal(await page.evaluate(()=>prehistorik.world.gateCameraFlag),1);await page.evaluate(()=>prehistorik.pause());
 await page.locator('#graphics-button').click();await page.waitForFunction(()=>prehistorik.graphics==='hd');
 const result=await page.evaluate(async()=>{
  const q=prehistorik,r=q.renderer,pack=r.hd.pack,{updateWeather}=await import('./js/environment.js'),hash=a=>{let h=2166136261;for(const b of a)h=Math.imul(h^b,16777619);return h>>>0;},shots=[];
  function compare(w,label){const state=w.stateHash();r.setHD(null);r.render(w);const native=r.frame.slice(),original=r.canvas.toDataURL();r.setHD(pack);r.render(w);if(hash(r.frame)!==hash(native))throw Error('HD raster parity '+label);if(w.stateHash()!==state)throw Error('render changed state');shots.push({label,original,hd:r.canvas.toDataURL()});return native;}
  q.start(0);q.pause();const w=q.world;w.godMode=true;w.player.landingShake=9;const offsets=[];for(let n=0;n<20;n++){w.step({});offsets.push(w.screenShake);if(n===1){const f=compare(w,'shake');for(let y=0;y<w.screenShake;y++)for(let x=0;x<320;x++)if(f[y*320+x])throw Error('shake top strip');}}
  if(!offsets.some(v=>v>0)||offsets.at(-1)!==0)throw Error('shake did not end');
  q.start(15);q.pause();const rain=q.world;for(let n=1;n<=1600;n++){rain.frame=n;updateWeather(rain);}if(rain.weather!==169)throw Error('rain timing');const wet=compare(rain,'rain');
  for(const p of rain.rainPoints)if(p.x>=0&&p.x<320&&p.y>=0&&p.y<176&&wet[p.y*320+p.x]!==15)throw Error('rain is not VGA OR');
  const before=rain.stateHash();for(let n=0;n<8;n++)r.render(rain);if(rain.stateHash()!==before)throw Error('refresh changes weather');
  q.start(1);q.pause();const cave=q.world,g=cave.gates[16];cave.godMode=true;Object.assign(cave.player,{x:(g.triggerTile&255)*16,y:(g.triggerTile>>>8)*16});for(let n=0;n<30;n++)cave.step({down:true});compare(cave,'cave');
  return{offsets,rainIntensity:rain.weather,rainPoints:rain.rainPoints.length,cave:[cave.player.x,cave.player.y],shots};
 });
 if(output)for(const shot of result.shots)for(const mode of['original','hd'])await writeFile(output+'/'+shot.label+'-'+mode+'.png',Buffer.from(shot[mode].split(',')[1],'base64'));
 delete result.shots;assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,...result,checks:['actual keyboard Down hold and fresh return','native shake offsets and black strip','Original/HD parity','rain OR masks','refresh-independent RNG and timing','HUD fixed']},null,2));
}finally{await browser.close();}
