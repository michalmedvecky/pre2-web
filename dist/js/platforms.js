// Original 0x14afb: 16 authored 15-byte records at DS:9103.
import {u8,u16,s8,s16} from './compat.js';
const word=(r,p)=>r[p]|r[p+1]<<8;
const put=(r,p,v)=>{r[p]=v&255;r[p+1]=(v>>>8)&255;};
export function makePlatform(d){return {...d,raw:Uint8Array.from(d.raw),active:true,dx:0,dy:0};}
export function updatePlatforms(w){
 w.carriedPlatform=null;w.platformSupport=null;
 for(const p of w.platforms){if(!p.active)continue;const r=p.raw,oldX=p.x,oldY=p.y,mode=r[6]&15;
  if(mode===8){let offset=s16(word(r,11));p.y=s16(p.y-offset);
   if(r[10]===0){offset-=8;if(offset<0){offset=0;r[7]=0;}if((r[6]&64)&&(r[7]!==0||!(r[13]=u8(r[13]-1)))){r[10]=1;r[7]=0;}}
   else if(r[10]===1){const speed=r[7];if(speed<192)r[7]=u8(speed+8);offset=s16(offset+(speed>>4));const yy=p.y+offset,delta=(w.level.height-1)-(yy>>4),floor=w.floorClass(p.x,yy);if((delta<0&&-delta>=3)||(delta>=0&&floor!==0&&floor!==6)){r[10]=2;r[13]=22;}}
   else if(r[10]===2&&!(r[6]&64)&&!(r[13]=u8(r[13]-1))){r[10]=0;r[13]=r[9];}
   put(r,11,offset);p.y=s16(p.y+offset);
  }else if(r[14]!==0||s8(r[7])<0||(r[6]&192)){
   const target=s8(r[7]);let speed=s8(r[14]);speed+=Math.sign(target-speed);r[14]=u8(speed);
   const dirs=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]],dir=dirs[mode&7];
   p.x=s16(p.x+dir[0]*speed);p.y=s16(p.y+dir[1]*speed);
   if(speed===target){let count=u16(word(r,12)+1);if(count===word(r,10)){put(r,7,-word(r,7));count=0;}put(r,12,count);}
  }
  p.dx=p.x-oldX;p.dy=p.y-oldY;
  const player=w.player,b=w.spriteBounds(p),wasRiding=player.platformGrip&&player.platformId===p.index;
  const touching=wasRiding&&player.x>b.left-3-p.dx&&player.x<b.right+3-p.dx&&player.vy>-16;
  if(touching){player.x+=p.dx;if(player.y>b.top){player.y=b.top+1;player.vy=1;}else player.vy=p.dy*16;w.platformSupport={index:p.index,y:player.y>b.top?b.top+1:b.top,vy:player.vy};w.carriedPlatform=p.index;r[6]|=64;}else r[6]&=~64;
 }
}
