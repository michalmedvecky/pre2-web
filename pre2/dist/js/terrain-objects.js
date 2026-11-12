export const STATUE_PATTERN=[[35,36,37,38,39],[48,49,50,51,52],[63,64,65,66,257],[78,79,80,81,257]];
export const STATUE_TILES=new Set(STATUE_PATTERN.flat().filter(v=>v!==257));
export function statueAnchors(level,map,ox,oy){
 if(level.id!=='9')return[];const out=[];
 for(let y=Math.max(0,(oy-64)>>4);y<=Math.min(level.height-4,(oy+63)>>4);y++)for(let x=Math.max(0,(ox-80)>>4);x<=Math.min(251,(ox+63)>>4);x++){
  if(level.lookup[map[y*256+x]]!==35)continue;
  const value=(dx,dy)=>level.lookup[map[(y+dy)*256+x+dx]];
  if(STATUE_PATTERN.every((r,dy)=>r.every((v,dx)=>v===257||value(dx,dy)===v||v===78&&value(dx,dy)===257))){const omit=[];for(let dy=0;dy<4;dy++)for(let dx=0;dx<5;dx++)if(value(dx,dy)!==STATUE_PATTERN[dy][dx])omit.push(dy*5+dx);out.push({x:x*16,y:y*16,omit});}
 }return out;
}
export function insideStatue(x,y,objects){return objects?.some(o=>x>=o.x&&x<o.x+80&&y>=o.y&&y<o.y+64);}
export function compositeStatues(pixels,image,objects,ox,oy){if(!image||!objects?.length)return pixels;for(const o of objects)for(let y=Math.max(0,(o.y-oy)*4);y<Math.min(256,(o.y+64-oy)*4);y++)for(let x=Math.max(0,(o.x-ox)*4);x<Math.min(256,(o.x+80-ox)*4);x++){if(o.omit?.includes(((oy*4+y-o.y*4)>>6)*5+((ox*4+x-o.x*4)>>6)))continue;const p=(y*256+x)*4,q=((oy*4+y-o.y*4)*image.width+ox*4+x-o.x*4)*4,a=image.data[q+3]/255,b=pixels[p+3]/255*(1-a),sum=a+b;for(let k=0;k<3;k++)pixels[p+k]=sum?(image.data[q+k]*a+pixels[p+k]*b)/sum:0;pixels[p+3]=sum*255;}return pixels;}
export function caveCapIndex(level,value,index,x,y,wx,wy,caps){if(level!=='2'||value!==257||index!==6||y>=8||!caps?.some(o=>(wx>>4)===(o.x>>4)&&(wy>>4)===(o.y>>4)))return index;const dx=(x-7.5)/7.5,dy=(y-8)/8;return dx*dx+dy*dy>1?13:index;}
