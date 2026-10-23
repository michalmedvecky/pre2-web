// Recovered indexed art as closed 3D extrusions. The added depth is a VR interpretation.
import * as T from '../vendor/three.module.js';
const PIXEL=1/32;

export function makeNativeArt(assets,{levelIndex=0}={}){
 const game=assets.game,level=game.levels[levelIndex],palette=game.palettes[levelIndex].rgb8_scaled;
 const colors=Array.from({length:16},(_,i)=>new T.Color(palette[i*3]/255,palette[i*3+1]/255,palette[i*3+2]/255).convertSRGBToLinear());
 const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.94,flatShading:true});
 material.name='native-indexed-extrusion';
 const geometries=new Map();let atlas=null;
 function tilePixels(id){
  const value=level.lookup[id],empty=new Uint8Array(256);
  if(value===undefined||value===256||value===65535)return empty;
  const bank=value<256?assets.tiles[level.id]:assets.union,index=value<256?value:value-256;
  if(!bank||index<0||index*256+256>bank.length)return empty;
  return bank.subarray(index*256,index*256+256);
 }
 function geometry(key,pixels,width,height,originX,originY,depth,ink){
  if(!Number.isFinite(depth)||depth<=0)throw new RangeError('Extrusion depth must be positive and finite');
  key+=':'+depth+':'+(ink??'palette');if(geometries.has(key))return geometries.get(key);
  const positions=[],normals=[],vertexColors=[],indices=[];
  function quad(points,normal,index){
   const start=positions.length/3,color=colors[index&15];
   for(const p of points){positions.push(...p);normals.push(...normal);vertexColors.push(color.r,color.g,color.b);}
   indices.push(start,start+1,start+2,start,start+2,start+3);
  }
  const at=(x,y)=>x>=0&&x<width&&y>=0&&y<height?pixels[y*width+x]||0:0;
  const front=depth/2,back=-front;
  // Merge equal-colour horizontal runs on the two large faces, preserving every source pixel.
  for(let y=0;y<height;y++)for(let x=0;x<width;){const p=at(x,y);if(!p){x++;continue;}let end=x+1;while(end<width&&at(end,y)===p)end++;const l=(x-originX)*PIXEL,r=(end-originX)*PIXEL,t=(height-originY-y)*PIXEL,b=t-PIXEL,index=ink??p;quad([[l,b,front],[r,b,front],[r,t,front],[l,t,front]],[0,0,1],index);quad([[r,b,back],[l,b,back],[l,t,back],[r,t,back]],[0,0,-1],index);x=end;}
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const p=at(x,y);if(!p)continue;
   const index=ink??p,l=(x-originX)*PIXEL,r=l+PIXEL,t=(height-originY-y)*PIXEL,b=t-PIXEL;
   // Only front/back and outer silhouette edges: neighbouring solid pixels share no internal walls.
   if(!at(x-1,y))quad([[l,b,back],[l,b,front],[l,t,front],[l,t,back]],[-1,0,0],index);
   if(!at(x+1,y))quad([[r,b,front],[r,b,back],[r,t,back],[r,t,front]],[1,0,0],index);
   if(!at(x,y-1))quad([[l,t,front],[r,t,front],[r,t,back],[l,t,back]],[0,1,0],index);
   if(!at(x,y+1))quad([[l,b,back],[r,b,back],[r,b,front],[l,b,front]],[0,-1,0],index);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('color',new T.Float32BufferAttribute(vertexColors,3));g.setIndex(indices);g.computeBoundingBox();g.computeBoundingSphere();geometries.set(key,g);return g;
 }
 function sprite(word,{depth=.12}={}){
  if(word==null||word<0||word===65535)return new T.Group();
  const id=word&0x1fff,s=game.sprites[id];if(!s)return new T.Group();
  const pixels=assets.spritesPixels.subarray(s.pixelOffset,s.pixelOffset+s.width*s.height);
  const g=geometry('sprite:'+id,pixels,s.width,s.height,s.originX,s.originY,depth,word&0x4000?15:undefined);
  const mesh=new T.Mesh(g,material);mesh.name='native-sprite:'+id;mesh.userData={sourceSprite:id,width:s.width*PIXEL,height:s.height*PIXEL,originX:s.originX*PIXEL,originY:s.originY*PIXEL};
  if(word&0x8000)mesh.scale.x=-1;return mesh;
 }
 function tileMesh(id,{depth=.12}={}){
  const g=geometry('tile:'+id,tilePixels(id),16,16,8,0,depth);
  const mesh=new T.Mesh(g,material);mesh.name='native-tile:'+id;mesh.userData={sourceTile:id,width:.5,height:.5};return mesh;
 }
 function tileUV(id){
  const col=id&15,row=(id>>>4)&15;
  // Standard bottom-left / top-right UV rectangle. Source bytes use top-left origin.
  return {u0:col/16,v0:1-(row+1)/16,u1:(col+1)/16,v1:1-row/16};
 }
 function tileAtlas(){
  if(atlas)return atlas;
  const rgba=new Uint8Array(256*256*4);
  for(let id=0;id<256;id++){
   const pixels=tilePixels(id),col=id&15,row=id>>>4;
   for(let y=0;y<16;y++)for(let x=0;x<16;x++){
    const index=pixels[y*16+x],offset=((255-(row*16+y))*256+col*16+x)*4;
    rgba[offset]=palette[index*3]||0;rgba[offset+1]=palette[index*3+1]||0;rgba[offset+2]=palette[index*3+2]||0;rgba[offset+3]=index?255:0;
   }
  }
  atlas=new T.DataTexture(rgba,256,256,T.RGBAFormat,T.UnsignedByteType);atlas.name='native-level-one-atlas';atlas.colorSpace=T.SRGBColorSpace;atlas.magFilter=T.NearestFilter;atlas.minFilter=T.NearestFilter;atlas.generateMipmaps=false;atlas.flipY=false;atlas.needsUpdate=true;
  return atlas;
 }
 function dispose(){for(const g of geometries.values())g.dispose();geometries.clear();atlas?.dispose();atlas=null;material.dispose();}
 return {sprite,tileMesh,tileAtlas,tileUV,uvRect:tileUV,material,dispose};
}
