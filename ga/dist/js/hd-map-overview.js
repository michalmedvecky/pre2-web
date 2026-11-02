import {drawHDImage} from './hd-image.js';
import {paletteVariantMatches,mapRegionCoverage} from './hd-assets.js';
import {matchingMapStatePatches,patchCoversCell} from './hd-map-state.js';
import {nativeMapPaletteRecord} from './native-map-palette.js';

export function overviewPoint(rect,clientX,clientY,nativeWidth,nativeHeight){
  return {x:(clientX-rect.left)*nativeWidth/rect.width,y:(clientY-rect.top)*nativeHeight/rect.height};
}
export function overviewPaletteRecords(assets,state,map){
  const actors=[...(state.entities||[])];if(state.player&&!actors.includes(state.player))actors.push(state.player);
  const records=[assets.sprites.score.defaultPaletteRecord,assets.commonEnemyPaletteRecord];
  for(const actor of actors){const name=actor.sprite||actor.type;if(name==='heninger'||name==='longmoan')continue;const id=assets.sprites[name]?.defaultPaletteRecord;if(Number.isInteger(id))records.push(id);}
  return [...new Set(records),nativeMapPaletteRecord(state,map),...(state.paletteRecords||[])];
}
// Streams only map images into one 2x world canvas; never retains a world-sized4x
// bitmap or warms actors. isCurrent protects close/reopen/mode/stage transitions.
export async function renderMapOverview({renderer,assets,state,canvas,mode=renderer.graphicsMode,isCurrent=()=>true}={}){
  const map=state.mapOverride||assets.maps[String(state.stage).toLowerCase()],scale=mode==='hd'?2:1;
  if(!map)return {status:'missing-map'};
  const width=map.width*8,height=map.height*8,viewport=[0,0,width,height],id=renderer.canonicalMapId?.(map)||map.id;
  const result={status:'loading',mode,scale,nativeWidth:width,nativeHeight:height,canvas:[width*scale,height*scale],hdMapRegions:0,hdMapStatePatches:0,dynamicOriginalCells:0,hdStateCells:0,hdBaseNativeArea:0,originalBaseNativeArea:width*height};
  const cancelled=()=>({...result,status:'cancelled'});if(!isCurrent())return cancelled();
  canvas.width=width*scale;canvas.height=height*scale;const ctx=canvas.getContext('2d');ctx.setTransform(scale,0,0,scale,0,0);ctx.imageSmoothingEnabled=false;
  const palette=renderer.palette(overviewPaletteRecords(assets,state,map),state.livePalette),native=renderer.mapImage(map,palette,state.mapTileOverrides,state.mapRevision);
  ctx.drawImage(native,0,0);if(mode!=='hd'||!assets.hd)return {...result,status:'ready'};
  const hd=assets.hd,drawn=[],overrides=state.mapTileOverrides||[];
  // mapRegions selects the exact published palette context and initiates bounded
  // shared loads. Draw each entry immediately after its load, before LRU eviction.
  hd.mapRegions(id,palette,viewport);
  const entries=hd.entries.maps.filter(e=>e.mapId===id&&paletteVariantMatches(hd.manifest.paletteVariants[e.paletteVariant],palette));
  for(const entry of entries){
    await hd.ensureAtlas(entry.atlas);if(!isCurrent())return cancelled();
    const found=hd.mapRegions(id,palette,entry.nativeRect).find(f=>f.entry===entry);if(!found)continue;
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';drawHDImage(ctx,found.image,...entry.rectPixels,...entry.nativeRect);drawn.push(entry.nativeRect);result.hdMapRegions++;
  }
  if(!isCurrent())return cancelled();
  Object.assign(result,mapRegionCoverage(drawn,viewport));
  const base=assets.maps[id],changed=new Map(overrides.map(e=>[e.index,e.value]));
  if(base&&base.cells!==map.cells)for(let i=0;i<map.cells.length;i++)if((base.cells[i]&0x7fe)!==(map.cells[i]&0x7fe))changed.set(i,map.cells[i]);
  const changedCells=[];
  for(const[index,value]of changed){
    if(index<0||index>=map.cells.length||base&&(base.cells[index]&0x7fe)===(value&0x7fe))continue;
    const x=index%map.width*8,y=Math.floor(index/map.width)*8;if(!drawn.some(([rx,ry,rw,rh])=>x<rx+rw&&x+8>rx&&y<ry+rh&&y+8>ry))continue;
    ctx.imageSmoothingEnabled=false;ctx.drawImage(native,x,y,8,8,x,y,8,8);changedCells.push([x,y]);
  }
  const patchEntries=matchingMapStatePatches(hd.entries.mapStatePatches.filter(e=>paletteVariantMatches(hd.manifest.paletteVariants[e.paletteVariant],palette)),id,palette,map,overrides,viewport),patches=[];
  for(const entry of patchEntries){
    await hd.ensureAtlas(entry.atlas);if(!isCurrent())return cancelled();
    const found=hd.statePatches(id,palette,map,overrides,viewport).find(f=>f.entry===entry);if(!found)continue;
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.fillStyle='#000';ctx.fillRect(...entry.nativeRect);drawHDImage(ctx,found.image,...entry.rectPixels,...entry.nativeRect);patches.push(entry);result.hdMapStatePatches++;
  }
  result.hdStateCells=changedCells.filter(([x,y])=>patches.some(p=>patchCoversCell(p,x,y))).length;
  result.dynamicOriginalCells=changedCells.length-result.hdStateCells;
  return {...result,status:'ready'};
}
