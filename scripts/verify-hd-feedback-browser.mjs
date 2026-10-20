import assert from 'node:assert/strict';import{mkdir,writeFile}from'node:fs/promises';
const{chromium}=await import(process.env.PRE2_PLAYWRIGHT_MODULE||'playwright'),browser=await chromium.launch({headless:true}),out=process.env.PRE2_QA_OUTPUT;
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.PRE2_QA_URL||'http://127.0.0.1:5775/?qa');await page.waitForFunction(()=>window.prehistorik);await page.evaluate(()=>{prehistorik.start();prehistorik.step(20);prehistorik.pause();document.querySelector('#dialog').hidden=true;});await page.keyboard.press('KeyH');await page.waitForFunction(()=>prehistorik.graphics==='hd');if(out)await mkdir(out,{recursive:true});
 if(out)await page.locator('#game').screenshot({path:out+'/sharp-world-hd.png'});
 const checks=await page.evaluate(()=>{
  const q=prehistorik,r=q.renderer,w=q.world,pack=r.hd.pack,hash=a=>{let h=2166136261;for(const v of a)h=Math.imul(h^v,16777619);return h>>>0;};window.feedbackQAPack=pack;const initial=w.stateHash(),newIds=pack.manifest.extensions.itemsV5.ids,feedbackIds=pack.manifest.extensions.feedbackV5.spriteIds;
  const detail=(x,y,width,height)=>{const data=r.ctx.getImageData(x*4,y*4,width*4,height*4).data,W=width*4;let varied=0;for(let yy=0;yy<height*4;yy+=4)for(let xx=0;xx<width*4;xx+=4){const p=(yy*W+xx)*4;let different=false;for(let j=0;j<4;j++)for(let i=0;i<4;i++)for(let k=0;k<3;k++)if(data[((yy+j)*W+xx+i)*4+k]!==data[p+k])different=true;if(different)varied++;}return varied;};
  const clear=()=>{r.frame.fill(0);r.hd?.begin();};let all=0;
  for(const id of [...newIds,...feedbackIds]){clear();if(!r.hd.sprite(id,160,100,false,176,q.assets.game.sprites[id]))throw Error('native fallback '+id);if(!r.ctx.getImageData(0,0,1280,704).data.some((v,i)=>i%4!==3&&v))throw Error('empty HD sprite '+id);clear();r.sprite(id|32768,160,100);clear();r.sprite(id|16384,160,100);const data=r.ctx.getImageData(0,0,1280,704).data;for(let i=0;i<data.length;i+=4)if(data[i]!==data[i+1]||data[i]!==data[i+2])throw Error('colored hit flash '+id);all++;}
  const ids=[...Array.from({length:17},(_,i)=>74+i),224,225,226,227,228,229,230,231];
  const gallery=()=>{clear();ids.forEach((id,i)=>r.sprite(id,32+i%5*64,30+Math.floor(i/5)*32,false,176));r.present();};
  r.setHD(null);gallery();const native=hash(r.frame);r.setHD(pack);gallery();if(hash(r.frame)!==native)throw Error('feedback changed indexed raster');
  const varied=detail(0,0,320,176);if(varied<100)throw Error('feedback still enlarged pixel art');const face=detail(10,118,46,42);if(!face)throw Error('UP portrait missing');
  const before=w.stateHash();r.setHD(null);r.render(w);const nativeWorld=hash(r.frame);r.setHD(pack);r.render(w);if(hash(r.frame)!==nativeWorld||w.stateHash()!==before||before!==initial)throw Error('HD changed gameplay/native output');gallery();
  return {newPainted:newIds.length,proceduralFeedback:feedbackIds.length,checked:all,feedbackSubpixelBlocks:varied,nativeHash:native,simulation:initial};
 });
 if(out)await page.locator('#game').screenshot({path:out+'/feedback-hd.png'});
 // Draw an item sheet directly through the real game renderer, preserving anchors.
 await page.evaluate(()=>{const q=prehistorik,r=q.renderer;window.feedbackIds=Object.keys(q.assets.game.sprites).map(Number);r.frame.fill(0);r.hd.begin();const ids=[110,111,114,115,116,117,128,129,130,131,132,133,134,141,142,143,192,193,199,200,201,202,205,206,207,208,209,210,211,213,214,215,216,217,219,220,221,222,223,227];ids.forEach((id,i)=>r.sprite(id,20+i%10*32,42+Math.floor(i/10)*42,false,176));r.present();});
 if(out)await page.locator('#game').screenshot({path:out+'/items-hd.png'});
 await page.evaluate(()=>{const q=prehistorik,w=q.world;w.transition={type:'complete',percent:83,tally:{phase:'tally',score:12345,percent:83,player:{x:91,y:175,sprite:9},props:[{x:153,y:175,sprite:100},{x:153,y:148,sprite:98},{x:153,y:155,sprite:104}],falling:[{x:155,y:65,sprite:111}]}};q.renderer.render(w);});if(out)await page.locator('#game').screenshot({path:out+'/tally-hd.png'});
 await page.goto(new URL('/hd-preview.html',page.url()).href);await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Sprite '));await page.locator('#set').selectOption('feedback-hd');await page.locator('#frame').evaluate(el=>{el.value='20';el.dispatchEvent(new Event('input'));});await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Sprite 227 '));assert.deepEqual(errors,[]);const result={ok:true,...checks,feedbackPreview:true};if(out)await writeFile(out+'/browser.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
