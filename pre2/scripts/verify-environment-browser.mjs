// Optional browser integration. Start the local server, then run this script.
import assert from 'node:assert/strict';
import{readFile,writeFile,mkdir}from'node:fs/promises';
const {chromium}=await import(process.env.PRE2_PLAYWRIGHT_MODULE||'playwright');
const output=process.env.PRE2_ENV_REVIEW_DIR; if(output)await mkdir(output,{recursive:true});
const fixtures=JSON.parse(await readFile(new URL('../tests/fixtures/playthroughs.json',import.meta.url),'utf8'));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.PRE2_QA_URL||'http://127.0.0.1:5775/?qa');await page.waitForFunction(()=>window.prehistorik);await page.evaluate(()=>{prehistorik.start();prehistorik.pause();});await page.locator('#graphics-button').click();await page.waitForFunction(()=>prehistorik.graphics==='hd');
 const result=await page.evaluate(async fixtures=>{
  const q=prehistorik,r=q.renderer,pack=r.hd.pack,{updateMovingBlocks,updateWeather}=await import('./js/environment.js'),hash=a=>{let h=2166136261;for(const b of a)h=Math.imul(h^b,16777619);return h>>>0;};let stages=0,regions=0;
  function parity(w){const before=w.stateHash();r.setHD(null);r.render(w);const native=hash(r.frame);r.setHD(pack);r.render(w);if(hash(r.frame)!==native)throw Error('Original/HD parity '+w.level.id);if(w.stateHash()!==before)throw Error('renderer changed world');}
  for(let i=0;i<16;i++){q.start(i);q.pause();for(let phase=0;phase<3;phase++){q.world.tileAnimationPhase=phase;parity(q.world);}stages++;}
  for(const index of[8,13])for(const d of q.assets.game.levels[index].movingBlocks.filter(b=>b.active)){
   q.start(index);q.pause();const w=q.world,b=w.movingBlocks.find(b=>b.index===d.index);w.movingBlocks=[b];w.camera={x:Math.max(0,(b.pos&255)*16-96),y:Math.max(0,(b.pos>>8)*16-96)};parity(w);const before=hash(r.frame),steps=b.remaining;b.trigger=65534;
   for(let n=0;n<steps;n++){w.frame=(n+1)*4+1;updateMovingBlocks(w);parity(w);}if(b.remaining!==0||b.trigger!==65535)throw Error('region unfinished');if(hash(r.frame)===before)throw Error('region did not redraw');regions++;
  }
  q.start(15);q.pause();const rain=q.world;for(let frame=1;frame<=1400;frame++){rain.frame=frame;updateWeather(rain);}if(rain.weather!==119)throw Error('rain schedule');parity(rain);const wet=hash(r.frame);const points=rain.rainPoints;rain.rainPoints=[];r.render(rain);if(hash(r.frame)===wet)throw Error('rain invisible');rain.rainPoints=points;r.render(rain);
  const f=fixtures.branches.find(f=>f.level===13&&f.gates.length===7);q.start(f.level);q.pause();const w=q.world;w.toggleGodMode();let ticks=0;const gates=new Set(),native=w.checkGates;w.checkGates=function(){const pos=this.tilePos(this.player.x,this.player.y),x=this.player.x,y=this.player.y;native.call(this);if(x!==this.player.x||y!==this.player.y)gates.add(this.gates.find(g=>g.triggerTile===pos)?.index);};
  for(const[m,c]of f.rle)for(let n=0;n<c;n++){w.step({left:!!(m&1),right:!!(m&2),up:!!(m&4),down:!!(m&8),attack:!!(m&16)});ticks++;}for(const gate of f.gates)if(!gates.has(gate))throw Error('missing E gate '+gate);parity(w);
  return{stages,regions,phases:3,rainIntensity:rain.weather,secretRoomReplay:{ticks,gates:[...gates].sort((a,b)=>a-b)}};
 },fixtures);
 if(output){for(const mode of['original','hd']){
  const movingPNG=await page.evaluate(async mode=>{const q=prehistorik,{updateMovingBlocks,updateWeather}=await import('./js/environment.js');q.start(13);q.pause();const w=q.world,b=w.movingBlocks.find(b=>b.index===14);w.movingBlocks=[b];b.trigger=65534;for(let n=0;n<6;n++){w.frame=n*4+1;updateMovingBlocks(w);}w.camera={x:2704,y:96};q.environmentReviewPack=q.renderer.hd?.pack||q.environmentReviewPack;q.renderer.setHD(mode==='hd'?q.environmentReviewPack:null);q.renderer.render(w);return q.renderer.canvas.toDataURL();},mode);await writeFile(output+'/moving-E-'+mode+'.png',Buffer.from(movingPNG.split(',')[1],'base64'));
  const rainPNG=await page.evaluate(async()=>{const q=prehistorik,{updateWeather}=await import('./js/environment.js');q.start(15);q.pause();const w=q.world;for(let n=1;n<=1400;n++){w.frame=n;updateWeather(w);}q.renderer.render(w);return q.renderer.canvas.toDataURL();});await writeFile(output+'/rain-G-'+mode+'.png',Buffer.from(rainPNG.split(',')[1],'base64'));
 }}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,...result},null,2));
}finally{await browser.close();}
