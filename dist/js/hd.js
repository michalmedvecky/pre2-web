import{TerrainLayer}from'./terrain-layer.js';
import{terrainShadowRoles,preserveCaveShadows,shadowRoleForMaterial}from'./terrain-semantics.js';
import{BanquetTerrain}from'./banquet-terrain.js';
import{discoverDecor,mapFingerprint,stoneSignSource}from'./world-decor.js';
import {continuousSampler,terrainMaterial} from './continuous-materials.js';
import {HDFeedback} from './hd-feedback.js';
import {connectedTerrain,textureSampler,paintSampler} from './terrain.js';
import {HDHud} from './hd-hud.js';
// Optional high-resolution presentation. Never owns simulation or collision state.
export class HDAssets {
 static async load(base=new URL('../assets/hd/',import.meta.url)){
  const response=await fetch(new URL('manifest.json',base));if(!response.ok)throw Error('HD manifest unavailable');
  const manifest=await response.json();if(manifest.version!==1||manifest.scale!==4||!manifest.sprites||!Array.isArray(manifest.atlases))throw Error('Unsupported HD manifest');
  const images=new Map();await Promise.all(manifest.atlases.map(async a=>{const image=new Image();image.src=new URL(a.file,base);await image.decode();if(image.naturalWidth!==a.width||image.naturalHeight!==a.height)throw Error('HD atlas extent mismatch');images.set(a.id,image);}));
  const records=[...Object.values(manifest.sprites),...Object.values(manifest.tiles||{}),...Object.values(manifest.paintTiles||{}),...Object.values(manifest.worldMaterials||{}),...Object.values(manifest.worldDecor||{}),...Object.values(manifest.backgrounds||{}),...Object.values(manifest.bonusDecor||{}),...Object.values(manifest.screens||{}),...(manifest.banquetMaterial?[manifest.banquetMaterial]:[])];
  for(const s of records){const a=manifest.atlases.find(a=>a.id===s.atlas),r=s.rect;if(!a||!r||r.length!==4||r.some(v=>!Number.isFinite(v)||v<0)||r[2]===0||r[3]===0||r[0]+r[2]>a.width||r[1]+r[3]>a.height)throw Error('Invalid HD atlas record');}

  return {manifest,images};
 }
}
export class HDCompositor {
 constructor(canvas,pack){this.canvas=canvas;this.pack=pack;this.scale=pack.manifest.scale;canvas.width=320*this.scale;canvas.height=200*this.scale;this.ctx=canvas.getContext('2d',{alpha:false});this.ctx.imageSmoothingEnabled=false;this.cache=new WeakMap();this.flash=new Map();this.paletteKey='';this.terrainCache=new Map();this.terrainTextures=new Map();this.materialImages=new Map();this.hudRenderer=new HDHud(pack);this.feedback=new HDFeedback(pack);}
 setPalette(p){const key=p.join(',');if(key!==this.paletteKey){this.paletteKey=key;this.cache=new WeakMap();this.terrainCache.clear();this.stoneSign=null;}this.palette=p;}
 color(i,fade=1){const p=this.palette,k=i*3;return `rgb(${Math.floor((p[k]||0)*fade)},${Math.floor((p[k+1]||0)*fade)},${Math.floor((p[k+2]||0)*fade)})`;}
 begin(){this.ctx.fillStyle=this.color(0);this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);}
 clipped(clip,draw){const c=this.ctx;c.save();c.beginPath();c.rect(this.worldDX||0,this.worldDY||0,this.canvas.width,clip*this.scale);c.clip();draw(c);c.restore();}
 worldOffset(x,y){this.worldDX=x*this.scale;this.worldDY=y*this.scale;this.ctx.save();this.ctx.translate(-this.worldDX,-this.worldDY);this.ctx.imageSmoothingEnabled=true;}
 endWorldOffset(){this.ctx.restore();this.worldDX=this.worldDY=0;}
 blit(src,sw,sh,dx,dy,{transparent=false,flip=false,clip=200,offset=0,ink,fade=1}={}){
  let cache=this.cache.get(src);if(!cache){cache=new Map();this.cache.set(src,cache);}const key=[sw,sh,offset,transparent,ink,fade].join(':');let image=cache.get(key);
  if(!image){image=document.createElement('canvas');image.width=sw;image.height=sh;const ctx=image.getContext('2d'),rgba=ctx.createImageData(sw,sh);for(let i=0;i<sw*sh;i++){const index=src[offset+i];if(index===undefined||transparent&&index===0)continue;const v=(ink??index)*3,j=i*4;for(let k=0;k<3;k++)rgba.data[j+k]=(this.palette[v+k]||0)*fade;rgba.data[j+3]=255;}ctx.putImageData(rgba,0,0);cache.set(key,image);}
  const scale=this.scale;this.clipped(clip,c=>{if(flip){c.translate((dx+sw)*scale,dy*scale);c.scale(-1,1);c.drawImage(image,0,0,sw*scale,sh*scale);}else c.drawImage(image,dx*scale,dy*scale,sw*scale,sh*scale);});
 }
 sprite(word,x,y,flip,clip,source){const id=word&0x1fff,s=this.pack.manifest.sprites[id],feedback=this.feedback.image(id,source,!!(word&0x4000));if(!s&&!feedback)return false;let image=feedback||this.pack.images.get(s.atlas),rect=feedback?[0,0,feedback.width,feedback.height]:s.rect;
  if((word&0x4000)&&!feedback){if(!this.flash.has(id)){const white=document.createElement('canvas');white.width=rect[2];white.height=rect[3];const c=white.getContext('2d');c.drawImage(image,...rect,0,0,white.width,white.height);c.globalCompositeOperation='source-in';c.fillStyle='white';c.fillRect(0,0,white.width,white.height);this.flash.set(id,white);}image=this.flash.get(id);rect=[0,0,image.width,image.height];}
  const ox=flip?source.width-source.originX:source.originX,dx=x-ox,dy=y+source.originY-source.height,scale=this.scale;
  this.clipped(clip,c=>{c.imageSmoothingEnabled=true;if(flip){c.translate((dx+source.width)*scale,dy*scale);c.scale(-1,1);c.drawImage(image,...rect,0,0,source.width*scale,source.height*scale);}else c.drawImage(image,...rect,dx*scale,dy*scale,source.width*scale,source.height*scale);});return true;
 }
 atlas(record,x,y,clip=176){if(!record)return false;const image=this.pack.images.get(record.atlas),scale=this.scale;this.clipped(clip,c=>{c.imageSmoothingEnabled=true;c.drawImage(image,...record.rect,x*scale,y*scale,record.width*scale,record.height*scale);});return true;}
 tile(level,bank,id,x,y,source,worldX,worldY){
  if(level==='1'&&bank==='front'&&id===20&&source&&this.pack.manifest.worldMaterials&&Number.isFinite(worldX)){
   const wall=this.materialImage(this.pack.manifest.worldMaterials.wall),roots=this.materialImage(this.pack.manifest.worldMaterials.roots),paint=continuousSampler({textures:[null],kinds:['wall'],columns:1,originX:worldX,originY:worldY,wall,roots}),rgba=connectedTerrain(source,16,16,this.palette,paint,{paintColor:true}),image=document.createElement('canvas');image.width=image.height=64;image.getContext('2d').putImageData(new ImageData(rgba,64,64),0,0);this.clipped(176,c=>c.drawImage(image,Math.round(x)*4,Math.round(y)*4));return true;
  }
  return this.atlas(this.pack.manifest.tiles?.[level+':'+bank+':'+id],Math.round(x),Math.round(y));}
 screen(name,fade=1){const record=this.pack.manifest.screens?.[name];if(!record)return false;this.ctx.save();this.ctx.globalAlpha=fade;this.atlas(record,0,0,200);this.ctx.restore();return true;}
 background(level,name,shift=0){return this.atlas(this.pack.manifest.backgrounds?.[level+':'+name],0,shift);}
 clearTop(height){this.ctx.fillStyle=this.color(0);this.ctx.fillRect(0,0,this.canvas.width,Math.min(176,height)*this.scale);}
 connectedLayer(cx,cy,draw){this.terrainLayer||=new TerrainLayer();this.terrainLayer.draw(this,cx,cy,draw);}
 terrain(assets,level,map,cx,cy,animation){
  if(this.pack.manifest.banquetMaterial?.levels.includes(level.id)){this.banquet||=new BanquetTerrain();return this.banquet.draw(this,assets,level,map,cx,cy);}
  if(level.id!=='1')return false;
  const decor=this.pack.manifest.worldDecor?this.decorFor(level,map,assets.union,assets.maps[level.id]):null;
  if(decor&&!this.decorCache.shadowRoles)this.decorCache.shadowRoles=terrainShadowRoles(level,map,assets.union,assets.tiles[level.id]);
  const size=64,halo=16,width=size+halo*2,columns=width/16,keys=new Set();
  const valueAt=(x,y)=>x<0||x>=4096||y<0||y>=level.height*16?256:level.lookup[animation.remap[map[(y>>4)*256+(x>>4)]]];
  const bankOf=v=>v<256?assets.tiles[level.id]:assets.union;
  const sample=(x,y)=>{if(decor?.islandCells.has((y>>4)*256+(x>>4)))return 0;const v=valueAt(x,y);if(v===256||v===65535||v===undefined)return 0;return bankOf(v)?.[(v<256?v:v-256)*256+(y&15)*16+(x&15)]||0;};
  this.connectedLayer(cx,cy,(c,b)=>{for(let gy=b.y0;gy<=b.y1;gy++)for(let gx=b.x0;gx<=b.x1;gx++){
   const ox=gx*size,oy=gy*size;let signature=decor?this.decorCache.hash+':':'',animated=false;for(let y=oy-16;y<=oy+size;y+=16)for(let x=ox-16;x<=ox+size;x+=16){signature+=valueAt(x,y)+',';if(x>=0&&x<4096&&y>=0&&y<level.height*16&&animation.animated[map[(y>>4)*256+(x>>4)]])animated=true;}const key=gx+':'+gy+':'+(animated?animation.phase:0);keys.add(key);
   let chunk=this.terrainCache.get(key);if(!chunk||chunk.signature!==signature){
    const source=new Uint8Array(width*width);for(let y=0;y<width;y++)for(let x=0;x<width;x++)source[y*width+x]=sample(ox+x-halo,oy+y-halo);
    const textures=[],kinds=[],shadowRoles=[];for(let y=0;y<columns;y++)for(let x=0;x<columns;x++){
     const v=valueAt(ox+x*16-halo,oy+y*16-halo),record=(this.pack.manifest.paintTiles||this.pack.manifest.tiles)?.['1:'+(v<256?'local:':'union:')+(v<256?v:v-256)];const bank=bankOf(v),offset=(v<256?v:v-256)*256;const cell=((oy+y*16-halo)>>4)*256+((ox+x*16-halo)>>4),covered=decor?.covered.has(cell),kind=covered?(decor.backdrops.get(cell)||'wall'):v===256||v===65535||v===undefined?'literal':terrainMaterial(bank?.subarray(offset,offset+256)||new Uint8Array(),v),role=covered?0:(this.decorCache?.shadowRoles?.[cell]||0);shadowRoles.push(shadowRoleForMaterial(role,kind,covered));kinds.push(shadowRoles.at(-1)?'wall':kind);textures.push(record&&!record.preservedOriginal&&!record.preservedFlat?this.terrainTexture(record):null);
    }
    const materials=this.pack.manifest.worldMaterials,paint=materials?continuousSampler({textures,kinds,columns,originX:ox-halo,originY:oy-halo,foliage:!decor,wall:this.materialImage(materials.wall),roots:this.materialImage(materials.roots)}):(this.pack.manifest.paintTiles?paintSampler:textureSampler)(textures,columns);
    const masked=decor?preserveCaveShadows(paint,source,width,shadowRoles,columns,this.palette):paint;
    const rgba=connectedTerrain(source,width,width,this.palette,masked,{paintColor:!!this.pack.manifest.paintTiles});
    const image=document.createElement('canvas');image.width=size*4;image.height=size*4;const ctx=image.getContext('2d');ctx.putImageData(new ImageData(rgba,width*4,width*4),-halo*4,-halo*4);chunk={signature,image};this.terrainCache.set(key,chunk);
   }
   c.drawImage(chunk.image,0,0,size*4,size*4,ox*4,oy*4,size*4,size*4);
  }});
  if(decor)this.drawDecor(decor,cx,cy,animation.phase,assets);
  // Keep a bounded cache while walking an entire stage.
  for(const key of this.terrainCache.keys())if(this.terrainCache.size>96&&!keys.has(key))this.terrainCache.delete(key);
  return true;
 }
 decorFor(level,map,union,authoredMap){const hash=mapFingerprint(map);if(!this.decorCache||this.decorCache.map!==map||this.decorCache.hash!==hash){this.decorCache={map,hash,decor:discoverDecor(level,map,union,authoredMap)};}return this.decorCache.decor;}
 drawDecor(decor,cx,cy,phase,assets){
  this.clipped(176,c=>{c.imageSmoothingEnabled=true;for(const o of [...decor.objects,...decor.plants]){if(o.x+o.width<cx||o.x>cx+320||o.y+o.height<cy||o.y>cy+176)continue;const x=(o.x-cx)*4,y=(o.y-cy)*4,w=o.width*4,h=o.height*4;
   if(o.kind==='island'){if(o.visibleCells){c.save();c.beginPath();for(let j=0;j<o.visibleCells.length;j++)if(o.visibleCells[j])c.rect(x+j%(o.width/16)*64,y+Math.floor(j/(o.width/16))*64,64,64);c.clip();}const full=this.pack.manifest.worldDecor['island-'+o.width];if(full){c.drawImage(this.pack.images.get(full.atlas),...full.rect,x,y,w,h);if(o.visibleCells)c.restore();continue;}const key=o.tiles.join(',')+':'+this.paletteKey;this.islandImages||=new Map();let image=this.islandImages.get(key);if(!image){const source=new Uint8Array(o.width*o.height),bank=assets.tiles['1'];for(let yy=0;yy<o.height;yy++)for(let xx=0;xx<o.width;xx++){const id=o.tiles[(yy>>4)*(o.width>>4)+(xx>>4)],v=bank[id*256+(yy&15)*16+(xx&15)];source[yy*o.width+xx]=v===6?0:v;}const rgba=connectedTerrain(source,o.width,o.height,this.palette);image=document.createElement('canvas');image.width=o.width*4;image.height=o.height*4;image.getContext('2d').putImageData(new ImageData(rgba,image.width,image.height),0,0);this.islandImages.set(key,image);}c.drawImage(image,x,y,w,h);if(o.visibleCells)c.restore();continue;}
   if(o.kind==='sign'){if(!this.stoneSign){const source=stoneSignSource(assets),rgba=connectedTerrain(source,48,32,this.palette);this.stoneSign=document.createElement('canvas');this.stoneSign.width=192;this.stoneSign.height=128;this.stoneSign.getContext('2d').putImageData(new ImageData(rgba,192,128),0,0);}c.drawImage(this.stoneSign,x,y,w,h);continue;}
   const record=this.pack.manifest.worldDecor[o.kind==='plant'?'plant-'+o.shape+'-'+phase:o.kind];if(record)c.drawImage(this.pack.images.get(record.atlas),...record.rect,x,y,w,h);
  }});
 }
 materialImage(record){
  let value=this.materialImages.get(record.atlas);if(value)return value;
  const [x,y,width,height]=record.rect,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(this.pack.images.get(record.atlas),x,y,width,height,0,0,width,height);value={width,height,data:c.getImageData(0,0,width,height).data,originY:record.originY||0};this.materialImages.set(record.atlas,value);return value;
 }
 terrainTexture(record){
  const key=record.atlas+':'+record.index;let texture=this.terrainTextures.get(key);if(texture)return texture;
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(this.pack.images.get(record.atlas),...record.rect,0,0,64,64);const data=c.getImageData(0,0,64,64).data;if(record.mask==='connected-world'){texture=new Float32Array(data);this.terrainTextures.set(key,texture);return texture;}const integral=new Float32Array(65*65),luma=new Float32Array(4096);texture=new Float32Array(4096*4);
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=y*64+x;luma[i]=(data[i*4]+data[i*4+1]+data[i*4+2])/3;integral[(y+1)*65+x+1]=luma[i]+integral[y*65+x+1]+integral[(y+1)*65+x]-integral[y*65+x];}
  // Reuse the painted stone/leaf detail, while keeping incompatible separately
  // painted contours and large lighting changes out of the connected terrain.
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){const x0=Math.max(0,x-4),y0=Math.max(0,y-4),x1=Math.min(64,x+5),y1=Math.min(64,y+5),sum=integral[y1*65+x1]-integral[y0*65+x1]-integral[y1*65+x0]+integral[y0*65+x0],i=(y*64+x)*4;texture[i]=Math.max(-.32,Math.min(.32,(luma[y*64+x]-sum/((x1-x0)*(y1-y0)))/128));texture[i+3]=data[i+3];}
  this.terrainTextures.set(key,texture);return texture;
 }
 text(value,x,y,color=15,cellWidth=6,height=7){
  const c=this.ctx,scale=this.scale;c.save();c.scale(scale,scale);c.font=`900 ${height*.98}px Georgia, "Times New Roman", serif`;c.textAlign='center';c.textBaseline='alphabetic';c.lineJoin='round';c.lineWidth=.6;c.strokeStyle='#282117';c.fillStyle=typeof color==='string'?color:this.color(color);
  let row=0,column=0;for(const ch of String(value).toUpperCase()){if(ch==='\n'){row++;column=0;continue;}const px=x+(column+.5)*cellWidth,py=y+row*(height+2)+height*.86;c.strokeText(ch,px,py,cellWidth-1);c.fillText(ch,px,py,cellWidth-1);column++;}c.restore();
 }
 hud(world,tables){return this.hudRenderer.draw(this.ctx,world,tables);}
 pixel(x,y,index){if(x<0||x>=320||y<0||y>=200)return;this.ctx.fillStyle=this.color(index);this.ctx.fillRect(x*this.scale,y*this.scale,this.scale,this.scale);}
}
