import{insideStatue,compositeStatues,caveCapIndex,STATUE_TILES}from'./terrain-objects.js';
import{materialFields}from'./terrain-materials.js';
import{stage5TerrainIndex}from'./stage5-surfaces.js';
import{stage6SpikeBackdrop,stage6ArenaComposite}from'./stage6-composite.js';
import{connectedTerrain,paintSampler}from'./terrain.js';
import{worldPaintSampler,cavityIndex,openMaterialCavities,preserveMaterialVoids}from'./world-paint.js';
// These four native tiles are the exposed spike strip, not bark shading.
export function terrainIndex(level,value,index){return level==='6'&&value>=169&&value<=172&&index===6?0:index;}
export function renderTerrainChunk(env,job){
 const{level,local,union,palette,textures:bankTextures,kinds:bankKinds,materials,object,config,floors,statue,caps}=env,{values,ox,oy,statues}=job,extent=96,cols=6,source=new Uint8Array(extent*extent),textures=values.map(v=>bankTextures[v]||null),kinds=values.map(v=>bankKinds[v]||null);

 for(let y=0;y<extent;y++)for(let x=0;x<extent;x++){const wx=ox+x-16,wy=oy+y-16,v=values[(y>>4)*cols+(x>>4)];if(config?.completeFinalBoss&&level==='A'&&wx>=192&&wx<288&&wy>=0&&wy<176)continue;if(v!==256&&v!==65535&&v!==undefined){let index=(v<256?local:union)[(v<256?v:v-256)*256+(wy&15)*16+(wx&15)]||0;index=terrainIndex(level,v,index);index=caveCapIndex(level,v,index,wx&15,wy&15,wx,wy,caps);if(statue&&level==='9'&&insideStatue(wx,wy,statues)&&STATUE_TILES.has(v)&&index!==0&&index!==4&&index!==6)index=6;if(level==='5')index=stage5TerrainIndex(v,index,wx&15,wy&15,values,(y>>4)*cols+(x>>4),cols);source[y*extent+x]=config?.transparentCavities.includes(level)?cavityIndex(level,index):index;}}
 if(!source.some(Boolean)&&!(level==='6'&&object&&ox+64>object.x&&ox<object.x+object.width/4&&oy+64>object.y&&oy<object.y+object.height/4))return new Uint8ClampedArray(256*256*4);
 const masked=config&&['9','A','F'].includes(level)?openMaterialCavities(source,extent):source,base=paintSampler(textures,cols),paint=config?worldPaintSampler({base,source,width:extent,columns:cols,kinds,originX:ox-16,originY:oy-16,materials,object:level==='6'?null:object,textures,semantic:materialFields(level,source,extent,values,cols,['2','3','4','5','E'].includes(level)?openMaterialCavities(source,extent):source,floors),palette}):base,finalPaint=masked===source?paint:preserveMaterialVoids(paint,source,masked,extent),rgba=connectedTerrain(source,extent,extent,palette,finalPaint,{paintColor:true}),out=new Uint8ClampedArray(256*256*4);
 for(let y=0;y<256;y++)out.set(rgba.subarray(((y+64)*384+64)*4,((y+64)*384+320)*4),y*256*4);if(level==='6'){stage6SpikeBackdrop(out,env,job);stage6ArenaComposite(out,object,ox,oy);}if(level==='9')compositeStatues(out,statue,statues,ox,oy);return out;
}
