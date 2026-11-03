import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
import{qualifyInterfaceAssets,drawInterfaceSprite,hasQualifiedSelectionHeading,compileArcadeGlyph,fittedInterfaceText}from'../dist/js/hd-interface.js';import{HD_INTERFACE_SPECS,HD_SELECTION_HEADING,HD_ARCADE_FONT_ROWS}from'../dist/js/hd-interface-spec.js';import{Renderer}from'../dist/js/renderer.js';import{NativeVectorFont}from'../dist/js/hd-native-font.js';
const assets=JSON.parse(await readFile(new URL('../dist/assets/game.json',import.meta.url)));assets.spritePixels=new Uint8Array(await readFile(new URL('../dist/assets/sprites.bin',import.meta.url)));assets.fontPixels=new Uint8Array(await readFile(new URL('../dist/assets/font.bin',import.meta.url)));const cells=await readFile(new URL('../dist/assets/levelc.map.bin',import.meta.url)),v=new DataView(cells.buffer,cells.byteOffset,cells.byteLength);assets.maps.c.cells=Uint16Array.from({length:cells.byteLength/2},(_,i)=>v.getUint16(i*2,true));assets.maps.c.tiles=new Uint8Array(await readFile(new URL('../dist/assets/levelc.tiles.bin',import.meta.url)));assets.hdInterface=await qualifyInterfaceAssets(assets);
test('all82 smooth interface identities match actual source headers/indexed pixels, including nontext SEGAlinked contours',()=>{assert.equal(Object.keys(HD_INTERFACE_SPECS).length,82);assert.equal(assets.hdInterface.sprites.size,82);assert(assets.hdInterface.font);assert.deepEqual(assets.hdInterface.rejected,[]);assert.equal(HD_INTERFACE_SPECS['title1/0/8'],undefined);assert.equal(HD_INTERFACE_SPECS['title3/0/1'].kind,'source-logo');assert.equal(HD_INTERFACE_SPECS['title1/0/0'].kind,'block-logo');assert(!HD_INTERFACE_SPECS['title1/0/0'].text);assert.equal(HD_INTERFACE_SPECS['title3/0/3'].text,'BY JOHN AND KENN.SANDERSON');});
test('pixel or header mutations reject the exact override instead of guessing content or silently accepting changed font',async()=>{const changed={...assets,sprites:JSON.parse(JSON.stringify(assets.sprites)),spritePixels:assets.spritePixels.slice(),fontPixels:assets.fontPixels.slice()};changed.sprites.title3.slots[0].frames[0].rawHeader[0]^=1;changed.spritePixels[changed.sprites.score.slots[0].frames[8].offset]^=1;changed.fontPixels[0]^=1;const q=await qualifyInterfaceAssets(changed);assert.equal(q.font,false);assert(!q.sprites.has('score/0/8'));assert(!q.sprites.has('title3/0/0'));assert(q.sprites.has('score/0/9'));});
test('renderer preload predicate accepts only canonical source-qualified vectors, leaving illustration/sword/splash frames raster',()=>{const r={assets};assert(Renderer.prototype.hasHDVectorFrame.call(r,'score',0,8));assert(!Renderer.prototype.hasHDVectorFrame.call(r,'score',0,15));assert(!Renderer.prototype.hasHDVectorFrame.call(r,'scoring',0,3));assert(!Renderer.prototype.hasHDVectorFrame.call(r,'title1',0,8));assert(!Renderer.prototype.hasHDVectorFrame.call(r,'missing',0,0));});
test('arcade font draws source-shaped chamfered paths without platform text substitution',()=>{
 const f=new NativeVectorFont(assets.fontPixels,{smooth:true}),calls=[],ctx={save(){},restore(){},translate(){},scale(){},fillRect:(...a)=>calls.push(['background',...a]),beginPath(){},moveTo:(...a)=>calls.push(['move',...a]),lineTo:(...a)=>calls.push(['line',...a]),closePath(){},fill:(...a)=>calls.push(['fill',...a]),quadraticCurveTo:(...a)=>calls.push(['curve',...a]),stroke(){},measureText(){throw Error('OS font metrics forbidden')},fillText(){throw Error('OS font substitution forbidden')}};
 assert.equal(f.classification,'remastered-vector-typography');assert(f.drawGlyph(ctx,65-32,0,0,{foreground:'#fff'}));assert(calls.some(c=>c[0]==='line'&&c.slice(1).some(n=>!Number.isInteger(n))));assert(calls.some(c=>c[0]==='fill'&&c[1]==='evenodd'));
 fittedInterfaceText(ctx,'MAGIC 0123456789 © ™ ~',[0,0,120,12],{fill:'#fff',stroke:'#000'});
 assert(f.drawGlyph(ctx,96-32,0,0,{foreground:'#fff'}));assert(calls.some(c=>c[0]==='curve'));assert.equal(f.glyphs.length,72);assert.equal(drawInterfaceSprite(ctx,{kind:'unknown'},[]),false);
});
test('all64 arcade alphabet row masks are actual source FONT ink; contours preserve every foreground cell and counter',()=>{
 function inside(x,y,points){let v=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const[a,b]=points[i],[c,d]=points[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)v=!v;}return v;}
 for(let glyph=0;glyph<64;glyph++){
  const rows=HD_ARCADE_FONT_ROWS[glyph],compiled=compileArcadeGlyph(rows);
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){
   const source=assets.fontPixels[glyph*64+y*8+x]===143;assert.equal(!!(rows[y]&(1<<(7-x))),source);
   assert.equal(compiled.paths.reduce((v,p)=>v!==inside(x+.5,y+.5,p),false),source,`glyph${glyph} pixel${x},${y}`);
  }
 }
});


test('selection heading requires exact source map/cells and exact reviewed HD background before clearing the isolated black region',async()=>{
 assert(assets.hdInterface.selectionHeading);const a={...assets,hd:{manifest:{atlases:{'map-c':{sha256:HD_SELECTION_HEADING.atlasSHA}}}}};assert(hasQualifiedSelectionHeading(a));a.hd.manifest.atlases['map-c'].sha256='changed';assert(!hasQualifiedSelectionHeading(a));const map={...assets.maps.c,cells:assets.maps.c.cells.slice()};map.cells[0]^=1;const q=await qualifyInterfaceAssets({...assets,maps:{...assets.maps,c:map}});assert(!q.selectionHeading);assert(q.sprites.has('score/0/8'));
});
