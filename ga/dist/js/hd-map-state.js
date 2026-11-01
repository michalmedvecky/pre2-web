// Exact source tile words select presentation art; map revision is never a state key.
export function matchingMapStatePatches(entries,mapId,palette,map,overrides=[],viewport=null){
 const changed=new Map(overrides.map(e=>[e.index,e.value&0xffff])),regions=new Set(),matches=[];
 for(const e of entries){
  if(e.mapId!==mapId||e.opaque!==true||!Array.isArray(e.matchCells)||!Array.isArray(e.nativeRect))continue;
  const[x,y,w,h]=e.nativeRect;if([x,y,w,h].some(v=>!Number.isInteger(v)||v%8!==0)||w<8||h<8)continue;
  if(viewport){const[vx,vy,vw,vh]=viewport;if(x+w<=vx||y+h<=vy||x>=vx+vw||y>=vy+vh)continue;}
  if(!e.matchCells.length||e.matchCells.length!==w*h/64)continue;
  const seen=new Set();let valid=true;
  for(const pair of e.matchCells){if(!Array.isArray(pair)||pair.length!==2){valid=false;break;}const[index,value]=pair,cx=index%map.width*8,cy=Math.floor(index/map.width)*8;
   if(!Number.isInteger(index)||!Number.isInteger(value)||value<0||value>65535||seen.has(index)||cx<x||cy<y||cx>=x+w||cy>=y+h||(changed.has(index)?changed.get(index):map.cells[index])!==value){valid=false;break;}seen.add(index);
  }
  const key=e.nativeRect.join(',');if(valid&&!regions.has(key)){regions.add(key);matches.push(e);}
 }
 return matches;
}
export function patchCoversCell(entry,x,y){const[rx,ry,rw,rh]=entry.nativeRect;return x>=rx&&y>=ry&&x+8<=rx+rw&&y+8<=ry+rh;}
