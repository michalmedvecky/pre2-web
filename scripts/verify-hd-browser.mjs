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
   const pixels=r.ctx.getImageData(0,176*4,1280,24*4).data;if(hash(pixels)===hash(hud))throw Error('HUD remained native');
   // High-resolution details must exist inside a single native 4x4 pixel block.
   let detail=false;for(let y=0;y<96;y+=4)for(let x=0;x<1280;x+=4){const p=(y*1280+x)*4;for(let yy=0;yy<4;yy++)for(let xx=0;xx<4;xx++)if(pixels[((y+yy)*1280+x+xx)*4]!==pixels[p])detail=true;}if(!detail)throw Error('HUD is nearest-neighbor low resolution');
   stages++;}
  const w=q.world;r.setPalette(palette);r.hd.begin();r.frame.fill(0);r.sprite(313,100,100);r.blit(Uint8Array.of(4),1,1,95,90);let pixel=r.ctx.getImageData(95*4+2,90*4+2,1,1).data;if(pixel[0]!==palette[12]||pixel[1]!==palette[13]||pixel[2]!==palette[14])throw Error('foreground compositing order');
  for(const id of Object.keys(pack.manifest.sprites)){r.hd.begin();r.sprite(+id,160,136,true);r.sprite(+id|16384,220,136,false);}
  q.start(0);q.pause();const level=q.world.level,map=q.world.map,camera=q.world.camera;
  r.render(q.world);const initial=hash(r.ctx.getImageData(0,0,1280,704).data),hudBase=hash(r.ctx.getImageData(0,704,1280,96).data);
  const beforeMap=map.slice(),cacheBefore=new Map(r.hd.terrainCache);let changedCell=-1;
  for(let y=Math.floor(camera.y/16);y<Math.ceil((camera.y+176)/16)&&changedCell<0;y++)for(let x=Math.floor(camera.x/16);x<Math.ceil((camera.x+320)/16);x++){const i=y*256+x;if(level.lookup[map[i]]!==256){changedCell=i;break;}}
  if(changedCell<0)throw Error('no visible terrain to mutate');const empty=level.lookup.findIndex(v=>v===256);map[changedCell]=empty;r.render(q.world);
  if(initial===hash(r.ctx.getImageData(0,0,1280,704).data))throw Error('changed terrain not redrawn');if([...r.hd.terrainCache].every(([key,value])=>value===cacheBefore.get(key)))throw Error('stale terrain cache');map.set(beforeMap);r.render(q.world);if(initial!==hash(r.ctx.getImageData(0,0,1280,704).data))throw Error('terrain restoration mismatch');
  q.world.health=1;q.world.lives=7;q.world.score=12345;q.world.inventory=31;r.render(q.world);const changedHud=hash(r.ctx.getImageData(0,704,1280,96).data);if(changedHud===hudBase)throw Error('HUD values not redrawn');
  const hudRegion=(x,width)=>hash(r.ctx.getImageData(x*4,185*4,width*4,12*4).data);
  const hearts=new Set();for(let health=0;health<=3;health++){q.world.health=health;r.render(q.world);hearts.add(hudRegion(200,48));}if(hearts.size!==4)throw Error('heart states not distinct');
  const lives=new Set();for(const value of [0,2,9]){q.world.lives=value;r.render(q.world);lives.add(hudRegion(40,16));}if(lives.size!==3)throw Error('lives states not distinct');
  const scores=new Set();for(const value of [0,12345,999999]){q.world.score=value;r.render(q.world);scores.add(hudRegion(72,112));}if(scores.size!==3)throw Error('score states not distinct');
  q.world.collectionFlash=1;q.world.frame=2;r.render(q.world);const blinkOff=hash(r.ctx.getImageData(256*4,704,64*4,96).data);q.world.frame=3;r.render(q.world);if(blinkOff===hash(r.ctx.getImageData(256*4,704,64*4,96).data))throw Error('BONUS flash not redrawn');
  // World-space cache reuse while scrolling; no allocation on every camera pixel.
  const cached=[...r.hd.terrainCache.values()];q.world.camera.x++;r.render(q.world);if(![...r.hd.terrainCache.values()].some(v=>cached.includes(v)))throw Error('terrain cache not reused');
  r.render(w);return {stages,frames:Object.keys(pack.manifest.sprites).length,tileFrames:Object.keys(pack.manifest.tiles||{}).length,backgrounds:Object.keys(pack.manifest.backgrounds||{}).length,hash:stateHash(w)};
  function stateHash(w){return w.stateHash();}
 });
 await page.keyboard.press('KeyH');await page.waitForFunction(()=>prehistorik.graphics==='original');assert.equal(await page.locator('#game').getAttribute('width'),'320');await page.keyboard.press('KeyH');await page.waitForFunction(()=>prehistorik.graphics==='hd');await page.reload();await page.waitForFunction(()=>window.prehistorik?.graphics==='hd');
 await page.setViewportSize({width:390,height:844});assert.ok(await page.locator('#graphics-label').isVisible(),'mobile toggle label');assert.deepEqual(errors,[]);await context.close();
 const broken=await browser.newContext(),fallback=await broken.newPage();await fallback.route('**/assets/hd/**',r=>r.abort());await fallback.goto(url);await fallback.waitForFunction(()=>window.prehistorik);await fallback.locator('#graphics-button').click();await fallback.waitForFunction(()=>!document.querySelector('#graphics-button').disabled);assert.equal(await fallback.evaluate(()=>prehistorik.graphics),'original');assert.equal(await fallback.locator('#game').getAttribute('width'),'320');await broken.close();
 console.log(JSON.stringify({ok:true,...coverage,checks:['lazy loading','all-stage native raster parity','unchanged simulation','native HUD raster parity and true HD HUD detail','HUD health/score/lives/BONUS redraw','terrain mutation and restoration','world-space cache reuse','foreground order','all HD frames and mirrored hit flashes','mode toggle','persistence','mobile control','failed-load fallback']},null,2));
}finally{await browser.close();}
