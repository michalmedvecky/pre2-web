import{connectedTerrain,paintSampler}from'./terrain.js';
import{worldMaterial,cavityIndex,worldPaintSampler,openMaterialCavities,preserveMaterialVoids}from'./world-paint.js';
// Native shapes own geometry; large surfaces and bosses use continuous paint.
export class PaintedTerrain{
 constructor(){this.cache=new Map();}
 draw(hd,a,l,map,cx,cy,animation){
  const size=64,halo=16,extent=96,cols=6,bankOf=v=>v<256?a.tiles[l.id]:a.union,value=(x,y)=>x<0||x>=4096||y<0||y>=l.height*16?256:l.lookup[animation.remap[map[(y>>4)*256+(x>>4)]]],config=hd.pack.manifest.worldPaint,materials={};
  if(config&&['5','6','9','A','F'].includes(l.id))for(const[k,rec]of Object.entries(config.materials))if(l.id==='5'?k==='autumn-wood':l.id==='6'?k==='wood':k!=='wood'&&k!=='autumn-wood')materials[k]=hd.materialImage(rec);
  const tree=config?.objects?.tree,object=tree?.level===l.id?{...hd.materialImage(tree),x:tree.x,y:tree.y}:null,keys=new Set();
  hd.connectedLayer(cx,cy,(c,b)=>{for(let gy=b.y0;gy<=b.y1;gy++)for(let gx=b.x0;gx<=b.x1;gx++){
   const ox=gx*size,oy=gy*size,values=[];for(let y=0;y<cols;y++)for(let x=0;x<cols;x++)values.push(value(ox-halo+x*16,oy-halo+y*16));
   const key=l.id+':'+gx+':'+gy+':'+animation.phase,signature=values.join(',');keys.add(key);let chunk=this.cache.get(key);
   if(!chunk||chunk.signature!==signature){const source=new Uint8Array(extent*extent),kinds=[],textures=values.map(v=>{const valid=v!==256&&v!==65535&&v!==undefined,off=(v<256?v:v-256)*256; kinds.push(config&&valid?worldMaterial(l.id,bankOf(v).subarray(off,off+256),v):null);if(!valid)return null;const record=hd.pack.manifest.tiles?.[l.id+':'+(v<256?'local:':'union:')+(v<256?v:v-256)];return record?.atlas.startsWith('v16-')?hd.terrainTexture(record):null;});
    if(l.id==='5')for(let i=0;i<kinds.length;i++)if(kinds[i]==='autumn-wood'&&values[i]<256&&![i-1,i+1].some(n=>values[n]>=795&&values[n]<=800))kinds[i]=null;
    for(let y=0;y<extent;y++)for(let x=0;x<extent;x++){const wx=ox+x-halo,wy=oy+y-halo,v=values[(y>>4)*cols+(x>>4)];if(config?.completeFinalBoss&&l.id==='A'&&wx>=192&&wx<288&&wy>=0&&wy<176)continue;if(v!==256&&v!==65535&&v!==undefined){const index=bankOf(v)?.[(v<256?v:v-256)*256+(wy&15)*16+(wx&15)]||0;source[y*extent+x]=config?.transparentCavities.includes(l.id)?cavityIndex(l.id,index):index;}}
    const masked=config&&['9','A','F'].includes(l.id)?openMaterialCavities(source,extent):source,base=paintSampler(textures,cols),paint=config?worldPaintSampler({base,source,width:extent,columns:cols,kinds,originX:ox-halo,originY:oy-halo,materials,object,textures}):base,finalPaint=masked===source?paint:preserveMaterialVoids(paint,source,masked,extent),rgba=connectedTerrain(source,extent,extent,hd.palette,finalPaint,{paintColor:true}),image=document.createElement('canvas');image.width=image.height=256;image.getContext('2d').putImageData(new ImageData(rgba,384,384),-64,-64);chunk={signature,image};this.cache.set(key,chunk);
   }c.drawImage(chunk.image,ox*4,oy*4);
  }});for(const key of this.cache.keys())if(this.cache.size>96&&!keys.has(key))this.cache.delete(key);return true;
 }
}
