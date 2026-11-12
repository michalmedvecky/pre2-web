// Local170/171 carry the same two spikes as169, plus the trunk that continues
// behind them in their first rows. Opening that entire tile exposes the sky
// through the trunk. Reconstruct only this background, in world coordinates.
export function stage6SpikeBackdrop(pixels,env,job){
 const{values,ox,oy}=job,{local,materials,kinds={}}=env,wood=materials.wood;if(!wood)return pixels;
 if(!values.some(v=>v>=169&&v<=171))return pixels;
 const backgrounds=values.map((v,cell)=>v===170||v===171||v===169&&[cell-1,cell+1,cell-6].some(n=>kinds[values[n]]==='wood'||values[n]===170||values[n]===171));
 const canonical=local.subarray(169*256,170*256),mirror=(v,n)=>{v=((v%(2*n))+2*n)%(2*n);return v<n?v:2*n-1-v;};
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const sx=(x>>2)+16,sy=(y>>2)+16,v=values[(sy>>4)*6+(sx>>4)],lx=sx&15,ly=sy&15;
  const cell=(sy>>4)*6+(sx>>4);
  if(!backgrounds[cell]||ly>=13||ly>=3&&canonical[ly*16+lx]!==6)continue;
  const p=(y*256+x)*4,wx=ox*4+x,wy=oy*4+y,q=(mirror(wy,wood.height)*wood.width+mirror(wx,wood.width))*4;
  for(let k=0;k<3;k++)pixels[p+k]=wood.data[q+k];pixels[p+3]=255;
 }
 return pixels;
}
// A whole-object drawing must also own its alpha. Sampling it as a tile tint
// left both transparent holes and old tile fragments on top of the new leaves.
export function stage6ArenaComposite(pixels,object,ox,oy){
 if(!object||ox+64<=object.x||ox>=object.x+object.width/4||oy+64<=object.y||oy>=object.y+object.height/4)return pixels;
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const xx=ox*4+x-object.x*4,yy=oy*4+y-object.y*4;
  if(xx<0||yy<0||xx>=object.width||yy>=object.height)continue;
  const p=(y*256+x)*4,q=(yy*object.width+xx)*4,edge=Math.min(xx,object.width-1-xx),f=Math.max(0,Math.min(1,edge/((object.feather??8)*4))),t=f*f*(3-2*f),a=pixels[p+3]/255*(1-t),b=object.data[q+3]/255*t,total=a+b;
  for(let k=0;k<3;k++)pixels[p+k]=total?(pixels[p+k]*a+object.data[q+k]*b)/total:0;
  pixels[p+3]=total*255;
 }
 return pixels;
}
