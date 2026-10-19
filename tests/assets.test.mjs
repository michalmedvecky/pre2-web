import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../dist/assets/',import.meta.url);
const game=JSON.parse(await readFile(new URL('game.json',root),'utf8'));
const source=await readFile(new URL('../dist/js/render.js',import.meta.url),'utf8');
const {Renderer}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
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
