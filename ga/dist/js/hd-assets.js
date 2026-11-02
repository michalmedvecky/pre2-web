import {HD_OBSERVED_DEATH_CONTEXT} from './hd-observed-death-context.js';
import {HD_PALETTE_WRITES} from './hd-palette-writes.js';
import {HD_MATERIAL_ANNOTATIONS} from './hd-material-annotations.js';
import {applyPaintMaterialsAsync} from './hd-materials.js';
import {matchingMapStatePatches} from './hd-map-state.js';
import {createPalettePlan,targetColorsForPalette,compilePaletteLUTAsync,applyPaletteRGBAAsync,PaletteRGBACache} from './hd-palette.js';
const APPROVED = 'approved';
const sameRGB=(a,b)=>a?.length===3&&b?.length===3&&a.every((n,i)=>n===b[i]);
export const PALETTE_MATERIAL_REQUIRED={bigguy:[3,13,15,53,55,59],death:[3,13,14,15,59],evillady:[42,44],longmoan:[3,13,15,53,55,59]};
/** Only an exact original used-index write can authorize painted recoloring. */
export function verifiedPalettePlan(sprite,sourceColors,palette,{entry=null,atlas=null}={}) {
  // The separate observed Death context never expands the native37-write registry.
  const observed=sprite==='death'&&entry?HD_OBSERVED_DEATH_CONTEXT.frames.find(f=>f.key===`death/${entry.slot}/${entry.frame}`&&f.sourceHeaderSHA===entry.sourceHeaderSHA&&f.sourceIndexedSHA===entry.sourceIndexedSHA&&JSON.stringify(f.sourceColors)===JSON.stringify(sourceColors)&&f.targetColors.every(([i,...rgb])=>sameRGB(palette[i],rgb))):null;
  const writes=HD_PALETTE_WRITES[sprite]||[];
  for(const write of observed?[...writes,{record:0,anchors:observed.anchors,observed:true}]:writes){
    const anchors=new Map(write.anchors.map(a=>[a[0],a]));
    if(sourceColors.length && sourceColors.every(([i,...rgb])=>{
      const a=anchors.get(i);return a&&sameRGB(rgb,a.slice(1,4))&&sameRGB(palette[i],a.slice(4));
    })){
      const key=entry?`${sprite}/${entry.slot}/${entry.frame}`:null,a=HD_MATERIAL_ANNOTATIONS[key];
      const annotation=a&&atlas?.sha256===a.atlasSHA256&&entry.sourceIndexedSHA===a.sourceIndexedSHA&&JSON.stringify(entry.rectPixels)===JSON.stringify(a.rectPixels)&&entry.scaleNativePerPixel===a.scaleNativePerPixel&&JSON.stringify(entry.translationNative)===JSON.stringify(a.translationNative)?a:null;
      const needsMaterial=write.observed===true||PALETTE_MATERIAL_REQUIRED[sprite]?.includes(write.record),knightConflict=sprite==='knight'&&entry?.slot===14&&entry?.frame===0&&[0,1].includes(write.record);
      if(needsMaterial&&!annotation)return {status:'requires-material-annotation',supported:false,variantId:`${sprite}@record${write.record}`,colorCoverageApproved:false,detail:'Actual painted material review found a color error; exact reviewed artwork registration is required.'};
      const exclude=knightConflict&&annotation?.kind==='index18-highlight'?[18]:[];
      const used=sourceColors.filter(c=>!exclude.includes(c[0])),plan=createPalettePlan(used,targetColorsForPalette(used,palette),{knownVariant:write.observed!==true,observedContext:write.observed===true,variantId:`${sprite}@record${write.record}`});
      if(plan.supported&&annotation&&(needsMaterial||exclude.length)){
        let annotations=[],preserveRegions=[];
        if(exclude.length){const[tx,ty]=entry.translationNative,s=entry.scaleNativePerPixel;preserveRegions=[{sourceIndex:18,sourcePixel:[31,10],center:[(31.5-tx)/s,(10.5-ty)/s],radius:.5/s,innerRadius:.22/s}];}
        else{const indices=['bigguy','death'].includes(sprite)?[239,238,237,236]:sprite==='evillady'?[84,83,82,81]:[228,235,234,233],byIndex=new Map(write.anchors.map(a=>[a[0],a]));annotations=[{id:annotation.kind,component:annotation.kind==='boots'?'brown':annotation.kind,...(annotation.polygons?{polygons:annotation.polygons}:{}),sourceRamp:indices.map(i=>byIndex.get(i).slice(1,4)),targetRamp:indices.map(i=>byIndex.get(i).slice(4))}];}
        plan.paintMaterials={annotations,preserveRegions};plan.materialGeometryReviewed=true;plan.majorityMappingApproximate=exclude.length>0;plan.signature+=JSON.stringify(plan.paintMaterials);
      }
      if(write.observed){plan.authority='runtime-observed';plan.nativeReachabilityVerified=false;plan.provisional=true;plan.contractSHA256=HD_OBSERVED_DEATH_CONTEXT.contractSHA256;plan.variantId='death@runtime-observed-record0';plan.signature+='|runtime-observed:'+plan.contractSHA256;}
      return plan;
    }
  }
  return null;
}
function cropCanvas(width,height){
  if(typeof OffscreenCanvas!=='undefined')return new OffscreenCanvas(width,height);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas;
}
async function defaultRecolorFrame(image,entry,plan,lut){
  const[x,y,width,height]=entry.rectPixels,canvas=cropCanvas(width,height),ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(image,x,y,width,height,0,0,width,height);
  const pixels=ctx.getImageData(0,0,width,height);
  let result=await applyPaletteRGBAAsync(pixels.data,plan,{lut});
  if(plan.paintMaterials)result=await applyPaintMaterialsAsync(pixels.data,result.pixels,width,plan.paintMaterials);
  if(!result.pixels)throw Error(result.reason);
  pixels.data.set(result.pixels);ctx.putImageData(pixels,0,0);return canvas;
}
function finite(value) { return Number.isFinite(value); }
function rect(value) { return Array.isArray(value) && value.length === 4 && value.every(finite) && value[0] >= 0 && value[1] >= 0 && value[2] > 0 && value[3] > 0; }
function pair(value) { return Array.isArray(value) && value.length === 2 && value.every(finite); }
function localPath(path) { return typeof path === 'string' && path.length > 0 && !/^(?:[a-z]+:|\/|\\)/i.test(path) && !path.split(/[\/\\]/).includes('..'); }
// Exact union of loaded map rectangles clipped to the current native viewport.
// Counts base-art coverage, not dynamic native tile patches drawn above it.
export function mapRegionCoverage(rectangles, viewport) {
  const [vx,vy,vw,vh]=viewport;
  const clipped=rectangles.map(([x,y,w,h])=>[Math.max(x,vx),Math.max(y,vy),Math.min(x+w,vx+vw),Math.min(y+h,vy+vh)]).filter(([x,y,r,b])=>r>x&&b>y);
  const xs=[...new Set(clipped.flatMap(r=>[r[0],r[2]]))].sort((a,b)=>a-b);let covered=0;
  for(let i=1;i<xs.length;i++){
    const intervals=clipped.filter(r=>r[0]<xs[i]&&r[2]>xs[i-1]).map(r=>[r[1],r[3]]).sort((a,b)=>a[0]-b[0]);let end=-Infinity,height=0;
    for(const[a,b]of intervals){height+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b);}
    covered+=(xs[i]-xs[i-1])*height;
  }
  return {hdBaseNativeArea:covered,originalBaseNativeArea:Math.max(0,vw*vh-covered)};
}
export function paletteVariantMatches(variant, palette) {
  return !!variant && Array.isArray(variant.colors) && variant.colors.every(([index,r,g,b]) => palette[index]?.[0] === r && palette[index]?.[1] === g && palette[index]?.[2] === b);
}
export function validateHDManifest(manifest) {
  const errors = [];
  if (manifest?.version !== 1) errors.push('Unsupported HD manifest version.');
  const atlases = manifest?.atlases || {}, variants = manifest?.paletteVariants || {};
  for (const [id,a] of Object.entries(atlases)) if (!localPath(a.src) || !finite(a.width) || !finite(a.height) || a.width <= 0 || a.height <= 0) errors.push(`Invalid atlas ${id}.`);
  for (const [id,v] of Object.entries(variants)) if (!Array.isArray(v.colors) || v.colors.some(c => !Array.isArray(c) || c.length !== 4 || c.some(n => !Number.isInteger(n) || n < 0 || n > 255))) errors.push(`Invalid palette variant ${id}.`);
  for (const kind of ['frames','maps','mapStatePatches','tilePatches','fonts']) for (const e of manifest?.[kind] || []) {
    const a = atlases[e.atlas];
    if (!a || !rect(e.rectPixels) || e.rectPixels[0]+e.rectPixels[2] > a.width || e.rectPixels[1]+e.rectPixels[3] > a.height) errors.push(`Invalid ${kind} atlas rectangle.`);
    if (!variants[e.paletteVariant]) errors.push(`Unknown palette variant ${e.paletteVariant}.`);
    if (kind === 'maps'||kind==='mapStatePatches') { if (typeof e.mapId !== 'string' || !rect(e.nativeRect)) errors.push('Invalid native map region.'); }
    else if (!finite(e.scaleNativePerPixel) || e.scaleNativePerPixel <= 0 || !pair(e.translationNative)) errors.push(`Invalid ${kind} uniform placement.`);
    if (kind === 'frames' && (typeof e.sprite !== 'string' || !Number.isInteger(e.slot) || !Number.isInteger(e.frame) || !pair(e.nativePivot))) errors.push('Invalid exact sprite/frame identity.');
    if (kind === 'tilePatches' && (typeof e.mapId !== 'string' || !Number.isInteger(e.tileId))) errors.push('Invalid tile patch identity.');
    if (kind === 'fonts' && !Number.isInteger(e.glyph)) errors.push('Invalid font glyph identity.');
    if(kind==='mapStatePatches'&&(e.opaque!==true||!Array.isArray(e.matchCells)||!e.matchCells.length))errors.push('Map state patch needs opaque art and a complete tile-word fingerprint.');
    if ((kind === 'maps'||kind==='mapStatePatches') && a && rect(e.rectPixels) && rect(e.nativeRect)) {
      const sx=e.nativeRect[2]/e.rectPixels[2], sy=e.nativeRect[3]/e.rectPixels[3];
      if (Math.abs(sx-sy) > 1e-7) errors.push('HD map regions require uniform scale; no aspect stretch.');
    }
  }
  return errors;
}
function defaultImageLoader(url) {
  return new Promise((resolve,reject) => { const image=new Image(); image.onload=()=>resolve(image); image.onerror=()=>reject(new Error('HD atlas unavailable.')); image.src=url.href; });
}
export class HDAssetBank {
  constructor(manifest, {base, loadImage=defaultImageLoader,maxDecodedBytes=64*1024*1024,maxAtlases=16,recolorFrame=defaultRecolorFrame,maxPaletteBytes=12*1024*1024,maxPaletteFrames=56,maxPaletteLUTBytes=4*1024*1024,maxPaletteLUTs=8}={}) {
    const errors=validateHDManifest(manifest); if(errors.length) throw new Error(errors.join(' '));
    this.manifest=manifest; this.base=base || new URL('../assets/hd/',import.meta.url); this.loadImage=loadImage;
    this.images=new Map(); this.pending=new Map(); this.failures=new Map();this.maxDecodedBytes=maxDecodedBytes;this.maxAtlases=maxAtlases;this.evictions=0;this.activeLoads=0;this.loadQueue=[];this.maxConcurrentLoads=4;
    this.entries={}; for(const k of ['frames','maps','mapStatePatches','tilePatches','fonts'])this.entries[k]=(manifest[k]||[]).filter(e=>e.status===APPROVED);
    this.paletteImages=new Map();this.paletteBytes=0;this.palettePending=new Map();this.paletteFailures=new Map();this.paletteQueue=[];this.paletteActive=false;this.paletteEvictions=0;this.recolorFrame=recolorFrame;
    this.maxPaletteBytes=Math.min(12*1024*1024,Math.max(0,maxPaletteBytes));this.maxPaletteFrames=Math.min(56,Math.max(1,maxPaletteFrames));
    this.paletteLUTs=new PaletteRGBACache({maxBytes:Math.min(4*1024*1024,Math.max(0,maxPaletteLUTBytes)),maxEntries:Math.min(8,Math.max(1,maxPaletteLUTs))});
  }
  touch(id) {const image=this.images.get(id);if(image){this.images.delete(id);this.images.set(id,image);}return image;}
  beginDemandFrame() {this.demandAtlases=new Set();this.demandPalettes=new Set();this.trackingDemand=true;}
  endDemandFrame() {
    this.trackingDemand=false;
    const atlases=[...(this.demandAtlases||[])].filter(id=>!this.images.has(id)),palettes=[...(this.demandPalettes||[])].filter(key=>!this.paletteImages.has(key));
    return {ready:!atlases.length&&!palettes.length,atlases,palettes,failed:atlases.some(id=>this.failures.has(id))||palettes.some(key=>this.paletteFailures.has(key))};
  }
  prune() {let bytes=[...this.images.values()].reduce((n,i)=>n+i.width*i.height*4,0);while(this.images.size>1&&(this.images.size>this.maxAtlases||bytes>this.maxDecodedBytes)){const [id,image]=[...this.images.entries()].find(([key])=>!this.demandAtlases?.has(key))||this.images.entries().next().value;this.images.delete(id);bytes-=image.width*image.height*4;image.close?.();this.evictions++;}}
  async preloadAtlases(ids) {
    return Promise.all([...new Set(ids)].map(id=>this.ensureAtlas(id)));
  }
  async preloadScene(id) { return this.preloadAtlases(this.manifest.scenes?.[id]?.atlases || []); }
  ensureAtlas(id) {
    if(this.trackingDemand)this.demandAtlases.add(id);
    if(this.images.has(id)){this.touch(id);return Promise.resolve(true);}
    if(this.pending.has(id))return this.pending.get(id);
    if(this.failures.has(id)||!this.manifest.atlases[id])return Promise.resolve(false);
    const meta=this.manifest.atlases[id], url=new URL(meta.src,this.base);
    if(url.origin!==this.base.origin)return Promise.resolve(false);
    let finish;const promise=new Promise(resolve=>{finish=resolve;});this.pending.set(id,promise);
    this.loadQueue.push(async()=>{try{const image=await this.loadImage(url);
      if(image.width!==meta.width||image.height!==meta.height)throw new Error('HD atlas dimensions differ from manifest.');
      this.images.set(id,image);this.prune();finish(true);
    }catch(error){this.failures.set(id,String(error.message||error));finish(false);}finally{this.pending.delete(id);}});
    this.drainLoads();return promise;
  }
  drainLoads() {while(this.activeLoads<this.maxConcurrentLoads&&this.loadQueue.length){const work=this.loadQueue.shift();this.activeLoads++;work().finally(()=>{this.activeLoads--;this.drainLoads();});}}
  pick(kind, predicate, palette) {
    const candidates=this.entries[kind].filter(predicate), matched=candidates.filter(e=>paletteVariantMatches(this.manifest.paletteVariants[e.paletteVariant],palette));
    for(const entry of matched){if(this.trackingDemand)this.demandAtlases.add(entry.atlas);const image=this.touch(entry.atlas);if(image)return {entry,image};this.ensureAtlas(entry.atlas);}
    return {reason:!candidates.length?'missing':!matched.length?'palette-variant':matched.some(e=>this.failures.has(e.atlas))?'atlas-failed':'loading'};
  }
  frame(sprite,slot,frame,palette,nativeFrame) {
    const found=this.pick('frames',e=>e.sprite===sprite&&e.slot===slot&&e.frame===frame,palette);
    if(found.entry && (found.entry.nativePivot[0]!==nativeFrame.pivotX || found.entry.nativePivot[1]!==nativeFrame.pivotY))return {reason:'native-pivot-mismatch'};
    if(found.reason==='palette-variant'){
      for(const entry of this.entries.frames.filter(e=>e.sprite===sprite&&e.slot===slot&&e.frame===frame)){
        if(entry.nativePivot[0]!==nativeFrame.pivotX||entry.nativePivot[1]!==nativeFrame.pivotY)continue;
        const plan=verifiedPalettePlan(sprite,this.manifest.paletteVariants[entry.paletteVariant].colors,palette,{entry,atlas:this.manifest.atlases[entry.atlas]});
        if(!plan)continue;
        if(!plan.supported)return {reason:plan.status};
        const key=this.paletteKey(entry,plan),image=this.paletteImages.get(key);
        if(this.trackingDemand)this.demandPalettes.add(key);
        if(image){this.paletteImages.delete(key);this.paletteImages.set(key,image);return {image,entry:{...entry,rectPixels:[0,0,...entry.rectPixels.slice(2)]},paletteTransform:{variant:plan.variantId,...(plan.provisional?{authority:plan.authority,nativeReachabilityVerified:false,provisional:true,contractSHA256:plan.contractSHA256}:{}),approximate:true,materialGeometryReviewed:plan.materialGeometryReviewed===true,majorityMappingApproximate:plan.majorityMappingApproximate===true,colorCoverageApproved:false}};}
        this.ensurePaletteFrame(entry,plan);
        return {reason:this.paletteFailures.has(key)?'palette-transform-failed':'palette-transform-loading'};
      }
    }
    return found;
  }
  paletteKey(entry,plan){return JSON.stringify([this.manifest.atlases[entry.atlas].sha256||this.manifest.atlases[entry.atlas].src,entry.rectPixels,plan.signature]);}
  ensurePaletteFrame(entry,plan){
    const key=this.paletteKey(entry,plan);
    if(this.paletteImages.has(key))return Promise.resolve(true);
    if(this.palettePending.has(key))return this.palettePending.get(key);
    if(!plan.supported||this.paletteFailures.has(key)||this.palettePending.size>=64)return Promise.resolve(false);
    let finish;const promise=new Promise(resolve=>{finish=resolve;});this.palettePending.set(key,promise);
    this.paletteQueue.push(async()=>{
      try{
        if(!await this.ensureAtlas(entry.atlas))throw Error('Source atlas unavailable.');
        // Atlas may be evicted by other asynchronous loads; retry rather than retain a stale bitmap.
        let image=this.touch(entry.atlas);if(!image){await this.ensureAtlas(entry.atlas);image=this.touch(entry.atlas);}
        if(!image)throw Error('Source atlas evicted before crop.');
        let values=this.paletteLUTs.get(plan.signature),lut;
        if(values)lut={supported:true,size:33,signature:plan.signature,values};
        else{lut=await compilePaletteLUTAsync(plan);this.paletteLUTs.set(plan.signature,lut.values);}
        // An atlas can be closed during LUT generation; reacquire immediately before copying crop.
        if(!this.images.has(entry.atlas))await this.ensureAtlas(entry.atlas);
        image=this.touch(entry.atlas);
        if(!image)throw Error('Source atlas unavailable before crop.');
        const result=await this.recolorFrame(image,entry,plan,lut),bytes=result.width*result.height*4;
        if(result.width!==entry.rectPixels[2]||result.height!==entry.rectPixels[3])throw Error('Palette result must preserve exact crop size.');
        if(bytes>this.maxPaletteBytes){result.close?.();finish(false);return;}
        this.paletteImages.set(key,result);this.paletteBytes+=bytes;
        while(this.paletteBytes>this.maxPaletteBytes||this.paletteImages.size>this.maxPaletteFrames){const[k,old]=[...this.paletteImages.entries()].find(([key])=>!this.demandPalettes?.has(key))||this.paletteImages.entries().next().value;this.paletteImages.delete(k);this.paletteBytes-=old.width*old.height*4;old.close?.();this.paletteEvictions++;}
        finish(true);
      }catch(error){this.paletteFailures.set(key,String(error.message||error));while(this.paletteFailures.size>64)this.paletteFailures.delete(this.paletteFailures.keys().next().value);finish(false);}
      finally{this.palettePending.delete(key);}
    });this.drainPalette();return promise;
  }
  drainPalette(){if(this.paletteActive||!this.paletteQueue.length)return;this.paletteActive=true;this.paletteQueue.shift()().finally(()=>{this.paletteActive=false;this.drainPalette();});}
  async preloadPaletteFrames(sprite,palette,{slots=null,frames=null,limit=8}={}){
    const results=[];
    for(const entry of this.entries.frames.filter(e=>e.sprite===sprite&&(!slots||slots.includes(e.slot))&&(!frames||frames.some(f=>f.slot===e.slot&&f.frame===e.frame))).slice(0,Math.max(0,Math.min(64,limit)))){
      if(paletteVariantMatches(this.manifest.paletteVariants[entry.paletteVariant],palette)){results.push(await this.ensureAtlas(entry.atlas));continue;}
      const plan=verifiedPalettePlan(sprite,this.manifest.paletteVariants[entry.paletteVariant].colors,palette,{entry,atlas:this.manifest.atlases[entry.atlas]});
      results.push(!!plan?.supported&&await this.ensurePaletteFrame(entry,plan));
    }
    return results.length>0&&results.every(Boolean);
  }
  mapRegions(mapId,palette,viewport=null) {
    const records=[]; for(const entry of this.entries.maps.filter(e=>e.mapId===mapId)) {
      if(viewport){const[x,y,w,h]=entry.nativeRect,[vx,vy,vw,vh]=viewport;if(x+w<=vx||y+h<=vy||x>=vx+vw||y>=vy+vh)continue;}
      if(!paletteVariantMatches(this.manifest.paletteVariants[entry.paletteVariant],palette))continue;
      if(this.trackingDemand)this.demandAtlases.add(entry.atlas);const image=this.touch(entry.atlas);if(image)records.push({entry,image});else this.ensureAtlas(entry.atlas);
    } return records;
  }
  statePatches(mapId,palette,map,overrides=[],viewport=null){
    const candidates=this.entries.mapStatePatches.filter(e=>paletteVariantMatches(this.manifest.paletteVariants[e.paletteVariant],palette));
    return matchingMapStatePatches(candidates,mapId,palette,map,overrides,viewport).flatMap(entry=>{if(this.trackingDemand)this.demandAtlases.add(entry.atlas);const image=this.touch(entry.atlas);if(image)return[{entry,image}];this.ensureAtlas(entry.atlas);return[];});
  }
  tile(mapId,tileId,palette) { return this.pick('tilePatches',e=>e.mapId===mapId&&e.tileId===tileId,palette); }
  font(glyph,palette) { return this.pick('fonts',e=>e.glyph===glyph,palette); }
  async preloadRequest(request) {
    let entries=[];
    if(request.kind==='map')entries=[...this.entries.maps,...this.entries.mapStatePatches].filter(e=>e.mapId===request.mapId&&(!request.viewport||(()=>{const[x,y,w,h]=e.nativeRect,[vx,vy,vw,vh]=request.viewport;return x+w>vx&&y+h>vy&&x<vx+vw&&y<vy+vh;})()));
    else if(request.kind==='sprite')entries=this.entries.frames.filter(e=>e.sprite===(request.bank||request.sprite)&&e.slot===request.slot&&e.frame===request.frame);
    else if(request.kind==='font')entries=this.entries.fonts;
    if(!entries.length)return false;
    const loaded=await this.preloadAtlases(entries.map(e=>e.atlas));
    if(request.kind==='font')return Array.from({length:request.glyphCount},(_,i)=>i).every(g=>entries.some(e=>e.glyph===g&&this.images.has(e.atlas)));
    return loaded.some(Boolean);
  }
  coverage() { return {approvedFrames:new Set(this.entries.frames.map(e=>`${e.sprite}:${e.slot}:${e.frame}`)).size,approvedFrameVariants:this.entries.frames.length,approvedMapRegions:this.entries.maps.length,approvedMapStatePatches:this.entries.mapStatePatches.length,approvedTilePatches:this.entries.tilePatches.length,approvedGlyphs:this.entries.fonts.length,loadedAtlases:this.images.size,pendingAtlases:this.pending.size,failedAtlases:this.failures.size,decodedBytes:[...this.images.values()].reduce((n,i)=>n+i.width*i.height*4,0),evictions:this.evictions,paletteDerivedFrames:this.paletteImages.size,palettePending:this.palettePending.size,paletteFailed:this.paletteFailures.size,paletteCacheBytes:this.paletteBytes+this.paletteLUTs.bytes,paletteEvictions:this.paletteEvictions,paletteColorCoverageApproved:false,declaredComplete:this.manifest.coverage?.complete===true&&this.manifest.coverage?.paletteComplete===true}; }
}
export async function loadHDAssets(base, options={}) {
  try { const response=await fetch(new URL('manifest.json',base)); if(!response.ok)throw Error('HD manifest unavailable.'); return new HDAssetBank(await response.json(),{...options,base}); }
  catch(error) { const bank=new HDAssetBank({version:1,atlases:{},paletteVariants:{},frames:[],maps:[],fonts:[],tilePatches:[]},{...options,base});bank.manifestError=String(error.message||error);return bank; }
}
