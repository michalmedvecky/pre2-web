// Enlarge connected indexed terrain before adding detail. Tile boundaries are not edges.
export function scale2x(src,width,height){
 const out=new Uint8Array(width*height*4),at=(x,y)=>src[Math.max(0,Math.min(height-1,y))*width+Math.max(0,Math.min(width-1,x))];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const b=at(x,y-1),d=at(x-1,y),e=at(x,y),f=at(x+1,y),h=at(x,y+1),p=y*2*width*2+x*2;
  out[p]=d===b&&b!==f&&d!==h?d:e;out[p+1]=b===f&&b!==d&&f!==h?f:e;
  out[p+width*2]=d===h&&d!==b&&h!==f?d:e;out[p+width*2+1]=h===f&&d!==h&&b!==f?f:e;
 }return out;
}
export function connectedTerrain(source,width,height,palette,detail){
 const doubled=scale2x(source,width,height),pixels=scale2x(doubled,width*2,height*2),rgba=new Uint8ClampedArray(pixels.length*4);
 for(let y=0;y<height*4;y++)for(let x=0;x<width*4;x++){
  const i=y*width*4+x,v=pixels[i],p=i*4;if(!v)continue;
  // Detail is luminance only: independently painted tile colors/contours must not
  // replace the connected source shapes. Fade detail at atlas cuts, not the base.
  const light=detail?.(x,y)||0;for(let k=0;k<3;k++)rgba[p+k]=Math.max(0,Math.min(255,palette[v*3+k]*(1+light)));rgba[p+3]=255;
 }return rgba;
}
