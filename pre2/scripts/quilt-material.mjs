// Minimum-error wrap seams through dark crevices. Pixel selection only: no
// horizontal/vertical fade bands, color correction, mirrored boulders or blur.
export function wrapMaterial(image,{vertical=true,overlap=.18}={}){
 const join=(im,acrossX)=>{
  const{width:w,height:h,pixels}=im,length=acrossX?w:h,rows=acrossX?h:w,band=Math.floor(length*overlap),period=length-band,lo=3,hi=band-4;
  const pixel=(q,r)=>acrossX?(r*w+q)*4:(q*w+r)*4;
  const cost=(q,r)=>{const a=pixel(q,r),b=pixel(q+period,r);let difference=0,light=0;for(let k=0;k<3;k++){const d=pixels[a+k]-pixels[b+k];difference+=d*d;light+=pixels[a+k]+pixels[b+k];}return difference+light*2;};
  let start=lo,best=Infinity;for(let q=lo;q<=hi;q++){const c=cost(q,0)+cost(q,rows-1);if(c<best){start=q;best=c;}}
  let previous=new Float64Array(band).fill(Infinity),next=new Float64Array(band);const parents=new Int8Array(rows*band);previous[start]=cost(start,0);
  for(let r=1;r<rows;r++){next.fill(Infinity);for(let q=lo;q<=hi;q++){let parent=q;if(q>lo&&previous[q-1]<previous[parent])parent=q-1;if(q<hi&&previous[q+1]<previous[parent])parent=q+1;next[q]=previous[parent]+cost(q,r);parents[r*band+q]=parent-q;}[previous,next]=[next,previous];}
  const seam=new Int32Array(rows);let q=start;for(let r=rows-1;r>=0;r--){seam[r]=q;q+=parents[r*band+q];}
  const width=acrossX?period:w,height=acrossX?h:period,out=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const r=acrossX?y:x,s=acrossX?x:y,t=s<band&&s<seam[r]?s+period:s,p=pixel(t,r);out.set(pixels.subarray(p,p+4),(y*width+x)*4);}
  return{width,height,pixels:out,seam:Array.from(seam),overlap:band};
 };
 const x=join(image,true);if(!vertical)return{...x,seams:{x:x.seam},bands:{x:x.overlap}};const y=join(x,false);return{...y,seams:{x:x.seam,y:y.seam},bands:{x:x.overlap,y:y.overlap}};
}
