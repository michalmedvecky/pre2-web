import{statueAnchors,STATUE_TILES}from'./terrain-objects.js';
import{EARLY_MATERIALS}from'./terrain-materials.js';
import{tileAnimation}from'./tile-animation.js';
import{worldMaterial}from'./world-paint.js';
import{renderTerrainChunk}from'./terrain-chunk.js';
export function chunkDescriptor(l,map,gx,gy,animation){
 const ox=gx*64,oy=gy*64,values=[];let animated=false;
 for(let y=0;y<6;y++)for(let x=0;x<6;x++){const wx=ox-16+x*16,wy=oy-16+y*16;if(wx<0||wx>=4096||wy<0||wy>=l.height*16){values.push(256);continue;}const m=map[(wy>>4)*256+(wx>>4)];animated||=!!animation.animated[m];values.push(l.lookup[animation.remap[m]]);}
 const statues=statueAnchors(l,map,ox,oy);return{ox,oy,values,statues,key:l.id+':'+gx+':'+gy+':'+(animated?animation.phase:0),signature:values.join(',')+':'+statues.map(o=>o.x+','+o.y+':'+o.omit.join(',')).join(';')};
}
// Visible chunks are prepared before play. A worker stays two rows ahead of
// camera motion, so terrain reconstruction cannot stall the animation clock.
export class PaintedTerrain{
 constructor(){this.cache=new Map();this.pending=new Map();this.serial=0;this.syncBuilds=0;this.workerBuilds=0;}
 configure(hd,a,l){
  const identity=l.id+':'+hd.paletteKey;if(this.identity===identity)return;this.stop();this.identity=identity;this.cache.clear();
  const config=hd.pack.manifest.worldPaint,materials={},textures={},kinds={};
  if(config)for(const[k,rec]of Object.entries(config.materials))if(EARLY_MATERIALS[l.id]?EARLY_MATERIALS[l.id].includes(k):l.id==='6'?k==='wood':['9','A','F'].includes(l.id)&&['purple-stone','green-stone'].includes(k))materials[k]=hd.materialImage(rec);
  const tree=config?.objects?.arena?.level===l.id?config.objects.arena:Object.entries(config?.objects||{}).find(([name,o])=>name!=='statue9'&&o.level===l.id)?.[1],object=tree?{...hd.materialImage(tree),x:tree.x,y:tree.y,feather:tree.feather??8}:null;
  for(const v of new Set(l.lookup)){if(v===256||v===65535)continue;const off=(v<256?v:v-256)*256,bank=v<256?a.tiles[l.id]:a.union;kinds[v]=config?worldMaterial(l.id,bank.subarray(off,off+256),v):null;const rec=hd.pack.manifest.tiles?.[l.id+':'+(v<256?'local:':'union:')+(v<256?v:v-256)];if(rec?.atlas.startsWith('v16-'))textures[v]=hd.terrainTexture(rec);}
  // Independently generated cells are not coherent animation frames. For the
  // native animated vegetation in2/3 retain its exact connected moving ink;
  // world-coordinate stone/roots still provide the HD surface below it.
  if(['2','3'].includes(l.id)){const animation=tileAnimation(l,0);for(let id=0;id<256;id++)if(animation.animated[id])textures[l.lookup[id]]=null;}
  const floors={};for(let i=0;i<l.lookup.length;i++)floors[l.lookup[i]]=Math.max(floors[l.lookup[i]]||0,l.tilePropertiesY[i]||0);
  if(l.id==='4'){
   const stats=new Map(),get=v=>{if(!stats.has(v)){const bank=v<256?a.tiles[l.id]:a.union,off=(v<256?v:v-256)*256;let brown=0,green=0;for(const i of bank.subarray(off,off+256)){if(i>=1&&i<=3)brown++;if(i>=8&&i<=10)green++;}stats.set(v,{brown,green});}return stats.get(v);},roots=new Set(),map=a.maps?.[l.id];
   if(map)for(let p=0;p<map.length;p++){const v=l.lookup[map[p]],s=get(v);if(floors[v]<1||floors[v]>5||s.brown<=8||s.green<=8)continue;for(let row=1;row<=2&&p+row*256<map.length;row++){const next=l.lookup[map[p+row*256]],t=get(next);if(t.brown<=8||t.green<=4)break;roots.add(next);}}
   floors.visualRoots=[...roots];
  }
  if(['2','3'].includes(l.id))for(const v of new Set(l.lookup)){if(floors[v])continue;const offset=(v<256?v:v-256)*256,bank=v<256?a.tiles[l.id]:a.union;let brown=0;for(const i of bank.subarray(offset,offset+256))if(i>=1&&i<=3)brown++;if(brown)textures[v]=null;}
  if(l.id==='9')for(const v of STATUE_TILES){textures[v]=null;kinds[v]=null;}
  const statue=l.id==='9'&&config?.objects?.statue9?hd.materialImage(config.objects.statue9):null,caps=l.id==='2'?l.gates.filter(g=>g.active).map(g=>({x:(g.triggerTile&255)*16,y:(g.triggerTile>>8)*16-16})):[];
  this.environment={statue,caps,floors,level:l.id,local:a.tiles[l.id],union:a.union,palette:hd.palette,textures,kinds,materials,object,config};
  if(typeof Worker!=='undefined')try{this.worker=new Worker(new URL('./terrain-worker.js',import.meta.url),{type:'module'});this.worker.onmessage=({data})=>{const p=this.pending.get(data.id);if(!p)return;this.pending.delete(data.id);if(!data.error){this.workerBuilds++;this.store(p.job,data.rgba);}p.resolve(!data.error);};this.worker.onerror=()=>this.stop();this.worker.postMessage({environment:this.environment});}catch{this.stop();}
 }
 stop(){this.worker?.terminate();this.worker=null;for(const p of this.pending.values())p.resolve(false);this.pending.clear();}
 store(job,rgba){const image=document.createElement('canvas');image.width=image.height=256;image.getContext('2d').putImageData(new ImageData(rgba,256,256),0,0);this.cache.set(job.key,{signature:job.signature,image});while(this.cache.size>128)this.cache.delete(this.cache.keys().next().value);}
 request(job){const cached=this.cache.get(job.key);if(cached?.signature===job.signature){this.cache.delete(job.key);this.cache.set(job.key,cached);return Promise.resolve(true);}for(const p of this.pending.values())if(p.job.key===job.key&&p.job.signature===job.signature)return p.promise;if(!this.worker)return Promise.resolve(false);const id=++this.serial,p={job};p.promise=new Promise(resolve=>p.resolve=resolve);this.pending.set(id,p);this.worker.postMessage({id,job});return p.promise;}
 jobs(l,map,cx,cy,animation,padX=0,padY=0){const out=[];for(let y=Math.max(0,Math.floor((cy-1-padY)/64));y<=Math.min(Math.ceil(l.height/4)-1,Math.floor((cy+176+padY)/64));y++)for(let x=Math.max(0,Math.floor((cx-1-padX)/64));x<=Math.min(63,Math.floor((cx+320+padX)/64));x++)out.push(chunkDescriptor(l,map,x,y,animation));return out;}
 async prepare(hd,a,l,map,cx,cy,animation){this.configure(hd,a,l);if(!this.worker)return;const worker=this.worker,visible=[0,1,2].flatMap(phase=>this.jobs(l,map,cx,cy,tileAnimation(l,phase)));await Promise.all(visible.map(j=>this.request(j)));if(this.worker!==worker)return;await Promise.all(this.jobs(l,map,cx,cy,animation,64,128).map(j=>this.request(j)));}
 draw(hd,a,l,map,cx,cy,animation){
  this.configure(hd,a,l);
  hd.connectedLayer(cx,cy,(c,b)=>{for(let gy=b.y0;gy<=b.y1;gy++)for(let gx=b.x0;gx<=b.x1;gx++){const job=chunkDescriptor(l,map,gx,gy,animation);let chunk=this.cache.get(job.key);if(!chunk||chunk.signature!==job.signature){this.syncBuilds++;this.store(job,renderTerrainChunk(this.environment,job));chunk=this.cache.get(job.key);}c.drawImage(chunk.image,job.ox*4,job.oy*4);}});
  if(this.worker){for(const phase of [0,1,2])for(const job of this.jobs(l,map,cx,cy,tileAnimation(l,phase)))this.request(job);for(const job of this.jobs(l,map,cx,cy,animation,64,128))this.request(job);}
  return true;
 }
}
