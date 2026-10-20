// Continuous artwork owns decoration only; native connected alpha and physics
// remain independent. No filtering, edge matching or per-tile color correction.
export function wrapCoordinate(value,size){return((value%size)+size)%size;}
export function terrainMaterial(pixels,value){
 const id=value-256;if(value>=256&&[524,525].includes(id))return 'root-top';
 if(value>=256&&[530,531].includes(id))return 'root-bottom';
 if(value>=256&&(id===458||id===459))return 'root-top';
 if(value>=256&&id>=437&&id<=442)return 'root-bottom';
 const colors=new Set(pixels);if(colors.size<=1||value>=256&&[519,520].includes(id))return 'literal';
 let brown=0;for(const v of pixels)if(v===1||v===2||v===3)brown++;
 return brown>20?'literal':'wall';
}
const foliageCache=new WeakMap();
function foliageMask(texture){
 if(foliageCache.has(texture))return foliageCache.get(texture);
 const seed=new Uint8Array(4096),mask=new Uint8Array(4096);
 for(let i=0;i<4096;i++){const p=i*4;seed[i]=texture[p+1]>Math.max(texture[p],texture[p+2])*1.12+5?1:0;}
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=y*64+x,p=i*4;if(seed[i]){mask[i]=1;continue;}if(Math.max(texture[p],texture[p+1],texture[p+2])>100)continue;for(let yy=Math.max(0,y-1);yy<=Math.min(63,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(63,x+1);xx++)if(seed[yy*64+xx])mask[i]=1;}
 foliageCache.set(texture,mask);return mask;
}
// Shared by all chunks, indexed by world coordinates rather than tile-local UVs.
export function continuousSampler({textures,kinds,columns,originX,originY,wall,roots}){
 const out=new Float32Array(4);
 const material=(image,x,y)=>{const xx=wrapCoordinate(x,image.width),yy=Math.max(0,Math.min(image.height-1,y)),p=(yy*image.width+xx)*4;out[0]=image.data[p];out[1]=image.data[p+1];out[2]=image.data[p+2];out[3]=image.data[p+3]/255;};
 return(x,y)=>{const i=(y>>6)*columns+(x>>6),kind=kinds[i],texture=textures[i],local=((y&63)*64+(x&63))*4;
  if(kind==='literal'){if(!texture){out.fill(0);return out;}out[0]=texture[local];out[1]=texture[local+1];out[2]=texture[local+2];out[3]=texture[local+3]/255;return out;}
  const wx=originX*4+x,wy=originY*4+y,p=(wrapCoordinate(wy-wall.originY*4,wall.height)*wall.width+wrapCoordinate(wx,wall.width))*4;
  out[0]=wall.data[p];out[1]=wall.data[p+1];out[2]=wall.data[p+2];out[3]=1;
  if(kind==='root-top'||kind==='root-bottom'){
   const r=out[0],g=out[1],b=out[2];material(roots,wx,(kind==='root-bottom'?64:0)+(y&63));const alpha=out[3];out[0]=out[0]*alpha+r*(1-alpha);out[1]=out[1]*alpha+g*(1-alpha);out[2]=out[2]*alpha+b*(1-alpha);out[3]=1;return out;
  }
  // Extract plant color from authored animated art, not its incompatible stone
  // backdrop. Animated leaves retain their poses while the wall stays still.
  if(texture&&foliageMask(texture)[(y&63)*64+(x&63)]){for(let k=0;k<3;k++)out[k]=texture[local+k];}
  return out;
 };
}
