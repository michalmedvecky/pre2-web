import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../dist/assets/',import.meta.url);
const game=JSON.parse(await readFile(new URL('game.json',root),'utf8'));
const {Renderer}=await import('../dist/js/render.js');
const buf=async n=>new Uint8Array(await readFile(new URL(n,root)));
const a={game,maps:{},tiles:{},footers:{},backgrounds:{},screens:{}};
for(const [k,n] of Object.entries({spritesPixels:'sprites.idx',union:'union.idx',front:'front.idx',hud:'hud.idx',fonts:'fonts.bin',tables:'tables.bin'}))a[k]=await buf(n);
for(const l of game.levels){a.maps[l.id]=await buf(l.map);a.tiles[l.id]=await buf(l.tiles);a.footers[l.id]=await buf(l.footer);}
for(const [n,b] of Object.entries(game.backgrounds))a.backgrounds[n]=await buf(b.file);
for(const [n,b] of Object.entries(game.screens))a.screens[n]=await buf(b.file);
function renderer(){return new Renderer({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:()=>{}})},a);}
test('all sixteen level banks and all460 indexed sprites retain extents',()=>{for(const l of game.levels){assert.equal(a.maps[l.id].length,l.width*l.height);assert.equal(a.tiles[l.id].length,l.localTileCount*256);assert.equal(a.footers[l.id].length,5029);}assert.equal(game.sprites.length,460);const last=game.sprites.at(-1);assert.equal(last.pixelOffset+last.width*last.height,a.spritesPixels.length);assert.equal(game.sprites[0].rawOriginY,36);assert.equal(game.sprites[0].originY,0);});
test('sprite anchor transformation matches initialized DOS bottom coordinate',()=>{const r=renderer();r.sprite(0,100,100);const s=game.sprites[0];for(let y=0;y<s.height;y++)for(let x=0;x<s.width;x++)assert.equal(r.frame[(100-s.height+y)*320+80+x],a.spritesPixels[s.pixelOffset+y*s.width+x]);});
test('HUD glyphs decode original16x12 source planes without substitutions',()=>{const r=renderer();assert.equal(r.glyphs.length,50);r.glyph(0,0,0);for(let y=0;y<12;y++)for(let x=0;x<16;x++){let v=0;for(let k=0;k<4;k++)v|=((a.fonts[0x1610+k*24+y*2+(x>>3)]>>(7-(x&7)))&1)<<k;assert.equal(r.frame[y*320+x],v);}});
test('all sixteen worlds render repeatable indexed frames and maintain HUD clipping',()=>{const r=renderer();for(let i=0;i<game.levels.length;i++){const level=game.levels[i];const world={level,levelIndex:i,map:a.maps[level.id],player:{x:level.start.x,y:level.start.y,sprite:0},camera:{x:Math.max(0,level.start.x-100),y:Math.max(0,level.start.y-120)},score:1234,lives:3,health:2,frame:0};r.render(world);const first=createHash('sha256').update(r.frame).digest('hex');r.render(world);assert.equal(createHash('sha256').update(r.frame).digest('hex'),first);assert.equal(r.imageData.data.length,256000);assert.ok(r.frame.every(v=>v<16));assert.equal(r.frame[176*320],a.hud[0]);}});
test('title screen retains all256 palette indices and original RGB conversion',()=>{const r=renderer();r.renderScreen('MENU');assert.deepEqual(r.frame,a.screens.MENU);for(let i=0;i<64000;i+=177){const p=r.frame[i]*3;assert.equal(r.imageData.data[i*4],game.screens.MENU.palette[p]);assert.equal(r.imageData.data[i*4+3],255);}});
test('separate club layer changes playfield pixels and retains original HUD clipping',()=>{const r=renderer(),l=game.levels[0],w={level:l,levelIndex:0,map:a.maps[l.id],camera:{x:0,y:560},player:{x:100,y:672,sprite:34},frame:0};r.render(w);const without=r.frame.slice();w.playerWeapon={x:89,y:656,sprite:58};r.render(w);assert.ok(r.frame.some((v,i)=>i<176*320&&v!==without[i]),'club must contribute visible pixels');assert.deepEqual(r.frame.slice(176*320),without.slice(176*320));});
test('enemy hit flash uses the original white silhouette and preserves transparent pixels',()=>{const r=renderer();r.frame.fill(3);r.sprite(313|0x4000,100,100);const s=game.sprites[313];for(let y=0;y<s.height;y++)for(let x=0;x<s.width;x++){const pixel=a.spritesPixels[s.pixelOffset+y*s.width+x],out=r.frame[(100+s.originY-s.height+y)*320+100-s.originX+x];assert.equal(out,pixel?15:3);}});
test('world palette override persists while authored base palette remains immutable',()=>{const r=renderer(),l=game.levels[0],base=game.palettes[0].rgb8_scaled.slice(),palette=base.slice();palette[0]=123;const w={level:l,levelIndex:0,map:a.maps[l.id],camera:{x:0,y:0},paletteOverride:palette};r.render(w);assert.equal(r.palette,palette);assert.deepEqual(game.palettes[0].rgb8_scaled,base);r.render(w);assert.equal(r.palette[0],123);});
test('all five final boss tile poses use distinct original indexed art without touching the HUD',()=>{const r=renderer(),level=game.levels[9],hashes=new Set();for(let pose=0;pose<5;pose++){r.render({level,levelIndex:9,map:a.maps[level.id],camera:{x:0,y:0},finalBoss:{pose},bossStatus:[{x:8,y:170,sprite:309}]});hashes.add(createHash('sha256').update(r.frame).digest('hex'));assert.equal(r.frame[176*320],a.hud[0]);assert.ok(r.frame.every(v=>v<16));}assert.equal(hashes.size,5);});

test('IDKFA draws a reversible overlay in every world while preserving the original HUD and asset maps',()=>{const r=renderer();for(let i=0;i<game.levels.length;i++){const l=game.levels[i],before=a.maps[l.id].slice(),w={level:l,levelIndex:i,map:a.maps[l.id],camera:{x:0,y:0},player:{x:40,y:100,sprite:9},blocks:[{index:0,pos:5*256+3,active:true}],gates:[],items:[],frame:0};r.render(w);const plain=r.frame.slice();w.secretHints=true;r.render(w);assert.ok(r.frame.some((v,n)=>n<176*320&&v!==plain[n]));assert.deepEqual(r.frame.slice(176*320),plain.slice(176*320));assert.deepEqual(a.maps[l.id],before);w.secretHints=false;r.render(w);assert.deepEqual(r.frame,plain);}});

test('level-one scenery never draws unflagged FRONT20 foliage, while real foreground tiles still cover actors',()=>{
 const r=renderer(),l=game.levels[0],calls=[],tile=r.tile.bind(r);r.tile=(value,x,y,level,front,...rest)=>{if(front)calls.push({value,x,y});return tile(value,x,y,level,front,...rest);};
 // Authored tile41 at (33,34) has a stale overlay index20 but no bit40.
 assert.equal(a.maps['1'][34*256+33],41);assert.equal(l.overlayIndices[41],20);assert.equal(l.tilePropertiesMisc[41]&64,0);
 r.render({level:l,map:a.maps['1'],camera:{x:512,y:416}});assert.equal(calls.length,0);
 const forest=game.levels[1],map=new Uint8Array(256*forest.height);map[8*256+6]=148;assert.equal(forest.tilePropertiesMisc[148]&64,64);assert.equal(forest.overlayIndices[148],1);
 r.render({level:forest,map,camera:{x:0,y:0},player:{x:104,y:150,sprite:9}});assert.ok(calls.some(c=>c.value===1&&c.x===96&&c.y===128));
});
test('native bush triplets animate through all three distinct poses without changing map or HUD',()=>{
 const r=renderer(),l=game.levels[0],map=a.maps[l.id].slice(),before=map.slice(),hashes=new Set(),hud=[];
 for(let phase=0;phase<3;phase++){r.render({level:l,map,camera:{x:0,y:608},tileAnimationPhase:phase});hashes.add(createHash('sha256').update(r.frame.slice(0,176*320)).digest('hex'));hud.push(r.frame.slice(176*320));}
 assert.equal(hashes.size,3);assert.deepEqual(map,before);assert.deepEqual(hud[0],hud[1]);assert.deepEqual(hud[1],hud[2]);
});

test('all authored foreground masks in all worlds restore their opaque pixels after overlapping sprites',()=>{
 const r=renderer();let tiles=0;
 for(const l of game.levels)for(let id=0;id<256;id++)if(l.tilePropertiesMisc[id]&64){
  const front=l.overlayIndices[id];assert.ok(front<163);const map=new Uint8Array(256*l.height);map[4*256+6]=id;
  const sprite=r.sprite;r.sprite=()=>{for(let y=64;y<80;y++)for(let x=96;x<112;x++)r.pixel(x,y,15);};
  r.render({level:l,map,camera:{x:0,y:0},player:{x:104,y:80,sprite:9}});r.sprite=sprite;
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){const ink=a.front[front*256+y*16+x];assert.equal(r.frame[(64+y)*320+96+x],ink||15,`stage ${l.id} tile ${id}`);}tiles++;
 }
 assert.equal(tiles,124);
});
test('unoccupied platforms draw two pixels above their collision origin; ridden platforms keep contact pose',()=>{
 const r=renderer(),l=game.levels[0],ys=[],sprite=r.sprite;r.sprite=(word,x,y)=>ys.push(y);
 const p={x:80,y:100,sprite:232,raw:Uint8Array.from([0,0,0,0,0,0,8])};
 r.render({level:l,map:new Uint8Array(256*l.height),camera:{x:0,y:0},platforms:[p]});assert.equal(ys.pop(),98);
 p.raw[6]|=64;r.render({level:l,map:new Uint8Array(256*l.height),camera:{x:0,y:0},platforms:[p]});assert.equal(ys.pop(),100);assert.equal(p.y,100);r.sprite=sprite;
});
test('rain uses VGA OR so overlapping drops stay white and every HUD pixel stays intact',()=>{
 const r=renderer(),l=game.levels[15],w={level:l,levelIndex:15,map:a.maps[l.id],camera:{x:0,y:0}};r.render(w);const before=r.frame.slice();w.rainPoints=[{x:10,y:10},{x:10,y:10},{x:20,y:20},{x:2,y:176},{x:-1,y:1}];r.render(w);assert.equal(r.frame[10*320+10],15);assert.equal(r.frame[20*320+20],15);assert.deepEqual(r.frame.slice(176*320),before.slice(176*320));
});

test('native screen shake shifts scenery downward with a black top strip while the HUD stays fixed',()=>{
 const r=renderer(),l=game.levels[0],w={level:l,map:a.maps[l.id],camera:{x:0,y:608},screenShake:0};r.render(w);const plain=r.frame.slice();w.screenShake=7;r.render(w);
 assert.ok(r.frame.slice(0,7*320).every(v=>v===0));assert.deepEqual(r.frame.slice(7*320,176*320),plain.slice(0,169*320));assert.deepEqual(r.frame.slice(176*320),plain.slice(176*320));
});
test('shake displaces sprites but native foreground and rain remain in screen coordinates',()=>{
 const r=renderer(),l=game.levels[1],map=new Uint8Array(256*l.height),positions=[],tile=r.tile.bind(r);map[4*256+6]=148;
 r.sprite=(word,x,y)=>positions.push([word,x,y]);r.tile=(v,x,y,l,front,...rest)=>{if(front)positions.push(['front',x,y]);return tile(v,x,y,l,front,...rest);};
 r.render({level:l,map,camera:{x:0,y:0},screenShake:7,shakePlayerNudge:3,player:{sprite:9,x:104,y:80},playerWeapon:{sprite:58,x:94,y:70},actors:[{sprite:313,x:200,y:100}],rainPoints:[{x:20,y:20}]});
 assert.ok(positions.some(v=>v[0]===313&&v[2]===107));assert.ok(positions.some(v=>v[0]===9&&v[2]===90));assert.ok(positions.some(v=>v[0]===58&&v[2]===77));assert.ok(positions.some(v=>v[0]==='front'&&v[2]===64));assert.equal(r.frame[20*320+20],15);
});

test('stage tally uses its original 16x11 font and sprite layers, never the gameplay HUD',()=>{
 const r=renderer(),l=game.levels[0],t={phase:'tally',score:123,percent:37,player:{x:91,y:175,sprite:9},props:[{x:153,y:175,sprite:100},{x:153,y:148,sprite:98},{x:153,y:155,sprite:105}],falling:[{x:155,y:80,sprite:110}]},w={level:l,levelIndex:0,transition:{tally:t},score:123};const before=JSON.stringify(t);
 r.render(w);assert.equal(JSON.stringify(t),before);assert.ok(r.frame.slice(176*320).every(n=>n===0));
 const positions=[];const draw=r.drawTallyText.bind(r);r.drawTallyText=(text,x,y)=>{positions.push([text,x,y]);draw(text,x,y);};r.render(w);assert.deepEqual(positions,[['SCORE',0,14],['0001230',96,14],['LEVEL COMPLETED',0,26],['37%',256,26]]);
 for(let y=0;y<11;y++)for(let x=0;x<16;x++){let expected=0;for(let k=0;k<4;k++)expected|=((a.fonts[0x1c70+k*22+y*2+(x>>3)]>>(7-(x&7)))&1)<<k;assert.equal(r.frame[(14+y)*320+96+x],expected);}
 const full=r.frame.slice();t.falling=[];r.render(w);assert.ok(r.frame.some((v,i)=>v!==full[i]&&i<120*320));
});
test('native-table iris closes around the torso, including the former HUD, without changing state',()=>{
 const r=renderer(),iris={cx:140,cy:100,radius:24},before=JSON.stringify(iris);r.frame.fill(15);r.drawStageIris(iris);assert.equal(JSON.stringify(iris),before);assert.equal(r.frame[100*320+140],15);assert.equal(r.frame[100*320+100],0);assert.ok(r.frame.slice(176*320).every(n=>n===0));assert.equal(r.frame[10],0);
 iris.radius=0;r.drawStageIris(iris);assert.ok(r.frame.every(n=>n===0));
});
