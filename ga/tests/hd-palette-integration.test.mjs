import test from 'node:test';import assert from 'node:assert/strict';
import {HDAssetBank,verifiedPalettePlan} from '../dist/js/hd-assets.js';
import {HD_PALETTE_WRITES} from '../dist/js/hd-palette-writes.js';
import {createPalettePlan,compilePaletteLUT,compilePaletteLUTAsync,applyPaletteRGBA,applyPaletteRGBAAsync} from '../dist/js/hd-palette.js';
const w=HD_PALETTE_WRITES.heninger.find(w=>w.record===15);
const colors=w.anchors.map(a=>a.slice(0,4));
const palette=Array.from({length:256},()=>[0,0,0]);for(const a of w.anchors)palette[a[0]]=a.slice(4);
const pivot={pivotX:34,pivotY:49};
function manifest(n=1){return{version:1,atlases:{a:{src:'a.png',width:8*n,height:8}},paletteVariants:{base:{colors}},frames:Array.from({length:n},(_,frame)=>({sprite:'heninger',slot:0,frame,paletteVariant:'base',atlas:'a',rectPixels:[frame*8,0,8,8],nativePivot:[34,49],scaleNativePerPixel:.5,translationNative:[-2,-3],status:'approved'}))};}
const native=palette.map(c=>[...c]);for(const [i,r,g,b] of colors)native[i]=[r,g,b];
test('only 37 exact verified source writes authorize RGB rendering; unknown and Knight ambiguity fail closed',()=>{
 assert.equal(Object.values(HD_PALETTE_WRITES).flat().length,37);
 assert(verifiedPalettePlan('heninger',colors,palette).supported);
 const unknown=palette.map(c=>[...c]);unknown[w.anchors[0][0]][0]^=1;assert.equal(verifiedPalettePlan('heninger',colors,unknown),null);
 const k=HD_PALETTE_WRITES.knight.find(w=>w.record===0),p=palette.map(c=>[...c]);for(const a of k.anchors)p[a[0]]=a.slice(4);
 assert.equal(verifiedPalettePlan('knight',k.anchors.map(a=>a.slice(0,4)),p).status,'requires-material-annotation');
});
test('async LUT/buffer match synchronous math and preserve alpha and identity reference',async()=>{
 const plan=verifiedPalettePlan('heninger',colors,palette);let yields=0;
 const lut=await compilePaletteLUTAsync(plan,{size:9,chunk:100,yieldControl:async()=>{yields++;}});assert.deepEqual(lut.values,compilePaletteLUT(plan,{size:9}).values);assert(yields>0);
 const input=new Uint8ClampedArray([25,42,55,0,227,162,130,19,65,32,0,255]);
 assert.deepEqual((await applyPaletteRGBAAsync(input,plan,{lut,chunkPixels:1})).pixels,applyPaletteRGBA(input,plan,{lut}).pixels);
 const identity=createPalettePlan(colors,colors);assert.equal((await applyPaletteRGBAAsync(input,identity)).pixels,input);
});
test('reentrant requests share a single crop job; original mode lookup remains exact during async derivation',async()=>{
 let calls=0,release;const gate=new Promise(r=>release=r),m=manifest();
 const b=new HDAssetBank(m,{loadImage:async()=>({width:8,height:8}),recolorFrame:async(_image,entry)=>{calls++;await gate;return{width:8,height:8}}});await b.ensureAtlas('a');
 assert.equal(b.frame('heninger',0,0,palette,pivot).reason,'palette-transform-loading');
 const plan=verifiedPalettePlan('heninger',colors,palette),p=b.ensurePaletteFrame(m.frames[0],plan);assert.equal(p,b.ensurePaletteFrame(m.frames[0],plan));
 // This is the original/HD switch invariant: deriving changes neither raw image nor identity path.
 assert.equal(b.frame('heninger',0,0,native,pivot).image,b.images.get('a'));
 release();assert.equal(await p,true);assert.equal(calls,1);
 const result=b.frame('heninger',0,0,palette,pivot);assert.deepEqual(result.entry.translationNative,[-2,-3]);assert.deepEqual(result.entry.nativePivot,[34,49]);assert.deepEqual(result.entry.rectPixels,[0,0,8,8]);assert.equal(result.paletteTransform.colorCoverageApproved,false);
});
test('crop cache evicts independently from 64MiB atlas cache and never reuses another frame placement',async()=>{
 const m=manifest(3);m.frames[2].translationNative=[7,8];let closed=0;
 const b=new HDAssetBank(m,{loadImage:async()=>({width:24,height:8}),maxPaletteBytes:512,maxPaletteFrames:2,recolorFrame:async()=>({width:8,height:8,close(){closed++;}})});
 await b.preloadPaletteFrames('heninger',palette);assert.equal(b.paletteImages.size,2);assert.equal(b.paletteBytes,512);assert.equal(closed,1);assert.equal(b.images.size,1);assert.equal(b.coverage().evictions,0);assert(b.coverage().paletteCacheBytes<=16*1024*1024);
 assert.deepEqual(b.frame('heninger',0,2,palette,pivot).entry.translationNative,[7,8]);assert.equal(b.coverage().declaredComplete,false);
});
