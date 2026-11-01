// Explicit actual-painting material annotations. Geometry is NOT a source alpha stamp.
const luma=c=>.2126*c[0]+.7152*c[1]+.0722*c[2];
const clamp=x=>Math.max(0,Math.min(255,Math.round(x)));
function crimsonWeight(rgb){const hue=colorHue(rgb),s=(Math.max(...rgb)-Math.min(...rgb))/Math.max(1,Math.max(...rgb));return Math.max(0,Math.min(1,hue<180?(16-hue)/6:(hue-340)/10))*Math.max(0,Math.min(1,(s-.03)/.08));}
/** Fill only enclosed small painted highlights, never an indexed/source silhouette. */
export function paintedCrimsonWeights(source,width){
 const n=source.length/4,height=n/width,weights=new Float32Array(n),seen=new Uint8Array(n),queue=new Uint32Array(n);
 for(let i=0;i<n;i++)if(source[i*4+3])weights[i]=crimsonWeight([source[i*4],source[i*4+1],source[i*4+2]]);
 for(let start=0;start<n;start++){
  if(seen[start]||weights[start]>.1||!source[start*4+3])continue;
  let head=0,tail=1,touchesOutside=false;queue[0]=start;seen[start]=1;
  while(head<tail){const i=queue[head++],x=i%width,y=Math.floor(i/width);
   for(const[next,valid]of[[i-1,x>0],[i+1,x+1<width],[i-width,y>0],[i+width,y+1<height]]){
    if(!valid||!source[next*4+3]){touchesOutside=true;continue;}
    if(!seen[next]&&weights[next]<=.1){seen[next]=1;queue[tail++]=next;}
   }
  }
  if(!touchesOutside&&tail<=800)for(let j=0;j<tail;j++){const i=queue[j],rgb=[source[i*4],source[i*4+1],source[i*4+2]],h=colorHue(rgb);if(!(h>40&&h<80&&Math.max(...rgb)>160))weights[i]=1;}
 }
 return weights;
}
function prepareAnnotations(source,width,annotations){return annotations.map(a=>a.component==='crimson-filled'&&!a.weights?{...a,weights:paintedCrimsonWeights(source,width)}:a);}
export function pointInPolygon(x,y,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const[a,b]=poly[i],[c,d]=poly[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;}return inside;}
export function colorHue([r,g,b]){const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;if(!d)return 0;let h=max===r?(g-b)/d:max===g?(b-r)/d+2:(r-g)/d+4;return(h*60+360)%360;}
export function sampleMaterialRamp(rgb,sourceRamp,targetRamp){
 const pairs=sourceRamp.map((c,i)=>({level:luma(c),color:targetRamp[i]})).sort((a,b)=>a.level-b.level);return sampleRampPairs(rgb,pairs);
}
function sampleRampPairs(rgb,pairs){const y=luma(rgb);
 if(y<=pairs[0].level){const f=y/Math.max(1,pairs[0].level);return pairs[0].color.map(c=>clamp(c*f));}
 const last=pairs.at(-1);if(y>=last.level){const f=(y-last.level)/(255-last.level);return last.color.map(c=>clamp(c+(255-c)*f));}
 for(let i=1;i<pairs.length;i++)if(y<=pairs[i].level){const a=pairs[i-1],b=pairs[i],f=(y-a.level)/(b.level-a.level);return a.color.map((v,c)=>clamp(v+(b.color[c]-v)*f));}
}
export function applyMaterialAnnotations(source,base,width,annotations,{originY=0}={}){
 if(source.length!==base.length||source.length%4||!Number.isInteger(width)||width<1)throw new TypeError('Matching complete RGBA crops required.');
 annotations=prepareAnnotations(source,width,annotations);const out=new Uint8ClampedArray(base),counts={},ramps=annotations.map(a=>a.sourceRamp.map((c,i)=>({level:luma(c),color:a.targetRamp[i]})).sort((a,b)=>a.level-b.level));
 for(let p=0;p<source.length;p+=4){if(!source[p+3])continue;const x=(p/4)%width+.5,y=Math.floor(p/4/width)+.5+originY,rgb=[source[p],source[p+1],source[p+2]];
  for(const a of annotations){if(a.polygons&&!a.polygons.some(poly=>pointInPolygon(x,y,poly)))continue;
   const hue=colorHue(rgb),saturation=(Math.max(...rgb)-Math.min(...rgb))/Math.max(1,Math.max(...rgb));
   let weight=1;
   if(a.component==='crimson'){weight=crimsonWeight(rgb);if(!weight)continue;}
   if(a.component==='crimson-filled'){weight=a.weights[Math.floor(p/4)+originY*width];if(!weight)continue;}
   if(a.component==='brown'&&!(hue>=10&&hue<=51&&saturation>.13))continue;
   // An unchanged source material stays byteexact painted RGB, even when another material changes.
   const identity=a.sourceRamp.every((color,i)=>color.every((v,c)=>v===a.targetRamp[i][c]));
   const next=identity?rgb:sampleRampPairs(rgb,ramps[annotations.indexOf(a)]);for(let c=0;c<3;c++)out[p+c]=clamp(out[p+c]+weight*(next[c]-out[p+c]));counts[a.id]=(counts[a.id]||0)+1;
  }
 }
 return{pixels:out,counts,alphaPreserved:true,approximate:true,colorCoverageApproved:false};
}
/** Explicit tiny painted highlight exceptions, never an inferred whole-skin mask. */
export function preservePaintRegions(source,base,width,regions,{originY=0}={}){
 const pixels=new Uint8ClampedArray(base);let changed=0;
 for(let p=0;p<source.length;p+=4){if(!source[p+3])continue;const x=(p/4)%width+.5,y=Math.floor(p/4/width)+.5+originY;
  for(const region of regions){const distance=Math.hypot(x-region.center[0],y-region.center[1]);if(distance>=region.radius)continue;
   const weight=Math.max(0,Math.min(1,(region.radius-distance)/(region.radius-region.innerRadius)));
   for(let c=0;c<3;c++)pixels[p+c]=clamp(pixels[p+c]+weight*(source[p+c]-pixels[p+c]));changed++;
  }
 }
 return{pixels,changed,alphaPreserved:true,approximate:true,colorCoverageApproved:false};
}
export async function applyPaintMaterialsAsync(source,base,width,{annotations=[],preserveRegions=[]}={}){
 annotations=prepareAnnotations(source,width,annotations);
 const pixels=new Uint8ClampedArray(base);
 for(let offset=0;offset<source.length;offset+=width*4*8){
  const end=Math.min(source.length,offset+width*4*8),raw=source.subarray(offset,end),part=base.subarray(offset,end),originY=offset/(width*4);
  let out=annotations.length?applyMaterialAnnotations(raw,part,width,annotations,{originY}).pixels:part;
  if(preserveRegions.length)out=preservePaintRegions(raw,out,width,preserveRegions,{originY}).pixels;
  pixels.set(out,offset);await new Promise(resolve=>setTimeout(resolve,0));
 }
 return{pixels,alphaPreserved:true,approximate:true,colorCoverageApproved:false};
}
