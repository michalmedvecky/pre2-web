import {connectedTerrain} from './terrain.js';
import {HDHud} from './hd-hud.js';
// Optional high-resolution presentation. Never owns simulation or collision state.
export class HDAssets {
 static async load(base=new URL('../assets/hd/',import.meta.url)){
  const response=await fetch(new URL('manifest.json',base));if(!response.ok)throw Error('HD manifest unavailable');
  const manifest=await response.json();if(manifest.version!==1||manifest.scale!==4||!manifest.sprites||!Array.isArray(manifest.atlases))throw Error('Unsupported HD manifest');
  const images=new Map();await Promise.all(manifest.atlases.map(async a=>{const image=new Image();image.src=new URL(a.file,base);await image.decode();if(image.naturalWidth!==a.width||image.naturalHeight!==a.height)throw Error('HD atlas extent mismatch');images.set(a.id,image);}));
  const records=[...Object.values(manifest.sprites),...Object.values(manifest.tiles||{}),...Object.values(manifest.backgrounds||{})];
  for(const s of records){const a=manifest.atlases.find(a=>a.id===s.atlas),r=s.rect;if(!a||!r||r.length!==4||r.some(v=>!Number.isFinite(v)||v<0)||r[2]===0||r[3]===0||r[0]+r[2]>a.width||r[1]+r[3]>a.height)throw Error('Invalid HD atlas record');}

  return {manifest,images};
 }
}
export class HDCompositor {
 constructor(canvas,pack){this.canvas=canvas;this.pack=pack;this.scale=pack.manifest.scale;canvas.width=320*this.scale;canvas.height=200*this.scale;this.ctx=canvas.getContext('2d',{alpha:false});this.ctx.imageSmoothingEnabled=false;this.cache=new WeakMap();this.flash=new Map();this.paletteKey='';this.terrainCache=new Map();this.terrainDetails=new Map();this.hudRenderer=new HDHud(pack);}
 setPalette(p){const key=p.join(',');if(key!==this.paletteKey){this.paletteKey=key;this.cache=new WeakMap();this.terrainCache.clear();}this.palette=p;}
 color(i,fade=1){const p=this.palette,k=i*3;return `rgb(${Math.floor((p[k]||0)*fade)},${Math.floor((p[k+1]||0)*fade)},${Math.floor((p[k+2]||0)*fade)})`;}
 begin(){this.ctx.fillStyle=this.color(0);this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);}
 clipped(clip,draw){const c=this.ctx;c.save();c.beginPath();c.rect(0,0,this.canvas.width,clip*this.scale);c.clip();draw(c);c.restore();}
 blit(src,sw,sh,dx,dy,{transparent=false,flip=false,clip=200,offset=0,ink,fade=1}={}){
  let cache=this.cache.get(src);if(!cache){cache=new Map();this.cache.set(src,cache);}const key=[sw,sh,offset,transparent,ink,fade].join(':');let image=cache.get(key);
  if(!image){image=document.createElement('canvas');image.width=sw;image.height=sh;const ctx=image.getContext('2d'),rgba=ctx.createImageData(sw,sh);for(let i=0;i<sw*sh;i++){const index=src[offset+i];if(index===undefined||transparent&&index===0)continue;const v=(ink??index)*3,j=i*4;for(let k=0;k<3;k++)rgba.data[j+k]=(this.palette[v+k]||0)*fade;rgba.data[j+3]=255;}ctx.putImageData(rgba,0,0);cache.set(key,image);}
  const scale=this.scale;this.clipped(clip,c=>{if(flip){c.translate((dx+sw)*scale,dy*scale);c.scale(-1,1);c.drawImage(image,0,0,sw*scale,sh*scale);}else c.drawImage(image,dx*scale,dy*scale,sw*scale,sh*scale);});
 }
 sprite(word,x,y,flip,clip,source){const id=word&0x1fff,s=this.pack.manifest.sprites[id];if(!s)return false;let image=this.pack.images.get(s.atlas),rect=s.rect;
  if(word&0x4000){if(!this.flash.has(id)){const white=document.createElement('canvas');white.width=rect[2];white.height=rect[3];const c=white.getContext('2d');c.drawImage(image,...rect,0,0,white.width,white.height);c.globalCompositeOperation='source-in';c.fillStyle='white';c.fillRect(0,0,white.width,white.height);this.flash.set(id,white);}image=this.flash.get(id);rect=[0,0,image.width,image.height];}
  const ox=flip?source.width-source.originX:source.originX,dx=x-ox,dy=y+source.originY-source.height,scale=this.scale;
  this.clipped(clip,c=>{c.imageSmoothingEnabled=true;if(flip){c.translate((dx+source.width)*scale,dy*scale);c.scale(-1,1);c.drawImage(image,...rect,0,0,source.width*scale,source.height*scale);}else c.drawImage(image,...rect,dx*scale,dy*scale,source.width*scale,source.height*scale);});return true;
 }
 atlas(record,x,y,clip=176){if(!record)return false;const image=this.pack.images.get(record.atlas),scale=this.scale;this.clipped(clip,c=>{c.imageSmoothingEnabled=true;c.drawImage(image,...record.rect,x*scale,y*scale,record.width*scale,record.height*scale);});return true;}
 tile(level,bank,id,x,y){return this.atlas(this.pack.manifest.tiles?.[level+':'+bank+':'+id],Math.round(x),Math.round(y));}
 background(level,name){return this.atlas(this.pack.manifest.backgrounds?.[level+':'+name],0,0);}
 terrain(assets,level,map,cx,cy){
  if(level.id!=='1')return false;
  const size=64,halo=16,width=size+halo*2,columns=width/16,keys=new Set();
  const valueAt=(x,y)=>x<0||x>=4096||y<0||y>=level.height*16?256:level.lookup[map[(y>>4)*256+(x>>4)]];
  const bankOf=v=>v<256?assets.tiles[level.id]:assets.union;
  const sample=(x,y)=>{const v=valueAt(x,y);if(v===256||v===65535||v===undefined)return 0;return bankOf(v)?.[(v<256?v:v-256)*256+(y&15)*16+(x&15)]||0;};
  this.clipped(176,c=>{for(let gy=Math.max(0,Math.floor(cy/size));gy<=Math.floor((cy+175)/size);gy++)for(let gx=Math.max(0,Math.floor(cx/size));gx<=Math.floor((cx+319)/size);gx++){
   const ox=gx*size,oy=gy*size,key=gx+':'+gy;keys.add(key);let signature='';for(let y=oy-16;y<=oy+size;y+=16)for(let x=ox-16;x<=ox+size;x+=16)signature+=valueAt(x,y)+',';
   let chunk=this.terrainCache.get(key);if(!chunk||chunk.signature!==signature){
    const source=new Uint8Array(width*width);for(let y=0;y<width;y++)for(let x=0;x<width;x++)source[y*width+x]=sample(ox+x-halo,oy+y-halo);
    const details=[];for(let y=0;y<columns;y++)for(let x=0;x<columns;x++){
     const v=valueAt(ox+x*16-halo,oy+y*16-halo),record=this.pack.manifest.tiles?.['1:'+(v<256?'local:':'union:')+(v<256?v:v-256)];details.push(record&&!record.preservedOriginal&&!record.preservedFlat?this.terrainDetail(record):null);
    }
    const rgba=connectedTerrain(source,width,width,this.palette,(x,y)=>details[(y>>6)*columns+(x>>6)]?.[(y&63)*64+(x&63)]||0);
    const image=document.createElement('canvas');image.width=width*4;image.height=width*4;const ctx=image.getContext('2d');ctx.putImageData(new ImageData(rgba,width*4,width*4),0,0);chunk={signature,image};this.terrainCache.set(key,chunk);
   }
   c.drawImage(chunk.image,halo*4,halo*4,size*4,size*4,(ox-cx)*4,(oy-cy)*4,size*4,size*4);
  }});
  // Keep a bounded cache while walking an entire stage.
  for(const key of this.terrainCache.keys())if(this.terrainCache.size>48&&!keys.has(key))this.terrainCache.delete(key);
  return true;
 }
 terrainDetail(record){
  const key=record.atlas+':'+record.index;let detail=this.terrainDetails.get(key);if(detail)return detail;
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(this.pack.images.get(record.atlas),...record.rect,0,0,64,64);const data=c.getImageData(0,0,64,64).data,luma=new Float32Array(4096);detail=new Float32Array(4096);
  const integral=new Float32Array(65*65);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=y*64+x;luma[i]=(data[i*4]+data[i*4+1]+data[i*4+2])/3;integral[(y+1)*65+x+1]=luma[i]+integral[y*65+x+1]+integral[(y+1)*65+x]-integral[y*65+x];}
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){const x0=Math.max(0,x-4),y0=Math.max(0,y-4),x1=Math.min(64,x+5),y1=Math.min(64,y+5),sum=integral[y1*65+x1]-integral[y0*65+x1]-integral[y1*65+x0]+integral[y0*65+x0],fade=Math.min(1,Math.min(x,y,63-x,63-y)/12);detail[y*64+x]=Math.max(-.16,Math.min(.16,(luma[y*64+x]-sum/((x1-x0)*(y1-y0)))/160))*fade;}
  this.terrainDetails.set(key,detail);return detail;
 }
 hud(world,tables){return this.hudRenderer.draw(this.ctx,world,tables);}
 pixel(x,y,index){if(x<0||x>=320||y<0||y>=200)return;this.ctx.fillStyle=this.color(index);this.ctx.fillRect(x*this.scale,y*this.scale,this.scale,this.scale);}
}
