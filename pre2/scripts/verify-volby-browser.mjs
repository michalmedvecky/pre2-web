import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.PRE2_PLAYWRIGHT_MODULE||'playwright');
const out=process.env.PRE2_QA_OUT||'art/volby-sprites-v1/review';const qaURL=process.env.PRE2_QA_URL||'http://127.0.0.1:5776/?qa';await mkdir(out,{recursive:true});const report={};
const snap=async(p,name)=>{const u=await p.locator('#game').evaluate(c=>c.toDataURL());await writeFile(`${out}/${name}.png`,Buffer.from(u.split(',')[1],'base64'));};
for(const [name,engine]of Object.entries({chromium,webkit})){
 if(process.env.PRE2_ENGINES&&!process.env.PRE2_ENGINES.split(',').includes(name))continue;
 const browser=await engine.launch({headless:true,...(name==='chromium'&&process.env.PRE2_CHROMIUM_EXECUTABLE?{executablePath:process.env.PRE2_CHROMIUM_EXECUTABLE}:{}),args:['--mute-audio']});
 try{
  const p=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],requests=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.url().includes('/assets/volby/'))requests.push(r.url());});
  await p.goto(qaURL);await p.waitForFunction(()=>window.prehistorik);
  assert.equal(requests.length,0);
  await p.evaluate(async()=>{const q=prehistorik;q.start(0,true);await q.renderer.hd.prepareWorld(q.assets,q.world);});await p.waitForFunction(()=>prehistorik.state==='play');
  await p.keyboard.type('volby');await p.waitForFunction(()=>prehistorik.world.volbyActive);
  await p.evaluate(()=>prehistorik.pause());
  const setup=await p.evaluate(()=>{
   const q=prehistorik,w=q.world;w.godMode=true;w.teleportPlayer(1550,528);w.player.grounded=true;w.player.vx=w.player.vy=0;w.player.invulnerable=0;w.camera={x:1408,y:400};
   w.definitions=w.definitions.filter(d=>d.type===9||d.sprite===397);w.actors=[];for(const d of w.definitions)d.active=false;w.spawnActors();
   const bear=w.actors.find(a=>a.type===9),cat=w.actors.find(a=>a.def.sprite===397);bear.x=1470;cat.x=1630;bear.vx=cat.vx=0;bear.y=cat.y=528;bear.face=1;cat.face=-1;
   const art=q.renderer.volby,draw=art.draw.bind(art);art.calls=[];art.draw=(...args)=>{art.calls.push(args.slice(1,3));return draw(...args);};q.renderer.render(w);
   return {calls:art.calls,muted:q.audio.muted,actorCount:w.actors.length};
  });
  assert.ok(setup.calls.some(c=>c[0]==='hero'));assert.ok(setup.calls.some(c=>c[0]==='bear-replacement'));assert.ok(setup.calls.some(c=>c[0]==='tiger-replacement'));
  await snap(p,`${name}-hd`);
  const weapons=await p.evaluate(()=>{const q=prehistorik,w=q.world,out=[];for(const weapon of [1,2,3]){w.equipWeapon(weapon);q.step(3,{attack:true});q.renderer.volby.calls=[];q.renderer.render(w);out.push({weapon,body:q.renderer.volby.calls.some(c=>c[0]==='hero-unarmed'),nativeWeapon:!!w.playerWeapon});}return out;});
  assert.ok(weapons.every(w=>w.body&&w.nativeWeapon));await snap(p,`${name}-weapon`);
  const combat=await p.evaluate(()=>{const q=prehistorik,w=q.world,a=w.actors.find(a=>a.type===9);a.hp=15;const b=w.spriteBounds(a);w.projectiles=[{contact:true,sprite:58,x:(b.left+b.right)/2,y:b.bottom-5,ttl:3,damage:30,face:1}];w.checkEnemyAttacks();q.renderer.volby.calls=[];q.renderer.render(w);return{dead:a.state===255,defeat:q.renderer.volby.calls.some(c=>c[0]==='bear-replacement'&&c[1]==='defeat')};});assert.deepEqual(combat,{dead:true,defeat:true});
  await p.evaluate(async()=>{await prehistorik.setGraphics('original');prehistorik.world.equipWeapon(0);prehistorik.step(5,{});});await snap(p,`${name}-sd`);
  const stable=await p.evaluate(()=>{const q=prehistorik,w=q.world,before=JSON.stringify(w.snapshot());q.renderer.render(w);return before===JSON.stringify(w.snapshot());});assert.equal(stable,true);
  await p.evaluate(()=>prehistorik.pause());await p.keyboard.type('volby');await p.waitForFunction(()=>!prehistorik.world.volbyActive);
  await p.keyboard.type('volby');await p.waitForFunction(()=>prehistorik.world.volbyActive);
  await p.evaluate(()=>{prehistorik.start(1);});assert.equal(await p.evaluate(()=>prehistorik.world.volbyActive),true);
  await p.keyboard.type('orava');await p.waitForFunction(()=>prehistorik.world.oravaActive&&!prehistorik.world.volbyActive);
  await p.keyboard.type('volby');await p.waitForFunction(()=>prehistorik.world.volbyActive&&!prehistorik.world.oravaActive&&prehistorik.audio.musicMode==='original');
  await p.evaluate(()=>prehistorik.pause());await p.getByRole('button',{name:'Leave VOLBY',exact:true}).click();await p.waitForFunction(()=>!prehistorik.world.volbyActive);
  await p.reload();await p.waitForFunction(()=>window.prehistorik);await p.evaluate(()=>prehistorik.start(0));assert.equal(await p.evaluate(()=>!!prehistorik.world.volbyActive),false);
  assert.deepEqual(errors,[]);report[name]={weapons,combat,actorCount:setup.actorCount,hd:true,sd:true,reversible:true,stagePersistence:true,oravaSwitch:true,pauseControl:true,renderDoesNotMutateWorld:stable,defaultOff:true,errors};console.log(name,'VOLBY passed');
 }finally{await browser.close();}
}
const mobile=await chromium.launch({headless:true,...(process.env.PRE2_CHROMIUM_EXECUTABLE?{executablePath:process.env.PRE2_CHROMIUM_EXECUTABLE}:{}),args:['--mute-audio']});try{
 const p=await mobile.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(qaURL);await p.waitForFunction(()=>window.prehistorik);
 await p.evaluate(async()=>{const q=prehistorik;q.start(0);await q.renderer.hd.prepareWorld(q.assets,q.world);});await p.waitForFunction(()=>prehistorik.state==='play');
 await p.locator('#touch-pause').tap();await p.getByRole('button',{name:'VOLBY characters',exact:true}).tap();await p.waitForFunction(()=>prehistorik.world.volbyActive);
 const bonus=await p.evaluate(()=>{const q=prehistorik,w=q.world;q.pause();w.godMode=true;w.teleportPlayer(4068,560);for(let i=0;i<400&&w.blocks.find(b=>b.index===40).active;i++)q.step(1,{down:true,attack:true});return!w.blocks.find(b=>b.index===40).active;});assert.equal(bonus,true);
 await snap(p,'mobile-down-bonus');assert.deepEqual(errors,[]);report.mobile={touchPauseToggle:true,downwardBonus:bonus,errors};
}finally{await mobile.close();}
await writeFile(`${out}/browser.json`,JSON.stringify(report,null,2)+'\n');
