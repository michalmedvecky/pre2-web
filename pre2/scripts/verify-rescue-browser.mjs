// Optional integration: run the local server and use an installed Playwright.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PRE2_PLAYWRIGHT_MODULE||'playwright'),browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.PRE2_QA_URL||'http://127.0.0.1:5775/?qa');await page.waitForFunction(()=>window.prehistorik);await page.evaluate(()=>{prehistorik.start(1);prehistorik.pause();});
 await page.locator('#graphics-button').click();await page.waitForFunction(()=>prehistorik.graphics==='hd');
 const result=await page.evaluate(()=>{
  const q=prehistorik,r=q.renderer,pack=r.hd.pack,checks=[];
  for(const hd of[false,true]){
   q.start(1);q.pause();const w=q.world;w.toggleGodMode();const gate=w.gates[17];Object.assign(w.player,{x:(gate.triggerTile&255)*16,y:(gate.triggerTile>>>8)*16});q.step(1,{down:true});if(w.gateCameraFlag!==1)throw Error('fixture did not lock cave camera');
   const originalRescue=w.rescuePlayer;w.rescuePlayer=function(){const progress=[this.health,this.lives,this.score,this.weapon,this.inventory],map=this.map;originalRescue.call(this);if(progress.some((v,i)=>v!==[this.health,this.lives,this.score,this.weapon,this.inventory][i])||this.map!==map)throw Error('rescue lost live progress');};
   let rescues=0;const originalEvent=w.onEvent;w.onEvent=e=>{if(e.type==='rescue')rescues++;originalEvent(e);};
   const health=w.health,lives=w.lives,score=w.score;q.step(35,{right:true});if(rescues!==1||w.gateCameraFlag)throw Error('in-map offscreen fall did not recover');Object.assign(w.player,{y:w.level.height*16+33,vy:192,jumpLock:6});q.step(1,{});if(w.gateCameraFlag||w.player.jumpLock||w.player.platformGrip)throw Error('rescue retained control locks');
   q.step(90,{right:true});if(w.camera.x<=0||w.player.x-w.camera.x>208)throw Error('camera no longer follows');
   q.step(4,{});const y=w.player.y;q.step(1,{up:true});if(w.player.y>=y||w.player.vy>=0)throw Error('cannot jump after rescue');
   if(!w.godMode||w.health!==health||w.lives!==lives||w.score<score||w.transition||w.deathTimer)throw Error('rescue changed progress or entered death');
   r.setHD(hd?pack:null);const before=w.stateHash();r.render(w);if(w.stateHash()!==before)throw Error('render changed simulation');
   const sp=q.assets.game.sprites[w.player.sprite&8191],x=w.player.x-w.camera.x,yScreen=w.player.y-w.camera.y;if(x+sp.width<0||x-sp.width>320||yScreen<0||yScreen-sp.height>176)throw Error('player is offscreen');
   checks.push({mode:hd?'HD':'Original',camera:{...w.camera},player:{x:w.player.x,y:w.player.y},health,lives,jump:true,inMapRescues:rescues-1});
  }return checks;
 });assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,checks:result},null,2));
}finally{await browser.close();}
