// Exact source typography/simple geometry, separately counted from painted HD.
export function compilePreservedSprite(entry,frame,pixels){
 if(entry?.classification!=='preserved-vector-typography'||!Array.isArray(entry.rects))return null;
 const actual=new Int16Array(frame.width*frame.height).fill(-1);
 for(const r of entry.rects){
  if(!Array.isArray(r)||r.length!==5||r.some(v=>!Number.isInteger(v)))return null;
  const[index,x,y,w,h]=r;if(index<0||index>255||x<0||y<0||w<1||h<1||x+w>frame.width||y+h>frame.height)return null;
  for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const at=yy*frame.width+xx;if(actual[at]!==-1)return null;actual[at]=index;}
 }
 for(let i=0;i<actual.length;i++){const source=pixels[frame.offset+i],expected=frame.transparent&&source===frame.transparentIndex?-1:source;if(actual[i]!==expected)return null;}
 return{classification:entry.classification,rects:entry.rects.map(r=>[...r])};
}
export function drawPreservedSprite(ctx,compiled,palette,x,y){
 if(!compiled)return false;
 ctx.save();for(const[index,rx,ry,w,h]of compiled.rects){const c=palette[index];if(!c){ctx.restore();return false;}ctx.fillStyle=`rgb(${c[0]},${c[1]},${c[2]})`;ctx.fillRect(x+rx,y+ry,w,h);}ctx.restore();return true;
}
