// Closed silhouettes with approved web HD faces. Built/prewarmed before gameplay.
import * as T from '../vendor/three.module.js';
import {AWARDS} from './compat.js';
export async function loadHDArt(renderer,assets){
 const base=new URL('../textures/',import.meta.url),r=await fetch(new URL('objects-hd.json',base));if(!r.ok)throw Error('HD manifest unavailable');const pack=await r.json();
 const load=async file=>{const image=new Image();image.src=new URL(file,base);await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);const pixels=c.getImageData(0,0,canvas.width,canvas.height).data,texture=new T.Texture(image);texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());texture.needsUpdate=true;renderer.initTexture(texture);return {texture,pixels,width:canvas.width,height:canvas.height};};
 const [sprites,tiles]=await Promise.all([load(pack.file),load(pack.tiles.file)]),art=makeHDArt(assets,pack,sprites,tiles);
 for(let id=53;id<assets.game.sprites.length;id++){art.sprite(id);if(id<=311||id===308||id===310)art.sprite(id,{depth:.12});if(id>=312)art.sprite(id,{depth:.5});if(!(id%16))await new Promise(resolve=>setTimeout(resolve,0));}
 art.sprite(232,{depth:3.6});for(let id=0;id<256;id++)art.tileMesh(id,{depth:.32});
 art.prepareLabels(renderer);return art;
}
export function makeHDArt(assets,pack,sprites,tiles){
 const material=map=>new T.MeshStandardMaterial({map,alphaTest:.35,roughness:.94,side:T.FrontSide});
 const spriteMaterial=material(sprites.texture),tileMaterial=material(tiles.texture),cache=new Map(),labels=new Map();
 const stats={geometryBuilds:0,scale:4,approvedSprites:Object.values(pack.sprites).filter(r=>r.method==='web-hd').length};
 function geometry(key,image,rect,width,height,originX,originY,depth){
  key+=':'+depth;if(cache.has(key))return cache.get(key);stats.geometryBuilds++;
  const [rx,ry,w,h]=rect,positions=[],normals=[],uvs=[],indices=[],z=depth/2,unit=1/128;
  const opaque=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&image.pixels[((ry+y)*image.width+rx+x)*4+3]>=90;
  const uv=(x,y)=>[(rx+Math.max(.5,Math.min(w-.5,x)))/image.width,1-(ry+Math.max(.5,Math.min(h-.5,y)))/image.height];
  function quad(points,normal,coords){const i=positions.length/3;for(let n=0;n<4;n++){positions.push(...points[n]);normals.push(...normal);uvs.push(...coords[n]);}indices.push(i,i+1,i+2,i,i+2,i+3);}
  const left=-originX/32,right=(width-originX)/32,top=(height-originY)/32,bottom=-originY/32;
  quad([[left,bottom,z],[right,bottom,z],[right,top,z],[left,top,z]],[0,0,1],[uv(0,h),uv(w,h),uv(w,0),uv(0,0)]);
  quad([[right,bottom,-z],[left,bottom,-z],[left,top,-z],[right,top,-z]],[0,0,-1],[uv(w,h),uv(0,h),uv(0,0),uv(w,0)]);
  // Merge contiguous exposed edge runs. No per-pixel front/back triangles.
  for(let x=0;x<=w;x++)for(const side of [-1,1])for(let y=0;y<h;){const edge=yy=>side<0?opaque(x,yy)&&!opaque(x-1,yy):opaque(x-1,yy)&&!opaque(x,yy);if(!edge(y)){y++;continue;}let end=y+1;while(end<h&&edge(end))end++;const xx=left+x*unit,t=top-y*unit,b=top-end*unit,u=side<0?x+.5:x-.5,coords=[uv(u,end-.5),uv(u,end-.5),uv(u,y+.5),uv(u,y+.5)];if(side<0)quad([[xx,b,-z],[xx,b,z],[xx,t,z],[xx,t,-z]],[-1,0,0],coords);else quad([[xx,b,z],[xx,b,-z],[xx,t,-z],[xx,t,z]],[1,0,0],coords);y=end;}
  for(let y=0;y<=h;y++)for(const side of [-1,1])for(let x=0;x<w;){const edge=xx=>side>0?opaque(xx,y)&&!opaque(xx,y-1):opaque(xx,y-1)&&!opaque(xx,y);if(!edge(x)){x++;continue;}let end=x+1;while(end<w&&edge(end))end++;const yy=top-y*unit,l=left+x*unit,rr=left+end*unit,v=side>0?y+.5:y-.5,coords=[uv(x+.5,v),uv(end-.5,v),uv(end-.5,v),uv(x+.5,v)];if(side>0)quad([[l,yy,z],[rr,yy,z],[rr,yy,-z],[l,yy,-z]],[0,1,0],coords);else quad([[l,yy,-z],[rr,yy,-z],[rr,yy,z],[l,yy,z]],[0,-1,0],coords);x=end;}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeBoundingBox();g.computeBoundingSphere();cache.set(key,g);return g;
 }
 function sprite(word,{depth=.24}={}){const id=word&0x1fff,s=assets.game.sprites[id],r=pack.sprites[id];if(!s||!r)return new T.Group();const m=new T.Mesh(geometry('sprite:'+id,sprites,r.rect,s.width,s.height,s.originX,s.originY,depth),spriteMaterial);m.name='hd-sprite:'+id;m.userData={sourceSprite:id,hdScale:4,method:r.method};if(word&0x8000)m.scale.x=-1;return m;}
 function tileMesh(id,{depth=.32}={}){const m=new T.Mesh(geometry('tile:'+id,tiles,[(id&15)*pack.tiles.cell+pack.tiles.padding,(id>>4)*pack.tiles.cell+pack.tiles.padding,64,64],16,16,8,0,depth),tileMaterial);m.userData.sourceTile=id;return m;}
 const tileUV=id=>{const x=(id&15)*pack.tiles.cell+pack.tiles.padding,y=(id>>4)*pack.tiles.cell+pack.tiles.padding;return {u0:(x+.5)/tiles.width,v0:1-(y+63.5)/tiles.height,u1:(x+63.5)/tiles.width,v1:1-(y+.5)/tiles.height};};
 function prepareLabels(renderer){for(const text of [...AWARDS.map(n=>String(n*10)),'EXIT OPEN','1UP']){if(labels.has(text))continue;const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');c.font='bold 88px system-ui';c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.strokeStyle='#312011';c.lineWidth=10;c.strokeText(text,256,64);c.fillStyle='#ffe7a1';c.fillText(text,256,64);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;renderer.initTexture(texture);const material=new T.MeshBasicMaterial({map:texture,alphaTest:.1,side:T.FrontSide,depthTest:false,depthWrite:false});const geometry=new T.PlaneGeometry(1.12,.28);labels.set(text,{material,geometry});}}
 function label(text){const entry=labels.get(text);if(!entry)return null;const m=new T.Mesh(entry.geometry,entry.material);m.userData.scoreLabel=text;m.renderOrder=5;return m;}
 return {sprite,tileMesh,tileUV,tileAtlas:()=>tiles.texture,material:tileMaterial,stats,prepareLabels,label,score:id=>label(String(AWARDS[id-74]*10)),warmMeshes:()=>[new T.Mesh(new T.PlaneGeometry(.01,.01),spriteMaterial),...Array.from(labels.values(),l=>new T.Mesh(l.geometry,l.material))]};
}
