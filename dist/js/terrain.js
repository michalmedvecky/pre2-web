// Enlarge connected indexed terrain before adding detail. Tile boundaries are not edges.
export function scale2x(src,width,height){
 const out=new Uint8Array(width*height*4),at=(x,y)=>src[Math.max(0,Math.min(height-1,y))*width+Math.max(0,Math.min(width-1,x))];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const b=at(x,y-1),d=at(x-1,y),e=at(x,y),f=at(x+1,y),h=at(x,y+1),p=y*2*width*2+x*2;
  out[p]=d===b&&b!==f&&d!==h?d:e;out[p+1]=b===f&&b!==d&&f!==h?f:e;
  out[p+width*2]=d===h&&d!==b&&h!==f?d:e;out[p+width*2+1]=h===f&&d!==h&&b!==f?f:e;
 }return out;
}
// Blend across atlas cuts using pixels from the interiors of BOTH neighbors.
// No original-colored rim or separately feathered square is left at a tile edge.
export function textureSampler(tiles,columns,tileSize=64){
 const rows=Math.ceil(tiles.length/columns),band=8,axis=length=>Array.from({length},(_,v)=>{
  const local=v%tileSize,origin=v-local;
  if(local<band)return [origin-band,origin+band,(local+band)/(band*2)];
  if(local>=tileSize-band)return [origin+tileSize-band,origin+tileSize+band,(local-tileSize+band)/(band*2)];
  return [v,v,0];
 }),xs=axis(columns*tileSize),ys=axis(rows*tileSize),out=new Float32Array(4);
 return (x,y)=>{
  const xx=xs[x],yy=ys[y];out.fill(0);if(!xx||!yy)return out;
  for(let j=0;j<2;j++)for(let i=0;i<2;i++){
   const weight=(i?xx[2]:1-xx[2])*(j?yy[2]:1-yy[2]);if(!weight)continue;
   const px=xx[i],py=yy[j];if(px<0||py<0||px>=columns*tileSize||py>=rows*tileSize)continue;
   const tile=tiles[Math.floor(py/tileSize)*columns+Math.floor(px/tileSize)];if(!tile)continue;
   const p=((py%tileSize)*tileSize+px%tileSize)*4,a=weight*tile[p+3]/255;
   for(let k=0;k<3;k++)out[k]+=tile[p+k]*a;out[3]+=a;
  }
  if(out[3])for(let k=0;k<3;k++)out[k]/=out[3];
  return out;
 };
}
export function connectedTerrain(source,width,height,palette,texture){
 // Reconstruct continuous color from connected contours instead of copying
 // large indexed-color steps into a high-resolution canvas.
 const pixels=scale2x(source,width,height),sw=width*2,sh=height*2,w=width*4,h=height*4,rgba=new Uint8ClampedArray(w*h*4),horizontal=new Float32Array(w*sh*4);
 // Interpolating cubic weights preserve sharp material boundaries. The prior
 // Gaussian kernel blurred every rock/leaf while characters stayed crisp.
 const kernels=[.75,.25].map(f=>{const f2=f*f,f3=f2*f;return [-.5*f+f2-.5*f3,1-2.5*f2+1.5*f3,.5*f+2*f2-1.5*f3,-.5*f2+.5*f3];});
 for(let y=0;y<sh;y++)for(let x=0;x<w;x++){
  const ix=(x-1)>>1,kernel=kernels[x&1],p=(y*w+x)*4;
  for(let i=0;i<4;i++){
   const v=pixels[y*sw+Math.max(0,Math.min(sw-1,ix+i-1))];if(!v)continue;const k=kernel[i];
   horizontal[p]+=palette[v*3]*k;horizontal[p+1]+=palette[v*3+1]*k;horizontal[p+2]+=palette[v*3+2]*k;horizontal[p+3]+=k;
  }
 }
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const iy=(y-1)>>1,kernel=kernels[y&1],p=(y*w+x)*4;let r=0,g=0,b=0,alpha=0;
  for(let i=0;i<4;i++){const q=(Math.max(0,Math.min(sh-1,iy+i-1))*w+x)*4,k=kernel[i];r+=horizontal[q]*k;g+=horizontal[q+1]*k;b+=horizontal[q+2]*k;alpha+=horizontal[q+3]*k;}
  if(alpha<=.2)continue;r/=alpha;g/=alpha;b/=alpha;
  const paint=texture?.(x,y),light=paint?paint[0]*Math.min(1,paint[3]):0,coverage=Math.max(0,Math.min(1,(alpha-.2)/.6));
  rgba[p]=r*(1+light);rgba[p+1]=g*(1+light);rgba[p+2]=b*(1+light);rgba[p+3]=coverage*coverage*(3-2*coverage)*255;
 }return rgba;
}
