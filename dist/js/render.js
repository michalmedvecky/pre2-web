import {tileAnimation} from './tile-animation.js';
import {HDCompositor} from './hd.js';
import {hintMarkers} from './secrets.js';
/** Original indexed-pixel renderer at 320x200, gameplay clipped above y176. */
const W=320,H=200,VIEW=176;
const FONT={
 A:'01110100011000111111100011000110001',B:'11110100011000111110100011000111110',C:'01111100001000010000100001000001111',D:'11110100011000110001100011000111110',E:'11111100001000011110100001000011111',F:'11111100001000011110100001000010000',G:'01111100001000010111100011000101111',H:'10001100011000111111100011000110001',I:'11111001000010000100001000010011111',J:'00111000100001000010000101001001100',K:'10001100101010011000101001001010001',L:'10000100001000010000100001000011111',M:'10001110111010110101100011000110001',N:'10001110011010110011100011000110001',O:'01110100011000110001100011000101110',P:'11110100011000111110100001000010000',Q:'01110100011000110001101011001001101',R:'11110100011000111110101001001010001',S:'01111100001000001110000010000111110',T:'11111001000010000100001000010000100',U:'10001100011000110001100011000101110',V:'10001100011000110001100010101000100',W:'10001100011000110101101011101110001',X:'10001100010101000100010101000110001',Y:'10001100010101000100001000010000100',Z:'11111000010001000100010001000011111',
 '0':'01110100011001110101110011000101110','1':'00100011000010000100001000010001110','2':'01110100010000100010001000100011111','3':'11110000010000101110000010000111110','4':'00010001100101010010111110001000010','5':'11111100001000011110000010000111110','6':'01110100001000011110100011000101110','7':'11111000010001000100010000100001000','8':'01110100011000101110100011000101110','9':'01110100011000101111000010000101110','-':'00000000000000011111000000000000000',':':'00000001000010000000001000010000000','/':'00001000100001000100010000100010000','.':'00000000000000000000000000010000100','!':'00100001000010000100001000000000100','?':'01110100010000100010001000000000100','+':'00000001000010011111001000010000000','%':'11001110100001000100010001011110011','<':'00010001000100010000010000010000010','>':'01000001000001000001000100010001000'};
export class Renderer {
 constructor(canvas,assets){this.canvas=canvas;this.assets=assets;canvas.width=W;canvas.height=H;this.ctx=canvas.getContext('2d',{alpha:false});this.ctx.imageSmoothingEnabled=false;this.frame=new Uint8Array(W*H);this.imageData=this.ctx.createImageData(W,H);this.palette=assets.game.palettes[0].rgb8_scaled;this.fade=1;this.glyphs=[];
  for(let i=0;i<50;i++){const p=0x1610+i*96;if(p+96>assets.fonts.length)break;const idx=new Uint8Array(192);for(let y=0;y<12;y++)for(let x=0;x<16;x++){let v=0;for(let k=0;k<4;k++)v|=((assets.fonts[p+k*24+y*2+(x>>3)]>>(7-(x&7)))&1)<<k;idx[y*16+x]=v;}this.glyphs.push(idx);}
 }
 setHD(pack){this.hd=pack?new HDCompositor(this.canvas,pack):null;if(!pack){this.canvas.width=W;this.canvas.height=H;}this.ctx=this.canvas.getContext('2d',{alpha:false});this.ctx.imageSmoothingEnabled=false;this.hd?.setPalette(this.palette);this.canvas.style&&(this.canvas.style.imageRendering=pack?'auto':'pixelated');}
 setPalette(p){this.palette=p;this.hd?.setPalette(p);}
 pixel(x,y,index){if(x>=0&&x<W&&y>=0&&y<H){this.frame[y*W+x]=index;this.hd?.pixel(x,y,index);}}
 blit(src,sw,sh,dx,dy,{transparent=false,flip=false,clip=H,offset=0,ink,hdSkip=false}={}){dx=Math.round(dx);dy=Math.round(dy);if(!hdSkip)this.hd?.blit(src,sw,sh,dx,dy,{transparent,flip,clip,offset,ink,fade:this.fade});for(let sy=Math.max(0,-dy);sy<sh&&sy+dy<clip;sy++){for(let sx=Math.max(0,-dx);sx<sw&&sx+dx<W;sx++){const v=src[offset+sy*sw+(flip?sw-1-sx:sx)];if(v!==undefined&&(!transparent||v!==0))this.frame[(dy+sy)*W+dx+sx]=ink??v;}}}
 sprite(word,x,y,flip=false,clip=VIEW){if(word==null||word===65535||word<0)return;flip=flip||!!(word&0x8000);const s=this.assets.game.sprites[word&0x1fff];if(!s)return;const hdSkip=this.hd?.sprite(word,x,y,flip,clip,s);const ox=flip?s.width-s.originX:s.originX;this.blit(this.assets.spritesPixels,s.width,s.height,x-ox,y+s.originY-s.height,{transparent:true,flip,clip,offset:s.pixelOffset,ink:word&0x4000?15:undefined,hdSkip});}
 tile(value,x,y,level,front=false,connected=false){if(value===256||value===65535)return;let bank,id;if(front){bank=this.assets.front;id=value;}else if(value<256){bank=this.assets.tiles[level.id];id=value;}else{bank=this.assets.union;id=value-256;}if(!bank||id<0||id*256+256>bank.length)return;const hdSkip=connected||this.hd?.tile(level.id,front?'front':value<256?'local':'union',id,x,y);this.blit(bank,16,16,x,y,{offset:id*256,transparent:true,clip:VIEW,hdSkip});}
 render(world){const a=this.assets,l=world.level;const li=world.levelIndex??a.game.levels.findIndex(v=>v.id===l.id);this.setPalette(world.paletteOverride||a.game.palettes[Math.max(0,li)]?.rgb8_scaled||a.game.palettes[0].rgb8_scaled);this.fade=1;this.frame.fill(0);this.hd?.begin();const cam=world.camera||{x:0,y:0};const cx=Math.floor(cam.x),cy=Math.floor(cam.y);const bg=a.backgrounds[l.background||'BACK0'];if(bg){const hdSkip=this.hd?.background(l.id,l.background||'BACK0');this.blit(bg,320,200,0,0,{clip:VIEW,hdSkip});}
  const map=world.map||a.maps[l.id];const animation=tileAnimation(l,world.tileAnimationPhase||0);const connected=this.hd?.terrain(a,l,map,cx,cy,animation);const cells=[];for(let ty=Math.max(0,Math.floor(cy/16));ty<Math.min(l.height,Math.ceil((cy+VIEW)/16));ty++)for(let tx=Math.max(0,Math.floor(cx/16));tx<Math.min(256,Math.ceil((cx+W)/16));tx++){const m=map[ty*256+tx],x=tx*16-cx,y=ty*16-cy;this.tile(l.lookup[animation.remap[m]],x,y,l,false,connected);cells.push([m,x,y]);}
  if(world.finalBoss){const pose=world.finalBoss.pose||0;for(let yy=0;yy<7;yy++)for(let xx=0;xx<6;xx++){const id=map[yy*256+20+pose*6+xx];this.tile(l.lookup[id],192+xx*16-cx,yy*16-cy,l);}}
  const draw=o=>{if(o.active===false||o.render===false||o.removed)return;const sprite=o.sprite??o.spriteId;this.sprite(sprite==null?sprite:sprite|(o.hitFlash?0x4000:0),o.x-cx,o.y-cy,o.flip??o.flipX??(o.face<0));};
  for(const o of world.platforms||[])draw(o.raw&&!(o.raw[6]&64)?{...o,y:o.y-2}:o);for(const o of world.items||[])draw(o);for(const o of world.actors||[])draw(o);for(const o of world.bossParts||[])draw(o);for(const o of world.projectiles||[])if(!o.hidden&&o.ttl>0)draw(o);const p=world.player;if(p&&(!(p.invulnerable>0)||((world.frame||0)&2)===0)){this.sprite(p.sprite,p.x-cx,p.y-cy,p.flip??p.face<0);if(world.playerWeapon)draw(world.playerWeapon);}for(const o of world.effects||[]){draw(o);if(o.text)this.drawText(o.text,o.x-cx-o.text.length*3,o.y-cy,15);}
  for(const [m,x,y] of cells){const n=l.overlayIndices?.[m];if((l.tilePropertiesMisc[m]&64)&&n!==undefined&&n!==65535&&n<163)this.tile(n,x,y,l,true);}
  for(const point of world.ropePoints||[]){const x=point.x-cx,y=point.y-cy;if(x>=0&&x<W&&y>=0&&y<VIEW)this.pixel(x,y,this.frame[y*W+x]^15);}
  for(const point of world.followParticles||[]){if(!point)continue;const x=((point.x<<16)>>19)-cx,y=((point.y<<16)>>19)-cy;if(x>=0&&x<W&&y>=0&&y<VIEW)this.pixel(x,y,(point.timer&1)?1:0);}
  // 0x13b03 XORs all VGA planes after sprites and foreground, above the HUD.
  for(const point of world.rainPoints||[]){const {x,y}=point;if(x>=0&&x<W&&y>=0&&y<VIEW)this.pixel(x,y,this.frame[y*W+x]^15);}
  for(const icon of world.bossStatus||[])this.sprite(icon.sprite,icon.x,icon.y);
  if(world.secretHints)this.drawSecretHints(world);
  this.blit(a.hud,320,23,0,176);this.drawHud(world);this.hd?.hud(world,a.tables);this.present();
 }
 drawSecretHints(w){const markers=hintMarkers(w),ink=(w.frame&8)?14:15;
  const dot=(x,y)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&x<W&&y>=0&&y<VIEW)this.pixel(x,y,ink);};
  const line=(x,y,xx,yy)=>{const n=Math.max(Math.abs(xx-x),Math.abs(yy-y),1);for(let i=0;i<=n;i++)dot(x+(xx-x)*i/n,y+(yy-y)*i/n);};
  let arrows=0;const edges=new Set();
  for(const m of markers){
    if(m.kind==='wall')for(const c of m.cells){const x=c.x-w.camera.x,y=c.y-w.camera.y;for(let i=0;i<16;i+=3){dot(x+i,y);dot(x+i,y+15);dot(x,y+i);dot(x+15,y+i);}}
    if(m.visible){line(m.x-4,m.y,m.x,m.y-4);line(m.x,m.y-4,m.x+4,m.y);line(m.x+4,m.y,m.x,m.y+4);line(m.x,m.y+4,m.x-4,m.y);this.drawText(m.label,Math.max(0,Math.min(320-m.label.length*6,m.x-m.label.length*3)),m.y-13,ink);}
    else {const edge=Math.round(m.screenX/24)+':'+Math.round(m.screenY/24);if(arrows>=3||edges.has(edge))continue;edges.add(edge);arrows++;
      const x=m.screenX,y=m.screenY,dx=m.x-x,dy=m.y-y,n=Math.hypot(dx,dy)||1,ux=dx/n,uy=dy/n;
      line(x-ux*6-uy*3,y-uy*6+ux*3,x,y);line(x-ux*6+uy*3,y-uy*6-ux*3,x,y);
    }
  }
  for(let y=4;y<16;y++)for(let x=4;x<Math.min(W,12+(`IDKFA ${markers.length} HINTS`).length*6);x++)this.pixel(x,y,0);
  this.drawText(`IDKFA ${markers.length} HINTS`,8,6,15);
 }
 glyph(id,x,y){const g=this.glyphs[id];if(g)this.blit(g,16,12,x,y);}
 drawHud(w){this.glyph(Math.min(9,Math.max(0,w.lives||0)),40,185);const score=String((w.score>>>0)*10).padStart(7,'0').slice(-7);for(let i=0;i<score.length;i++)this.glyph(+score[i],72+i*16,185);for(let i=0;i<3;i++)this.glyph(i<(w.health??3)?10:11,200+i*16,185);const bits=w.collectionFlash?((w.frame&1)?31:0):(w.inventory||0);for(let i=0;i<5;i++){const p=0x6f82+i*2;const v=this.assets.tables[p]|(this.assets.tables[p+1]<<8);if(bits&(1<<i))this.glyph(12+i,(v%40)*8,Math.floor(v/40));}}
 drawText(text,x,y,color=15){let px=Math.round(x),py=Math.round(y);for(const char of String(text).toUpperCase()){if(char==='\n'){py+=9;px=x;continue;}const g=FONT[char];if(g)for(let j=0;j<35;j++)if(g[j]==='1'){const xx=px+j%5,yy=py+Math.floor(j/5);if(xx>=0&&xx<W&&yy>=0&&yy<H)this.pixel(xx,yy,color);}px+=6;}}
 renderScreen(name,fade=1){const screen=this.assets.game.screens[name];this.fade=fade;this.frame.fill(0);this.hd?.begin();if(screen){this.setPalette(screen.palette);this.blit(this.assets.screens[name],screen.width,screen.height,0,0);}else if(this.assets.backgrounds[name]){this.setPalette(this.assets.game.palettes[0].rgb8_scaled);const m=this.assets.game.backgrounds[name];this.blit(this.assets.backgrounds[name],m.width,m.height,0,0);}this.present();}
 renderMap(selection=0,unlocked=16){this.fade=1;this.setPalette(this.assets.game.palettes[0].rgb8_scaled);this.frame.fill(0);this.hd?.begin();const bg=this.assets.backgrounds.MAP;if(bg)this.blit(bg,640,200,Math.max(-320,-selection*32),0);this.drawText('WORLD MAP',10,9,15);this.drawText(`LEVEL ${this.assets.game.levels[selection]?.id||1}`,10,182,15);this.present();}
 present(){const dst=this.imageData.data,p=this.palette,fade=Math.max(0,Math.min(1,this.fade));for(let i=0;i<this.frame.length;i++){const c=this.frame[i]*3,j=i*4;dst[j]=(p[c]||0)*fade;dst[j+1]=(p[c+1]||0)*fade;dst[j+2]=(p[c+2]||0)*fade;dst[j+3]=255;}if(!this.hd)this.ctx.putImageData(this.imageData,0,0);}
}
export default Renderer;
