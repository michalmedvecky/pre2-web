// Authored closed 3D surfaces reconstructed from the HD silhouettes. Depth is a VR interpretation.
import * as T from '../vendor/three.module.js';
import {foodFamily,foodGeometry} from './food-models.js';
import {creatureFamily,creatureGeometry} from './creature-models.js';
export function roundedVolume(image,rect,source,{depth=.4,step=4}={}){
 const [rx,ry,w,h]=rect,nx=Math.ceil(w/step),ny=Math.ceil(h/step),sx=w/nx,sy=h/ny,mask=new Uint8Array(nx*ny),distance=new Float32Array(nx*ny);
 const alpha=(x,y)=>image.pixels[((ry+Math.min(h-1,Math.max(0,y)))*image.width+rx+Math.min(w-1,Math.max(0,x)))*4+3];
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const p=y*nx+x;mask[p]=alpha(Math.floor((x+.5)*sx),Math.floor((y+.5)*sy))>=90?1:0;distance[p]=mask[p]?1000:0;}
 const d=(x,y)=>x<0||y<0||x>=nx||y>=ny?0:distance[y*nx+x];
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)if(mask[y*nx+x])distance[y*nx+x]=Math.min(distance[y*nx+x],d(x-1,y)+1,d(x,y-1)+1,d(x-1,y-1)+Math.SQRT2);
 for(let y=ny-1;y>=0;y--)for(let x=nx-1;x>=0;x--)if(mask[y*nx+x])distance[y*nx+x]=Math.min(distance[y*nx+x],d(x+1,y)+1,d(x,y+1)+1,d(x+1,y+1)+Math.SQRT2);
 let radius=1;for(const v of distance)if(v<1000)radius=Math.max(radius,v);const positions=[],uvs=[],indices=[],vertices=new Map();
 const occupied=(x,y)=>x>=0&&y>=0&&x<nx&&y<ny&&mask[y*nx+x];
 function vertex(x,y,side,cx,cy){const a=occupied(x-1,y-1),b=occupied(x,y-1),c=occupied(x-1,y),corner=occupied(x,y),pinch=(a&&corner&&!b&&!c)||(b&&c&&!a&&!corner),component=pinch?1+(cx===x?1:0)+(cy===y?2:0):0,key=((y*(nx+1)+x)*2+(side>0?1:0))*5+component;if(vertices.has(key))return vertices.get(key);const near=[d(x-1,y-1),d(x,y-1),d(x-1,y),d(x,y)],inside=near.every(n=>n>0),dist=inside?Math.min(...near):0,round=Math.sqrt(Math.max(0,1-(1-Math.min(1,dist/radius))**2)),z=depth*(.045+.455*round)*side,px=x*sx,py=y*sy,index=positions.length/3;positions.push((px/4-source.originX)/32,(source.height-source.originY-py/4)/32,z);uvs.push((rx+Math.max(.5,Math.min(w-.5,px)))/image.width,1-(ry+Math.max(.5,Math.min(h-.5,py)))/image.height);vertices.set(key,index);return index;}
 const quad=(a,b,c,d)=>indices.push(a,b,c,a,c,d);
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)if(occupied(x,y)){
  const vertexAt=(vx,vy,side)=>vertex(vx,vy,side,x,y);const f=[vertexAt(x,y,1),vertexAt(x+1,y,1),vertexAt(x+1,y+1,1),vertexAt(x,y+1,1)],b=[vertexAt(x,y,-1),vertexAt(x+1,y,-1),vertexAt(x+1,y+1,-1),vertexAt(x,y+1,-1)];
  quad(f[3],f[2],f[1],f[0]);quad(b[0],b[1],b[2],b[3]);
  if(!occupied(x-1,y))quad(b[3],f[3],f[0],b[0]);if(!occupied(x+1,y))quad(f[2],b[2],b[1],f[1]);if(!occupied(x,y-1))quad(f[0],f[1],b[1],b[0]);if(!occupied(x,y+1))quad(b[3],b[2],f[2],f[3]);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.userData={reconstruction:'rounded-volume',closed:true,sourceWidth:source.width,sourceHeight:source.height};return geometry;
}
export function makeVolumeArt(hd,assets,pack,sprites,tiles){
 const spriteMaterial=hd.spriteMaterial.clone(),tileMaterial=hd.material.clone();spriteMaterial.alphaTest=tileMaterial.alphaTest=0;
 const creatureMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.9}),cache=new Map(),stats={...hd.stats,geometryBuilds:0,model:'rounded-volume',volumeSprites:0,volumeTiles:0};
 function cached(key,build){if(!cache.has(key)){cache.set(key,build());stats.geometryBuilds++;}return cache.get(key);}
 function sprite(word,{depth}={}){const id=word&0x1fff,s=assets.game.sprites[id],r=pack.sprites[id];if(!s||!r)return new T.Group();depth??=Math.max(.18,Math.min(.72,Math.min(s.width,s.height)/32*.85));const geometry=cached('s:'+id+':'+depth,()=>{stats.volumeSprites++;return foodFamily(id)?foodGeometry(id,s):creatureFamily(id)?creatureGeometry(id,s,{depth}):roundedVolume(sprites,r.rect,s,{depth,step:4});});const m=new T.Mesh(geometry,(creatureFamily(id)||foodFamily(id))?creatureMaterial:spriteMaterial);m.name='volume-sprite:'+id;m.userData={sourceSprite:id,hdScale:4,model:geometry.userData.reconstruction,method:r.method};if(word&0x8000)m.scale.x=-1;return m;}
 function tileMesh(id,{depth=.5}={}){const rect=[(id&15)*pack.tiles.cell+pack.tiles.padding,(id>>4)*pack.tiles.cell+pack.tiles.padding,64,64],geometry=cached('t:'+id+':'+depth,()=>{stats.volumeTiles++;return roundedVolume(tiles,rect,{width:16,height:16,originX:8,originY:0},{depth,step:8});});const m=new T.Mesh(geometry,tileMaterial);m.userData={sourceTile:id,model:'rounded-volume'};return m;}
 return {...hd,material:tileMaterial,spriteMaterial,stats,sprite,tileMesh,warmMeshes:()=>[...cache.entries()].map(([key,g])=>new T.Mesh(g,g.attributes.color?creatureMaterial:key[0]==='s'?spriteMaterial:tileMaterial))};
}
