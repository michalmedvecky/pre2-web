// Optional integration check: run npm start first, then use an installed Playwright.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PRE2_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true}),url=process.env.PRE2_QA_URL||'http://127.0.0.1:5775/?qa';
try{
 const context=await browser.newContext(),page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));await page.goto(url);await page.waitForFunction(()=>window.prehistorik);assert.equal(requests.filter(u=>u.includes('/assets/hd/')).length,0,'HD assets must be lazy');
 await page.evaluate(()=>{prehistorik.start();prehistorik.pause();});
 const before=await page.evaluate(()=>prehistorik.world.stateHash());await page.locator('#graphics-button').click();await page.waitForFunction(()=>prehistorik.graphics==='hd');assert.equal(await page.evaluate(()=>prehistorik.world.stateHash()),before,'toggle must preserve paused simulation');assert.equal(await page.locator('#game').getAttribute('width'),'1280');
 const coverage=await page.evaluate(()=>{
  const q=prehistorik,r=q.renderer,pack=r.hd.pack,palette=q.assets.game.palettes[0].rgb8_scaled,hash=a=>{let h=2166136261;for(const v of a)h=Math.imul(h^v,16777619);return h>>>0;};
  let stages=0;
  for(let i=0;i<16;i++){q.start(i);q.pause();q.world.toggleSecretHints();const state=q.world.stateHash();r.setHD(null);r.render(q.world);const native=hash(r.frame),hud=r.imageData.data.slice(176*320*4);r.setHD(pack);r.render(q.world);if(native!==hash(r.frame))throw Error('native raster changed '+i);if(state!==q.world.stateHash())throw Error('renderer changed simulation '+i);
   const pixels=r.ctx.getImageData(0,176*4,1280,24*4).data;for(let y=0;y<24;y++)for(let x=0;x<320;x++)for(let k=0;k<4;k++){const a=pixels[((y*4+2)*1280+x*4+2)*4+k],b=hud[(y*320+x)*4+k];if(a!==b)throw Error(`HUD mismatch stage${i} at${x},${y},${k}: ${a}/${b}`);}stages++;}
  const w=q.world;r.setPalette(palette);r.hd.begin();r.frame.fill(0);r.sprite(313,100,100);r.blit(Uint8Array.of(4),1,1,95,90);let pixel=r.ctx.getImageData(95*4+2,90*4+2,1,1).data;if(pixel[0]!==palette[12]||pixel[1]!==palette[13]||pixel[2]!==palette[14])throw Error('foreground compositing order');
  for(const id of Object.keys(pack.manifest.sprites)){r.hd.begin();r.sprite(+id,160,136,true);r.sprite(+id|16384,220,136,false);}
  r.render(w);return {stages,frames:Object.keys(pack.manifest.sprites).length,tileFrames:Object.keys(pack.manifest.tiles||{}).length,backgrounds:Object.keys(pack.manifest.backgrounds||{}).length,hash:stateHash(w)};
  function stateHash(w){return w.stateHash();}
 });
 await page.keyboard.press('KeyH');await page.waitForFunction(()=>prehistorik.graphics==='original');assert.equal(await page.locator('#game').getAttribute('width'),'320');await page.keyboard.press('KeyH');await page.waitForFunction(()=>prehistorik.graphics==='hd');await page.reload();await page.waitForFunction(()=>window.prehistorik?.graphics==='hd');
 await page.setViewportSize({width:390,height:844});assert.ok(await page.locator('#graphics-label').isVisible(),'mobile toggle label');assert.deepEqual(errors,[]);await context.close();
 const broken=await browser.newContext(),fallback=await broken.newPage();await fallback.route('**/assets/hd/**',r=>r.abort());await fallback.goto(url);await fallback.waitForFunction(()=>window.prehistorik);await fallback.locator('#graphics-button').click();await fallback.waitForFunction(()=>!document.querySelector('#graphics-button').disabled);assert.equal(await fallback.evaluate(()=>prehistorik.graphics),'original');assert.equal(await fallback.locator('#game').getAttribute('width'),'320');await broken.close();
 console.log(JSON.stringify({ok:true,...coverage,checks:['lazy loading','all-stage native raster parity','unchanged simulation','HUD clipping','foreground order','all HD frames and mirrored hit flashes','mode toggle','persistence','mobile control','failed-load fallback']},null,2));
}finally{await browser.close();}
