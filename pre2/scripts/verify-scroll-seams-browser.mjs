import assert from'node:assert/strict';
import{mkdir,writeFile}from'node:fs/promises';
const{chromium}=await import(process.env.PRE2_PLAYWRIGHT_MODULE||'playwright'),out=process.env.PRE2_QA_OUTPUT||'art/hd-v12/review',browser=await chromium.launch({headless:true});
try{
 await mkdir(out,{recursive:true});const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.PRE2_QA_URL||'http://127.0.0.1:5775/?qa');await page.waitForFunction(()=>window.prehistorik);await page.clock.install();await page.clock.pauseAt(new Date());
 const synthetic=await page.evaluate(async()=>{
  const{TerrainLayer}=await import('./js/terrain-layer.js'),make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;},source=make(2048,1536),sc=source.getContext('2d'),data=sc.createImageData(source.width,source.height);
  for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++){const p=(y*source.width+x)*4;data.data.set([x%251,y%239,(x+y)%233,(Math.floor(x/19)+Math.floor(y/23))%3?255:80],p);}sc.putImageData(data,0,0);
  const chunks=new Map(),layer=new TerrainLayer(),actual=make(1280,704),expected=make(1280,704);let mismatches=0,samples=0;
  for(const base of [0,63,64,65,127,128])for(const dx of [-.49,-.125,0,.125,.49])for(const dy of [-.49,0,.49]){
   const cx=base,cy=base,ac=actual.getContext('2d'),ec=expected.getContext('2d');for(const c of [ac,ec]){c.setTransform(1,0,0,1,0,0);c.fillStyle='#123456';c.fillRect(0,0,1280,704);c.translate(-dx*4,-dy*4);c.imageSmoothingEnabled=true;}
   layer.draw({scale:4,clipped:(_,draw)=>draw(ac)},cx,cy,(c,b)=>{for(let gy=b.y0;gy<=b.y1;gy++)for(let gx=b.x0;gx<=b.x1;gx++){const key=gx+':'+gy;let tile=chunks.get(key);if(!tile){tile=make(256,256);tile.getContext('2d').drawImage(source,gx*256,gy*256,256,256,0,0,256,256);chunks.set(key,tile);}c.drawImage(tile,gx*256,gy*256);}});
   ec.drawImage(source,-cx*4,-cy*4);const a=ac.getImageData(0,0,1280,704).data,e=ec.getImageData(0,0,1280,704).data;for(let i=0;i<a.length;i++)if(a[i]!==e[i])mismatches++;samples++;
  }return{samples,mismatches};
 });assert.equal(synthetic.mismatches,0,'Chunked scrolling must match a single continuous image, including translucent pixels and viewport edges');
 await page.evaluate(async()=>{prehistorik.start();prehistorik.pause();await prehistorik.setGraphics('hd');document.querySelector('#dialog').hidden=true;});
 const scenes=[];
 for(const level of (process.env.PRE2_QA_LEVELS?process.env.PRE2_QA_LEVELS.split(',').map(Number):[0,10,11,12])){
  const result=await page.evaluate(level=>{
   const q=prehistorik;q.start(level);q.pause();const w=q.world,r=q.renderer,hd=r.hd,hash=a=>{let h=2166136261;for(const v of a)h=Math.imul(h^v,16777619);return h>>>0;};w.player.x=864;w.player.y=96;
   const fixed=hd.connectedLayer,legacy=function(cx,cy,draw){this.clipped(176,c=>{c.save();c.translate(-cx*4,-cy*4);draw(c,{x0:Math.max(0,Math.floor(cx/64)),x1:Math.floor((cx+319)/64),y0:Math.max(0,Math.floor(cy/64)),y1:Math.floor((cy+175)/64)});c.restore();});};
   let movingDifferences=0,stationaryDifferences=0;const frames=[];
   for(const x of [799.51,799.875,800,800.125,800.49,831.51,831.875,832,832.125,832.49])for(const y of [0,.125,31.875,32,32.125]){
    const view={...w,camera:{x:Math.round(x),y:Math.round(y)},renderCamera:{x,y}};hd.connectedLayer=fixed;r.render(view);const a=r.ctx.getImageData(0,0,1280,800).data,native=hash(r.frame),state=w.stateHash();hd.connectedLayer=legacy;r.render(view);const b=r.ctx.getImageData(0,0,1280,800).data;let differences=0;for(let i=0;i<704*1280*4;i++)if(a[i]!==b[i])differences++;
    if(hash(a.subarray(704*1280*4))!==hash(b.subarray(704*1280*4))||native!==hash(r.frame)||state!==w.stateHash())throw Error('Presentation changed HUD, native raster or simulation');
    if(Number.isInteger(x)&&Number.isInteger(y))stationaryDifferences+=differences;else movingDifferences+=differences;frames.push({x,y,differences});
   }hd.connectedLayer=fixed;return{level:w.level.id,movingDifferences,stationaryDifferences,frames,cache:hd.terrainCache.size};
  },level);assert.equal(result.stationaryDifferences,0);if(level===0)assert.ok(result.movingDifferences>0);scenes.push(result);
 }
 for(const mode of ['before','after']){await page.evaluate(mode=>{const q=prehistorik;q.start(0);q.pause();document.querySelector('#dialog').hidden=true;const w=q.world,hd=q.renderer.hd;w.player.x=864;w.player.y=96;w.camera={x:800,y:0};if(mode==='before'){window.fixedLayer=hd.connectedLayer;hd.connectedLayer=function(cx,cy,draw){this.clipped(176,c=>{c.save();c.translate(-cx*4,-cy*4);draw(c,{x0:Math.floor(cx/64),x1:Math.floor((cx+319)/64),y0:0,y1:Math.floor((cy+175)/64)});c.restore();});};}else hd.connectedLayer=window.fixedLayer;q.renderer.render({...w,renderCamera:{x:800.125,y:.125}});},mode);await page.locator('#game').screenshot({path:out+'/cave-moving-'+mode+'.png'});}
 assert.deepEqual(errors,[]);const result={ok:true,synthetic,scenes};await writeFile(out+'/scroll-seams.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({ok:true,synthetic,scenes:scenes.map(({frames,...s})=>s)},null,2));
}finally{await browser.close();}
