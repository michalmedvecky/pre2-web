import{connectedTerrain,paintSampler}from'./terrain.js';
import{worldPaintSampler,cavityIndex,openMaterialCavities,preserveMaterialVoids}from'./world-paint.js';
// These four native tiles are the exposed spike strip, not bark shading.
export function terrainIndex(level,value,index){return level==='6'&&value>=169&&value<=172&&index===6?0:index;}
export function renderTerrainChunk(env,job){
 const{level,local,union,palette,textures:bankTextures,kinds:bankKinds,materials,object,config}=env,{values,ox,oy}=job,extent=96,cols=6,source=new Uint8Array(extent*extent),textures=values.map(v=>bankTextures[v]||null),kinds=values.map(v=>bankKinds[v]||null);
 if(level==='5')for(let i=0;i<kinds.length;i++)if(kinds[i]==='autumn-wood'&&values[i]<256&&![i-1,i+1].some(n=>values[n]>=795&&values[n]<=800))kinds[i]=null;
 for(let y=0;y<extent;y++)for(let x=0;x<extent;x++){const wx=ox+x-16,wy=oy+y-16,v=values[(y>>4)*cols+(x>>4)];if(config?.completeFinalBoss&&level==='A'&&wx>=192&&wx<288&&wy>=0&&wy<176)continue;if(v!==256&&v!==65535&&v!==undefined){let index=(v<256?local:union)[(v<256?v:v-256)*256+(wy&15)*16+(wx&15)]||0;index=terrainIndex(level,v,index);source[y*extent+x]=config?.transparentCavities.includes(level)?cavityIndex(level,index):index;}}
 if(!source.some(Boolean))return new Uint8ClampedArray(256*256*4);
 const masked=config&&['9','A','F'].includes(level)?openMaterialCavities(source,extent):source,base=paintSampler(textures,cols),paint=config?worldPaintSampler({base,source,width:extent,columns:cols,kinds,originX:ox-16,originY:oy-16,materials,object,textures}):base,finalPaint=masked===source?paint:preserveMaterialVoids(paint,source,masked,extent),rgba=connectedTerrain(source,extent,extent,palette,finalPaint,{paintColor:true}),out=new Uint8ClampedArray(256*256*4);
 for(let y=0;y<256;y++)out.set(rgba.subarray(((y+64)*384+64)*4,((y+64)*384+320)*4),y*256*4);return out;
}
