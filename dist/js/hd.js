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
 constructor(canvas,pack){this.canvas=canvas;this.pack=pack;this.scale=pack.manifest.scale;canvas.width=320*this.scale;canvas.height=200*this.scale;this.ctx=canvas.getContext('2d',{alpha:false});this.ctx.imageSmoothingEnabled=false;this.cache=new WeakMap();this.flash=new Map();this.paletteKey='';}
 setPalette(p){const key=p.join(',');if(key!==this.paletteKey){this.paletteKey=key;this.cache=new WeakMap();}this.palette=p;}
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
 pixel(x,y,index){if(x<0||x>=320||y<0||y>=200)return;this.ctx.fillStyle=this.color(index);this.ctx.fillRect(x*this.scale,y*this.scale,this.scale,this.scale);}
}
