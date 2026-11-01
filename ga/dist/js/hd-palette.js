// Palette rendering over genuine painted RGB. Never changes alpha, geometry or
// creates HD artwork from original pixels. Continuous-color accuracy needs QA.
const clamp = value => Math.max(0, Math.min(255, Math.round(value)));
const rgbKey = color => (color[0] << 16) | (color[1] << 8) | color[2];
const equalRGB = (a,b) => a.every((value,index) => value === b[index]);
function unsupported(status, detail, extra = {}) {
  return {status, supported:false, colorCoverageApproved:false, detail, ...extra};
}
function parseColors(input) {
  if (!Array.isArray(input) || input.length === 0) return null;
  const values = new Map();
  for (const item of input) {
    if (!Array.isArray(item) || item.length !== 4 || item.some(value => !Number.isInteger(value) || value < 0 || value > 255)) return null;
    if (values.has(item[0]) && !equalRGB(values.get(item[0]),item.slice(1))) return null;
    values.set(item[0],item.slice(1));
  }
  return values;
}
function commonFadeFit(anchors) {
  const n = anchors.length;
  const oldMean = [0,1,2].map(c => anchors.reduce((sum,a) => sum+a.source[c],0)/n);
  const newMean = [0,1,2].map(c => anchors.reduce((sum,a) => sum+a.target[c],0)/n);
  let denominator=0, numerator=0;
  for (const a of anchors) for (let c=0;c<3;c++) {
    denominator += (a.source[c]-oldMean[c])**2;
    numerator += (a.source[c]-oldMean[c])*(a.target[c]-newMean[c]);
  }
  if (denominator === 0) return null;
  const factor=numerator/denominator, offset=newMean.map((value,c) => value-factor*oldMean[c]);
  let error=0;
  for (const a of anchors) for (let c=0;c<3;c++) error=Math.max(error,Math.abs(factor*a.source[c]+offset[c]-a.target[c]));
  return factor>=0 && factor<=1 && offset.every(value => value>=-1.5 && value<=255*(1-factor)+1.5) && error<=1.5 ? {factor,offset,error} : null;
}

export function targetColorsForPalette(sourceColors, palette) {
  if (!parseColors(sourceColors) || !Array.isArray(palette)) return [];
  return sourceColors.map(([index]) => [index,...(palette[index] || [])]);
}

/** Known source writes only. Identity is always safe; unknown effects fail closed. */
export function createPalettePlan(sourceColors, targetColors, {knownVariant=false, observedContext=false, variantId=null} = {}) {
  const source=parseColors(sourceColors),target=parseColors(targetColors);
  if (!source || !target || source.size!==target.size || [...source.keys()].some(index => !target.has(index))) return unsupported('invalid-source-colors','Source and target must describe the same exact used indices.');
  const indices=[...source.keys()].sort((a,b) => a-b);
  const signature=JSON.stringify(indices.map(index => [index,...source.get(index),...target.get(index)]));
  if (indices.every(index => equalRGB(source.get(index),target.get(index)))) return {status:'identity',supported:true,signature,variantId,sourceColors:indices.map(index=>[index,...source.get(index)]),colorCoverageApproved:false,approximate:false};
  const groups=new Map();
  for (const index of indices) {
    const key=rgbKey(source.get(index)),item=groups.get(key);
    if (item && !equalRGB(item.target,target.get(index))) return unsupported('requires-material-annotation','Identical original RGB has different target index colors; an explicit reviewed painted-material annotation is required.',{signature,variantId,conflict:{sourceRGB:source.get(index),indices:[...item.indices,index],targets:[item.target,target.get(index)]}});
    if (item) item.indices.push(index);
    else groups.set(key,{source:source.get(index),target:target.get(index),indices:[index]});
  }
  const anchors=[...groups.values()];
  if (anchors.length<4) return unsupported('unsupported-sparse-colors','Fewer than four distinct color anchors cannot safely specify a continuous painted recolor.',{signature,variantId});
  const fade=commonFadeFit(anchors);
  if (fade) return unsupported('unsupported-global-effect','Global fade/flash requires its own verified rendering effect, not a material LUT.',{signature,variantId,fade});
  if (knownVariant!==true && observedContext!==true) return unsupported('unverified-source-variant','A changed palette must match a source-verified variant before rendering.',{signature,variantId});
  for (const a of anchors) {
    const sum=a.source[0]+a.source[1]+a.source[2] || 1;
    a.chroma=a.source.map(value => value/sum);
    a.unchanged=equalRGB(a.source,a.target);
  }
  return {status:'ready-anchored-rgb',supported:true,signature,variantId,anchors,anchorMap:new Map(anchors.map(a=>[rgbKey(a.source),a.target])),approximate:true,colorCoverageApproved:false,warnings:['Exact original RGB anchors do not prove material accuracy on continuous painted colors.','Requires actual painted-variant review; not complete-HD approval.']};
}

/** Smooth Shepard displacement interpolation with protected unchanged anchors. */
export function samplePaletteRGB(plan, color) {
  if (!plan?.supported || color.length!==3) return null;
  if (plan.status==='identity') return [...color];
  const exact=color.every(Number.isInteger)?plan.anchorMap.get(rgbKey(color)):null;
  if (exact) return [...exact];
  const sum=color[0]+color[1]+color[2] || 1,chroma=color.map(value=>value/sum);
  // Identity prior fades unsupported far-away colors back toward the painting.
  let total=1/(96**4),dr=0,dg=0,db=0;
  for (const a of plan.anchors) {
    let distance=0,chromaDistance=0;
    for (let c=0;c<3;c++) {distance+=(color[c]-a.source[c])**2;chromaDistance+=(chroma[c]-a.chroma[c])**2;}
    distance+=2*255*255*chromaDistance;
    const weight=(a.unchanged?8:1)/Math.max(1,distance*distance);
    total+=weight;dr+=weight*(a.target[0]-a.source[0]);dg+=weight*(a.target[1]-a.source[1]);db+=weight*(a.target[2]-a.source[2]);
  }
  return [clamp(color[0]+dr/total),clamp(color[1]+dg/total),clamp(color[2]+db/total)];
}

export function compilePaletteLUT(plan, {size=33} = {}) {
  if (!plan?.supported || plan.status==='identity') return {status:plan?.status || 'unsupported',supported:!!plan?.supported,signature:plan?.signature};
  if (!Number.isInteger(size) || size<9 || size>65) throw new RangeError('Palette LUT size must be9..65.');
  const values=new Uint8ClampedArray(size*size*size*3),step=255/(size-1);
  for (let r=0;r<size;r++) for(let g=0;g<size;g++)for(let b=0;b<size;b++) {
    const color=samplePaletteRGB(plan,[r*step,g*step,b*step]),offset=((r*size+g)*size+b)*3;
    values.set(color,offset);
  }
  return {status:'ready',supported:true,size,values,signature:plan.signature,approximate:true};
}

function lutRGB(lut,color) {
  const n=lut.size,scale=(n-1)/255,v=color.map(value=>value*scale),lo=v.map(Math.floor),hi=lo.map(x=>Math.min(n-1,x+1)),f=v.map((value,c)=>value-lo[c]),out=[0,0,0];
  for(let r=0;r<2;r++)for(let g=0;g<2;g++)for(let b=0;b<2;b++){
    const weight=(r?f[0]:1-f[0])*(g?f[1]:1-f[1])*(b?f[2]:1-f[2]),index=(((r?hi[0]:lo[0])*n+(g?hi[1]:lo[1]))*n+(b?hi[2]:lo[2]))*3;
    for(let c=0;c<3;c++)out[c]+=weight*lut.values[index+c];
  }
  return out.map(clamp);
}

/** Pure RGBA buffer transform. Unsupported plans return no drawable result. */
export function applyPaletteRGBA(source,plan,{lut=null}={}) {
  if (!source || !Number.isInteger(source.length) || source.length%4!==0) throw new TypeError('Expected a complete RGBA buffer.');
  if (!plan?.supported) return {status:'unsupported',pixels:null,reason:plan?.status || 'missing-plan',colorCoverageApproved:false};
  if(plan.status==='identity')return {status:'identity',pixels:source,alphaPreserved:true,inputPreserved:true,approximate:false,colorCoverageApproved:false};
  if(lut && (lut.signature!==plan.signature || !lut.supported))return {status:'unsupported',pixels:null,reason:'lut-plan-mismatch',colorCoverageApproved:false};
  const pixels=new Uint8ClampedArray(source);
  for(let offset=0;offset<pixels.length;offset+=4){
    if(pixels[offset+3]===0)continue;
    const color=[pixels[offset],pixels[offset+1],pixels[offset+2]],exact=plan.anchorMap.get(rgbKey(color));
    const next=exact || (lut?lutRGB(lut,color):samplePaletteRGB(plan,color));
    pixels[offset]=next[0];pixels[offset+1]=next[1];pixels[offset+2]=next[2];
  }
  return {status:'transformed',pixels,alphaPreserved:true,inputPreserved:true,approximate:true,colorCoverageApproved:false};
}

const yieldTask = () => new Promise(resolve => setTimeout(resolve,0));
/** Same LUT math, yielding bounded chunks so artwork preparation does not stop play. */
export async function compilePaletteLUTAsync(plan,{size=33,chunk=2048,yieldControl=yieldTask}={}) {
  if(!plan?.supported || plan.status==='identity')return compilePaletteLUT(plan,{size});
  if(!Number.isInteger(size)||size<9||size>65||!Number.isInteger(chunk)||chunk<1)throw new RangeError('Invalid palette LUT options.');
  const values=new Uint8ClampedArray(size**3*3),step=255/(size-1);
  for(let i=0;i<size**3;i++){
    const r=Math.floor(i/(size*size)),g=Math.floor(i/size)%size,b=i%size;
    values.set(samplePaletteRGB(plan,[r*step,g*step,b*step]),i*3);
    if((i+1)%chunk===0)await yieldControl();
  }
  return {status:'ready',supported:true,size,values,signature:plan.signature,approximate:true};
}
/** Identity returns the exact source object; changed RGB is processed per crop. */
export async function applyPaletteRGBAAsync(source,plan,{lut=null,chunkPixels=2048,yieldControl=yieldTask}={}) {
  if(!Number.isInteger(chunkPixels)||chunkPixels<1)throw new RangeError('Invalid palette chunk size.');
  if(!plan?.supported || plan.status==='identity')return applyPaletteRGBA(source,plan,{lut});
  if(lut && (lut.signature!==plan.signature||!lut.supported))return applyPaletteRGBA(source,plan,{lut});
  if(!source||source.length%4!==0)throw new TypeError('Expected a complete RGBA buffer.');
  const pixels=new Uint8ClampedArray(source.length);
  for(let offset=0;offset<source.length;offset+=chunkPixels*4){
    pixels.set(applyPaletteRGBA(source.subarray(offset,Math.min(source.length,offset+chunkPixels*4)),plan,{lut}).pixels,offset);
    await yieldControl();
  }
  return {status:'transformed',pixels,alphaPreserved:true,inputPreserved:true,approximate:true,colorCoverageApproved:false};
}

/** Bounded LRU for transformed RGBA only; ImageBitmap lifetimes stay caller-owned. */
export class PaletteRGBACache {
  constructor({maxBytes=16*1024*1024,maxEntries=64}={}) {
    if(!Number.isInteger(maxBytes)||maxBytes<0||!Number.isInteger(maxEntries)||maxEntries<1)throw new RangeError('Invalid palette cache limits.');
    this.maxBytes=maxBytes;this.maxEntries=maxEntries;this.bytes=0;this.entries=new Map();
  }
  get(key){const item=this.entries.get(key);if(!item)return null;this.entries.delete(key);this.entries.set(key,item);return item;}
  set(key,pixels){if(!(pixels instanceof Uint8ClampedArray))throw new TypeError('Cache stores Uint8ClampedArray RGBA.');this.delete(key);if(pixels.byteLength>this.maxBytes)return false;this.entries.set(key,pixels);this.bytes+=pixels.byteLength;while(this.bytes>this.maxBytes||this.entries.size>this.maxEntries)this.delete(this.entries.keys().next().value);return true;}
  delete(key){const old=this.entries.get(key);if(!old)return false;this.bytes-=old.byteLength;return this.entries.delete(key);}
  clear(){this.entries.clear();this.bytes=0;}
}
