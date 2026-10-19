// Static reconstruction of DOS 0x143ab/0x15606 and 0x13b03; no native code runs.
import {u8,u16,s16,Random} from './compat.js';
const word=(r,p)=>r[p]|r[p+1]<<8;
export function initEnvironment(w){
 // 0x143ab snapshots the whole swept rectangle before secrets conceal the map.
 w.movingBlocks=(w.level.movingBlocks||[]).filter(d=>d.active).map(d=>{
  const r=d.raw,origin=word(r,0),width=r[2],height=r[3],travel=r[8];
  const fill=[];for(let step=0;step<travel;step++)for(let x=0;x<width;x++)fill.push(w.map[u16(origin+(height-1-step)*256+x)]);
  return {index:d.index,pos:origin,width,height,remaining:travel,trigger:word(r,4),step:0,fill:Uint8Array.from(fill)};
 });
 w.weather=0;w.weatherTime=0;w.weatherPointer=w.word(0x2d3c+w.levelIndex*2);
 // The rain's initial seed depends on earlier menu activity. Keep a reproducible
 // presentation stream; rain must not depend on monitor refresh rate.
 w.rainRng=new Random();w.rainSeeds=new Uint16Array(256);for(let i=0;i<256;i++)w.rainSeeds[i]=(w.rainRng.next()<<8)|w.rainRng.next();w.rainPoints=[];
}
export function updateMovingBlocks(w){
 const tile=w.tilePos(w.player.x,w.player.y);
 for(const b of w.movingBlocks){
  if(b.trigger===65535)continue;
  if(b.trigger!==65534){if(u16(tile-b.trigger)<=8){b.trigger=65534;w.player.landingShake=7;}continue;}
  // Sprite drawing (0x1289a) increments the native frame counter after this call.
  w.player.landingShake=7;if((w.frame-1)&3)continue;
  for(let y=0;y<b.height;y++)for(let x=0;x<b.width;x++)w.map[u16(b.pos+(y-1)*256+x)]=w.map[u16(b.pos+y*256+x)];
  for(let x=0;x<b.width;x++)w.map[u16(b.pos+(b.height-1)*256+x)]=b.fill[b.step*b.width+x];
  b.pos=u16(b.pos-256);b.step++;if(--b.remaining===0)b.trigger=65535;
 }
}
export function updateWeather(w){
 w.weatherTime=u16(w.weatherTime+1);const p=w.weatherPointer,time=w.weatherTime;
 if(!(w.frame&3)&&w.word(p)!==65535){
  if(w.word(p)<time){w.weather=s16(w.weather+w.signedWord(p+2));if(w.word(p+6)<time)w.weatherPointer=u16(p+6);}
  w.weather=Math.min(w.signedWord(p+4),Math.max(0,w.weather));
 }
 w.rainPoints=[];if(!w.weather)return;
 const half=w.weather>>1;
 for(let i=0;i<w.weather;i++){
  const seed=w.rainSeeds[i]=u16(w.rainSeeds[i]+79),shift=((seed&255)<<1|((seed&255)>>>7))&3;
  let pos=u16(seed-(w.camera.x>>4))&8191;if(pos>=7000){pos-=7000;w.rainSeeds[i]=pos;}
  const x=pos%40*8+6-shift,y=Math.floor(pos/40);
  w.rainPoints.push({x,y});if(w.weather-i>half)w.rainPoints.push({x,y:y+1},{x:x-1,y:y+1});
 }
 const index=w.rainRng.next();w.rainSeeds[index]=(w.rainRng.next()<<8)|w.rainRng.next();
}
