import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';
import{createPalettePlan,samplePaletteRGB,compilePaletteLUT,applyPaletteRGBA,PaletteRGBACache,targetColorsForPalette}from'../dist/js/hd-palette.js';
const fixture=JSON.parse(await readFile(new URL('./fixtures/hd-palette-source-variants.json',import.meta.url)));
const variant=(sprite,record)=>fixture.variants.find(v=>v.sprite===sprite&&v.record===record);

test('identity preserves buffer identity and every RGBA byte including transparent hidden RGB',()=>{
 const {sourceColors}=variant('heninger',15),plan=createPalettePlan(sourceColors,sourceColors),pixels=new Uint8ClampedArray([33,44,55,0,100,120,140,128,255,7,9,255]);
 const result=applyPaletteRGBA(pixels,plan);assert.equal(result.status,'identity');assert.equal(result.pixels,pixels);assert.deepEqual([...result.pixels],[33,44,55,0,100,120,140,128,255,7,9,255]);
});

test('all35functional bank mappings hit exact source anchors; two knight collisions require annotation',()=>{
 let supported=0,ambiguous=0;
 for(const v of fixture.variants){const p=createPalettePlan(v.sourceColors,v.targetColors,{knownVariant:true,variantId:`${v.sprite}/${v.record}`});
  if(v.expectedAmbiguous){assert.equal(p.status,'requires-material-annotation');assert.equal(p.supported,false);assert.equal(applyPaletteRGBA(new Uint8ClampedArray(4),p).pixels,null);ambiguous++;continue;}
  assert.equal(p.supported,true,`${v.sprite}/${v.record}: ${p.status}`);supported++;
  for(let i=0;i<v.sourceColors.length;i++)assert.deepEqual(samplePaletteRGB(p,v.sourceColors[i].slice(1)),v.targetColors[i].slice(1));
  assert.equal(p.colorCoverageApproved,false);
 }
 assert.equal(supported,35);assert.equal(ambiguous,2);
});

test('LUT application keeps source anchors exact, alpha byteexact and source input immutable',()=>{
 const v=variant('heninger',15),p=createPalettePlan(v.sourceColors,v.targetColors,{knownVariant:true}),lut=compilePaletteLUT(p),pixels=new Uint8ClampedArray(v.sourceColors.flatMap(([,r,g,b],i)=>[r,g,b,i%2?128:255]));const before=new Uint8ClampedArray(pixels);
 const r=applyPaletteRGBA(pixels,p,{lut});assert.equal(r.status,'transformed');assert.notEqual(r.pixels,pixels);assert.deepEqual(pixels,before);
 for(let i=0;i<v.sourceColors.length;i++){assert.deepEqual([...r.pixels.slice(i*4,i*4+3)],v.targetColors[i].slice(1));assert.equal(r.pixels[i*4+3],before[i*4+3]);}
 const hidden=new Uint8ClampedArray([200,20,70,0]),h=applyPaletteRGBA(hidden,p,{lut});assert.deepEqual(h.pixels,hidden);
});

test('unknown, sparse and globalflash inputs do not pretend to support a material recolor',()=>{
 const v=variant('longmoan',15);assert.equal(createPalettePlan(v.sourceColors,v.targetColors).status,'unverified-source-variant');
 assert.equal(createPalettePlan([[1,10,20,30],[2,50,80,100]],[[1,100,20,30],[2,50,80,100]],{knownVariant:true}).status,'unsupported-sparse-colors');
 const source=[[1,10,20,30],[2,50,80,100],[3,200,150,50],[4,240,220,210]],white=source.map(([i])=>[i,255,255,255]);
 assert.equal(createPalettePlan(source,white,{knownVariant:true}).status,'unsupported-global-effect');
 const bad=targetColorsForPalette(v.sourceColors,[]);assert.equal(createPalettePlan(v.sourceColors,bad,{knownVariant:true}).supported,false);
});

test('bounded palette cache evicts LRU entries and accounts replacement bytes',()=>{
 const c=new PaletteRGBACache({maxBytes:24,maxEntries:2}),a=new Uint8ClampedArray(8),b=new Uint8ClampedArray(8),d=new Uint8ClampedArray(8);assert(c.set('a',a));assert(c.set('b',b));assert.equal(c.get('a'),a);assert(c.set('d',d));assert.equal(c.get('b'),null);assert.equal(c.bytes,16);assert(!c.set('huge',new Uint8ClampedArray(28)));assert.equal(c.bytes,16);c.set('a',new Uint8ClampedArray(4));assert.equal(c.bytes,12);c.clear();assert.equal(c.bytes,0);
});
